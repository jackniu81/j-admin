import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';
import { Pool } from 'pg';
import {
  Collection,
  DataStore,
  NewEntity,
  PageResult,
  Query,
  SORTABLE_COLUMNS,
} from './data-store.interface';
import { SqlExecutor, TransactionRunner, runMigrations } from './migration';
import { MIGRATIONS } from './migrations';
import { buildSeed } from './seed';
import { BizException } from '../common/biz.exception';
import { PG_UNIQUE_VIOLATION, UNIQUE_CONFLICT } from './unique-rule';

export interface PostgresStoreOptions {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

/** camelCase <-> snake_case：实体字段与数据库列一一对应 */
const snake = (s: string) => s.replace(/([A-Z])/g, '_$1').toLowerCase();
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

// 集合名 -> 关键字段的模糊匹配列
const KEYWORD_COLUMNS: Record<Collection, string[]> = {
  users: ['username', 'display_name'],
  customers: ['name', 'email'],
  products: ['name', 'category'],
  orders: ['order_no', 'customer_name'],
};

function dbToEntity(row: Record<string, any>): any {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === '__total') continue;
    out[camel(k)] = v === null ? undefined : v;
  }
  return out as any;
}

/**
 * PostgreSQL 实现：pg 连接池，两张表 users / customers。
 * 表结构由 migrations/ 下的版本化 SQL 建立（不再靠 CREATE TABLE IF NOT EXISTS 硬编码）。
 * 分页排序走 SQL LIMIT/OFFSET + 参数化 ORDER BY（列名经白名单映射，防注入）。
 * 与 FileStore 的读写表现一致（spec §8 P0 验收）；唯一约束目前仅本实现下推到库级，
 * file 模式的服务层校验随 #3 一并落地。
 */
export class PostgresStore implements DataStore, TransactionRunner {
  private readonly logger = new Logger(PostgresStore.name);
  private pool: Pool;

  constructor(private readonly opts: PostgresStoreOptions) {
    this.pool = new Pool({
      host: opts.host,
      port: opts.port,
      user: opts.user,
      password: opts.password,
      database: opts.database,
    });
  }

  async init(): Promise<void> {
    const applied = await runMigrations(this, MIGRATIONS);
    this.logger.log(
      applied.length ? `已应用迁移: ${applied.join(' -> ')}` : '迁移已是最新，本次无变更',
    );

    // 表为空则首次 seed
    const { rows } = await this.pool.query('SELECT count(*)::int AS n FROM customers');
    if (rows[0].n === 0) {
      await this.seedRows();
    }
  }

  /**
   * 取一条独占连接跑单个事务（迁移用）：
   * BEGIN/COMMIT 必须落在同一连接上，不能用 pool.query。
   */
  async withTransaction<T>(fn: (ex: SqlExecutor) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** 强制重置 */
  async reseed(): Promise<void> {
    await this.pool.query('TRUNCATE users, customers');
    await this.seedRows();
  }

  private async seedRows(): Promise<void> {
    const seed = buildSeed();
    for (const c of ['users', 'customers', 'products', 'orders'] as Collection[]) {
      for (const entity of (seed as any)[c]) {
        await this.insert(c, entity);
      }
    }
  }

  private buildWhere(
    c: Collection,
    q: Query<any>,
    startIdx: number,
  ): { sql: string; params: any[]; next: number } {
    const clauses: string[] = [];
    const params: any[] = [];
    let i = startIdx;

    if (!q.includeDeleted) {
      clauses.push('deleted = false');
    }
    if (q.keyword) {
      const cols = KEYWORD_COLUMNS[c];
      const ors = cols.map((col) => `${col} ILIKE $${i}`).join(' OR ');
      params.push(`%${q.keyword}%`);
      clauses.push(`(${ors})`);
      i++;
    }
    if (q.status) {
      clauses.push(`status = $${i}`);
      params.push(q.status);
      i++;
    }
    if (q.from) {
      clauses.push(`created_at >= $${i}`);
      params.push(q.from);
      i++;
    }
    if (q.to) {
      clauses.push(`created_at <= $${i}`);
      params.push(q.to);
      i++;
    }

    return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params, next: i };
  }

  async find<T extends Collection>(
    c: T,
    q: Query<any> = {},
  ): Promise<PageResult<any>> {
    const { sql: whereSql, params, next } = this.buildWhere(c, q, 1);

    const sortCol =
      q.sortBy && SORTABLE_COLUMNS[c].includes(q.sortBy) ? snake(q.sortBy) : 'created_at';
    const order = q.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 10));
    const offset = (page - 1) * pageSize;

    const res = await this.pool.query(
      `SELECT *, COUNT(*) OVER()::int AS __total FROM ${c} ${whereSql}
       ORDER BY ${sortCol} ${order} LIMIT $${next} OFFSET $${next + 1}`,
      [...params, pageSize, offset],
    );

    const total = res.rows[0]?.__total ?? 0;
    return { list: res.rows.map((r) => dbToEntity(r)), total };
  }

  async findOne<T extends Collection>(c: T, id: string): Promise<any | null> {
    const res = await this.pool.query(`SELECT * FROM ${c} WHERE id = $1`, [id]);
    return res.rows[0] ? dbToEntity(res.rows[0]) : null;
  }

  async findBy<T extends Collection>(c: T, where: Partial<any>): Promise<any | null> {
    const cols = Object.keys(where).map(snake);
    const clauses = cols.map((col, i) => `${col} = $${i + 1}`).join(' AND ');
    const params = cols.map((_, i) => Object.values(where)[i]);
    const res = await this.pool.query(
      `SELECT * FROM ${c} WHERE deleted = false AND ${clauses} LIMIT 1`,
      params,
    );
    return res.rows[0] ? dbToEntity(res.rows[0]) : null;
  }

  /** 部分唯一索引冲突（23505）转成业务码 40900，其余异常原样向上抛 */
  private mapError(c: Collection, err: unknown): unknown {
    const conflict = UNIQUE_CONFLICT[c];
    if ((err as { code?: string })?.code === PG_UNIQUE_VIOLATION && conflict) {
      return new BizException(40900, conflict.message);
    }
    return err;
  }

  async insert<T extends Collection>(c: T, data: NewEntity<T>): Promise<any> {
    const ts = new Date().toISOString();
    const full: Record<string, any> = {
      ...data,
      id: (data as any).id ?? randomUUID(),
      createdAt: (data as any).createdAt ?? ts,
      updatedAt: (data as any).updatedAt ?? ts,
      deleted: (data as any).deleted ?? false,
    };
    const keys = Object.keys(full);
    const cols = keys.map(snake);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const params = keys.map((k) => (full[k] === undefined ? null : full[k]));

    try {
      const res = await this.pool.query(
        `INSERT INTO ${c} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        params,
      );
      return dbToEntity(res.rows[0]);
    } catch (err) {
      throw this.mapError(c, err);
    }
  }

  async update<T extends Collection>(c: T, id: string, patch: Partial<any>): Promise<any> {
    const data = { ...patch, updatedAt: new Date().toISOString() };
    const keys = Object.keys(data);
    const setSql = keys.map((k, i) => `${snake(k)} = $${i + 1}`).join(', ');
    const params = keys.map((k) => ((data as any)[k] === undefined ? null : (data as any)[k]));

    try {
      const res = await this.pool.query(
        `UPDATE ${c} SET ${setSql} WHERE id = $${keys.length + 1} RETURNING *`,
        [...params, id],
      );
      if (!res.rows[0]) {
        throw new Error(`${c} 中不存在 id=${id} 的记录`);
      }
      return dbToEntity(res.rows[0]);
    } catch (err) {
      throw this.mapError(c, err);
    }
  }

  async softDelete<T extends Collection>(c: T, id: string): Promise<any> {
    return this.update(c, id, { deleted: true });
  }

  async count<T extends Collection>(c: T, where?: Partial<any>): Promise<number> {
    const clauses: string[] = ['deleted = false'];
    const params: any[] = [];
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        clauses.push(`${snake(k)} = $${params.length + 1}`);
        params.push(v);
      }
    }
    const res = await this.pool.query(
      `SELECT count(*)::int AS n FROM ${c} WHERE ${clauses.join(' AND ')}`,
      params,
    );
    return res.rows[0].n;
  }
}
