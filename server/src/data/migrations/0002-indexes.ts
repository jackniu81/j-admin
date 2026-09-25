import { Migration } from '../migration';

/**
 * 0002 索引与唯一约束（issue #12）。
 *
 * - 部分唯一索引：只对 deleted = false 的行生效，软删除后同名可重建
 * - 查询索引：列表主路径固定带 `deleted = false` [+ `status`] 并按 created_at DESC 排序分页，
 *   故采用 (deleted, status, created_at DESC) / (deleted, created_at DESC) 复合索引；
 *   findOne 走主键，无需额外索引
 * - 旧库兼容：0001 之前的实现把唯一性写在列级 UNIQUE 上（PostgreSQL 自动约束名
 *   `<table>_<column>_key`），此处先 DROP 再建部分索引，已跑过 #1 的库可平滑升级
 */
export const indexes: Migration = {
  version: '0002',
  name: 'unique_and_query_indexes',
  up: [
    `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key`,
    `ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_email_key`,

    `CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username ON users (username) WHERE deleted = false`,
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_customers_email ON customers (email) WHERE deleted = false`,

    `CREATE INDEX IF NOT EXISTS ix_users_status_created ON users (deleted, status, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS ix_customers_status_created ON customers (deleted, status, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS ix_users_created ON users (deleted, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS ix_customers_created ON customers (deleted, created_at DESC)`,
  ],
};
