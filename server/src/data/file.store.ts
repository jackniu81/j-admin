import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import { dirname, isAbsolute, resolve } from 'path';
import {
  Collection,
  CollectionEntityMap,
  DataStore,
  KEYWORD_FIELDS,
  NewEntity,
  PageResult,
  Query,
  SORTABLE_COLUMNS,
} from './data-store.interface';
import { buildSeed, SeedData } from './seed';

export interface FileStoreOptions {
  filePath: string; // 相对路径基于 server 目录（cwd）
}

const now = () => new Date().toISOString();

/**
 * 文件数据库实现：整份 db.json 常驻内存，写操作同步落盘。
 * 先写 .tmp 再 rename，避免进程崩溃导致半写损坏（spec §3.2）。
 */
export class FileStore implements DataStore {
  private data: SeedData = { users: [], customers: [], products: [], orders: [] };
  private readonly absPath: string;

  constructor(private readonly opts: FileStoreOptions) {
    this.absPath = isAbsolute(opts.filePath)
      ? opts.filePath
      : resolve(process.cwd(), opts.filePath);
  }

  async init(): Promise<void> {
    if (existsSync(this.absPath)) {
      const raw = await readFile(this.absPath, 'utf-8');
      this.data = JSON.parse(raw) as SeedData;
      // 缺集合兜底：旧 db.json 无 orders/products 时补空数组，避免 bucket() 崩
      this.data.users ??= [];
      this.data.customers ??= [];
      this.data.products ??= [];
      this.data.orders ??= [];
      return;
    }
    // 文件不存在 -> 写入 seed
    this.data = buildSeed();
    await this.persist();
  }

  /** 强制重置为种子数据 */
  async reseed(): Promise<void> {
    this.data = buildSeed();
    await this.persist();
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.absPath), { recursive: true });
    const tmp = `${this.absPath}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(this.data, null, 2), 'utf-8');
    await rename(tmp, this.absPath);
  }

  private bucket<T extends Collection>(c: T): CollectionEntityMap[T][] {
    return this.data[c] as CollectionEntityMap[T][];
  }

  async find<T extends Collection>(
    c: T,
    q: Query<CollectionEntityMap[T]> = {},
  ): Promise<PageResult<CollectionEntityMap[T]>> {
    let rows = this.bucket(c).slice();

    if (!q.includeDeleted) {
      rows = rows.filter((r) => !r.deleted);
    }

    if (q.keyword) {
      const kw = q.keyword.toLowerCase();
      const fields = KEYWORD_FIELDS[c];
      rows = rows.filter((r) =>
        fields.some((f) => String((r as any)[f] ?? '').toLowerCase().includes(kw)),
      );
    }

    if (q.status) {
      rows = rows.filter((r) => (r as any).status === q.status);
    }

    const sortBy = q.sortBy && SORTABLE_COLUMNS[c].includes(q.sortBy) ? q.sortBy : 'createdAt';
    const order = q.sortOrder === 'asc' ? 1 : -1;
    rows.sort((x, y) => {
      const xv = (x as any)[sortBy];
      const yv = (y as any)[sortBy];
      if (xv === yv) return 0;
      return (xv > yv ? 1 : -1) * order;
    });

    const total = rows.length;
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 10));
    const start = (page - 1) * pageSize;
    return { list: rows.slice(start, start + pageSize), total };
  }

  async findOne<T extends Collection>(c: T, id: string): Promise<CollectionEntityMap[T] | null> {
    return this.bucket(c).find((r) => r.id === id) ?? null;
  }

  async findBy<T extends Collection>(
    c: T,
    where: Partial<CollectionEntityMap[T]>,
  ): Promise<CollectionEntityMap[T] | null> {
    return (
      this.bucket(c).find(
        (r) =>
          !r.deleted &&
          Object.entries(where).every(([k, v]) => (r as any)[k] === v),
      ) ?? null
    );
  }

  async insert<T extends Collection>(c: T, data: NewEntity<T>): Promise<CollectionEntityMap[T]> {
    const ts = now();
    const row = {
      ...data,
      id: randomUUID(),
      createdAt: ts,
      updatedAt: ts,
      deleted: false,
    } as CollectionEntityMap[T];
    this.bucket(c).push(row);
    await this.persist();
    return row;
  }

  async update<T extends Collection>(
    c: T,
    id: string,
    patch: Partial<CollectionEntityMap[T]>,
  ): Promise<CollectionEntityMap[T]> {
    const rows = this.bucket(c);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error(`${c} 中不存在 id=${id} 的记录`);
    }
    const updated = { ...rows[idx], ...patch, updatedAt: now() } as CollectionEntityMap[T];
    rows[idx] = updated;
    await this.persist();
    return updated;
  }

  async softDelete<T extends Collection>(c: T, id: string): Promise<CollectionEntityMap[T]> {
    return this.update(c, id, { deleted: true } as Partial<CollectionEntityMap[T]>);
  }

  async count<T extends Collection>(
    c: T,
    where?: Partial<CollectionEntityMap[T]>,
  ): Promise<number> {
    return this.bucket(c).filter(
      (r) =>
        !r.deleted &&
        (!where || Object.entries(where).every(([k, v]) => (r as any)[k] === v)),
    ).length;
  }
}
