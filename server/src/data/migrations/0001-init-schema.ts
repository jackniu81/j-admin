import { Migration } from '../migration';

/**
 * 0001 建表（spec §3.2 / §3.3）。
 *
 * 列定义与 data-store.interface.ts 的实体一一对应（camelCase -> snake_case）：
 * - 公共字段：id / created_at / updated_at / deleted
 * - 时间列用 text 存 ISO 8601，与 FileStore 的 JSON 表示完全一致，不做类型升级
 * - 唯一性**不放列级 UNIQUE**：软删除后行仍在表里，列级 UNIQUE 会让同名账号永远无法重建，
 *   统一交给 0002 的部分唯一索引（WHERE deleted = false）
 */
export const initSchema: Migration = {
  version: '0001',
  name: 'init_schema',
  up: [
    `CREATE TABLE IF NOT EXISTS users (
      id            text PRIMARY KEY,
      created_at    text NOT NULL,
      updated_at    text NOT NULL,
      deleted       boolean NOT NULL DEFAULT false,
      username      text NOT NULL,
      password_hash text NOT NULL,
      display_name  text NOT NULL,
      role          text NOT NULL,
      status        text NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS customers (
      id         text PRIMARY KEY,
      created_at text NOT NULL,
      updated_at text NOT NULL,
      deleted    boolean NOT NULL DEFAULT false,
      name       text NOT NULL,
      email      text NOT NULL,
      phone      text,
      status     text NOT NULL,
      remark     text
    )`,
  ],
};
