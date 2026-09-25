import { CollectionEntityMap, Collection } from './data-store.interface';

/**
 * 唯一约束落库规则（spec §3.2 / §6.2）。
 * 库级由各表的部分唯一索引保证（见 migrations/0002），应用级把 pg 的 23505 翻成 40900；
 * 文案集中在这里，后续 FileStore / 服务层复用同一份，保证双数据源一致。
 */
export const UNIQUE_CONFLICT: {
  [C in Collection]: { field: keyof CollectionEntityMap[C] & string; message: string };
} = {
  users: { field: 'username', message: '用户名已存在' },
  customers: { field: 'email', message: '邮箱已被使用' },
};

/** pg 唯一约束冲突错误码（SQLSTATE） */
export const PG_UNIQUE_VIOLATION = '23505';
