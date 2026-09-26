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

/** 商品分类枚举（与 Dashboard / 报表口径一致） */
export type ProductCategory =
  | '数码配件'
  | '家居用品'
  | '服装鞋帽'
  | '美妆个护'
  | '食品生鲜';

export interface ProductRow extends BaseRow {
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  image?: string; // 上传返回的相对 URL，如 /uploads/2026-09/xxx.png
  status: 'on' | 'off'; // 上架 / 下架
  remark?: string;
}

/** 订单状态：待付款 / 待发货 / 已完成 / 已取消 */
export type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled';

/** 订单明细项（items 以 JSON 字符串单列存储，保证 file/pg 同构） */
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export interface OrderRow extends BaseRow {
  orderNo: string; // 唯一
  customerId: string;
  customerName: string; // 下单时的客户名快照
  amount: number;
  status: OrderStatus;
  items: string; // JSON.stringify(OrderItem[])
  remark?: string;
}

/** 集合名 -> 实体类型 */
export interface CollectionEntityMap {
  users: UserRow;
  customers: CustomerRow;
  products: ProductRow;
  orders: OrderRow;
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
  from?: string; // createdAt >= 的 ISO 下界（含），供列表按时间区间筛选
  to?: string; // createdAt <= 的 ISO 上界（含）
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
  products: ['name', 'price', 'stock', 'createdAt'],
  orders: ['orderNo', 'amount', 'createdAt'],
};

/** 每个集合参与关键字模糊匹配的字段（camelCase，FileStore 用；PG 侧另见 KEYWORD_COLUMNS） */
export const KEYWORD_FIELDS: Record<Collection, readonly string[]> = {
  users: ['username', 'displayName'],
  customers: ['name', 'email'],
  products: ['name', 'category'],
  orders: ['orderNo', 'customerName'],
};
