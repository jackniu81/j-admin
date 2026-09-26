import { Migration } from '../migration';

/**
 * 0003 orders / products 建表建索引（issue #31，M4 前置）。
 *
 * - 列定义与 data-store.interface.ts 的 ProductRow / OrderRow 一一对应（camelCase -> snake_case）
 * - 时间列仍用 text 存 ISO 8601；price / stock / amount 用 double precision，与 FileStore 的 number 对齐
 * - orders.items 用 text 存 JSON.stringify(OrderItem[])，保证 file / pg 同构
 * - 唯一性走部分唯一索引（WHERE deleted = false），软删除后同订单号可重建；products 无库级唯一约束
 */
export const ordersProducts: Migration = {
  version: '0003',
  name: 'orders_products',
  up: [
    `CREATE TABLE IF NOT EXISTS products (
      id         text PRIMARY KEY,
      created_at text NOT NULL,
      updated_at text NOT NULL,
      deleted    boolean NOT NULL DEFAULT false,
      name       text NOT NULL,
      category   text NOT NULL,
      price      double precision NOT NULL,
      stock      double precision NOT NULL,
      image      text,
      status     text NOT NULL,
      remark     text
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id            text PRIMARY KEY,
      created_at    text NOT NULL,
      updated_at    text NOT NULL,
      deleted       boolean NOT NULL DEFAULT false,
      order_no      text NOT NULL,
      customer_id   text NOT NULL,
      customer_name text NOT NULL,
      amount        double precision NOT NULL,
      status        text NOT NULL,
      items         text NOT NULL,
      remark        text
    )`,

    // 唯一约束：只对未软删的行生效
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_order_no ON orders (order_no) WHERE deleted = false`,

    // 查询索引：列表主路径固定带 deleted = false [+ status] 并按 created_at DESC 排序分页
    `CREATE INDEX IF NOT EXISTS ix_products_status_created ON products (deleted, status, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS ix_products_created ON products (deleted, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS ix_orders_status_created ON orders (deleted, status, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS ix_orders_created ON orders (deleted, created_at DESC)`,
  ],
};
