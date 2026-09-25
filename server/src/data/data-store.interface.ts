/**
 * DataStore 抽象层（spec §3.2）。
 * 不用 ORM，避免「关系模型」与「文件 JSON」两套模型互相妥协；
 * FileStore / PostgresStore 两个实现按 DB_DRIVER 用 DI token 注入其一。
 */

export interface BaseRow {
  id: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  deleted: boolean; // 软删除标记
}

export interface UserRow extends BaseRow {
  username: string;
  passwordHash: string;
  displayName: string;
  role: 'admin' | 'user';
  status: 'active' | 'disabled';
}

export interface CustomerRow extends BaseRow {
  name: string;
  email: string;
  phone?: string;
  status: 'enabled' | 'disabled';
  remark?: string;
}

/** 集合名 -> 实体类型 */
export interface CollectionEntityMap {
  users: UserRow;
  customers: CustomerRow;
}
export type Collection = keyof CollectionEntityMap;

/** 插入入参：去掉由 store 生成/管理的公共字段 */
export type NewEntity<T extends Collection> = Omit<
  CollectionEntityMap[T],
  'id' | 'createdAt' | 'updatedAt' | 'deleted'
>;

export interface Query<T> {
  keyword?: string; // 对 name / email(username) 模糊匹配
  status?: string; // 精确匹配
  sortBy?: keyof T & string; // 白名单校验，防注入
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
}

export interface PageResult<E> {
  list: E[];
  total: number;
}

export interface DataStore {
  init(): Promise<void>; // 建表 or 读文件 + 首次 seed
  reseed?(): Promise<void>; // 强制重置为种子数据（供 npm run seed）
  find<T extends Collection>(c: T, q?: Query<CollectionEntityMap[T]>): Promise<PageResult<CollectionEntityMap[T]>>;
  findOne<T extends Collection>(c: T, id: string): Promise<CollectionEntityMap[T] | null>;
  findBy<T extends Collection>(c: T, where: Partial<CollectionEntityMap[T]>): Promise<CollectionEntityMap[T] | null>;
  insert<T extends Collection>(c: T, data: NewEntity<T>): Promise<CollectionEntityMap[T]>;
  update<T extends Collection>(c: T, id: string, patch: Partial<CollectionEntityMap[T]>): Promise<CollectionEntityMap[T]>;
  softDelete<T extends Collection>(c: T, id: string): Promise<CollectionEntityMap[T]>;
  count<T extends Collection>(c: T, where?: Partial<CollectionEntityMap[T]>): Promise<number>;
}

/** 全局注入 token */
export const DATA_STORE = 'DATA_STORE';

/** 每个集合允许排序的列（白名单，防 SQL 注入） */
export const SORTABLE_COLUMNS: Record<Collection, readonly string[]> = {
  users: ['username', 'displayName', 'createdAt'],
  customers: ['name', 'email', 'createdAt'],
};
