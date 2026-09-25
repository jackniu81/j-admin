import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import {
  Collection,
  DataStore,
  NewEntity,
  PageResult,
  Query,
  SORTABLE_COLUMNS,
} from './data-store.interface';
import { buildSeed } from './seed';

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
 * 分页排序走 SQL LIMIT/OFFSET + 参数化 ORDER BY（列名经白名单映射，防注入）。
 * 与 FileStore 表现完全一致（spec §8 P0 验收）。
 */
export class PostgresStore implements DataStore {
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
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            text PRIMARY KEY,
        created_at    text NOT NULL,
        updated_at    text NOT NULL,
        deleted       boolean NOT NULL DEFAULT false,
        username      text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        display_name  text NOT NULL,
        role          text NOT NULL,
        status        text NOT NULL
      );
      CREATE TABLE IF NOT EXISTS customers (
        id         text PRIMARY KEY,
        created_at text NOT NULL,
        updated_at text NOT NULL,
        deleted    boolean NOT NULL DEFAULT false,
        name       text NOT NULL,
        email      text NOT NULL UNIQUE,
        phone      text,
        status     text NOT NULL,
        remark     text
      );
    `);

    // 表为空则首次 seed
    const { rows } = await this.pool.query('SELECT count(*)::int AS n FROM customers');
    if (rows[0].n === 0) {
      await this.seedRows();
    }
  }

  /** 强制重置 */
  async reseed(): Promise<void> {
    await this.pool.query('TRUNCATE users, customers');
    await this.seedRows();
  }

  private async seedRows(): Promise<void> {
    const seed = buildSeed();
    for (const c of ['users', 'customers'] as Collection[]) {
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

    const res = await this.pool.query(
      `INSERT INTO ${c} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      params,
    );
    return dbToEntity(res.rows[0]);
  }

  async update<T extends Collection>(c: T, id: string, patch: Partial<any>): Promise<any> {
    const data = { ...patch, updatedAt: new Date().toISOString() };
    const keys = Object.keys(data);
    const setSql = keys.map((k, i) => `${snake(k)} = $${i + 1}`).join(', ');
    const params = keys.map((k) => ((data as any)[k] === undefined ? null : (data as any)[k]));

    const res = await this.pool.query(
      `UPDATE ${c} SET ${setSql} WHERE id = $${keys.length + 1} RETURNING *`,
      [...params, id],
    );
    if (!res.rows[0]) {
      throw new Error(`${c} 中不存在 id=${id} 的记录`);
    }
    return dbToEntity(res.rows[0]);
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
