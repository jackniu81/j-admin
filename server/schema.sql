-- 由 server/src/data/migrations 生成，请勿手工编辑: npm run db:sql -w server
-- 与 PostgresStore.init() 应用迁移完全等价；已应用过的迁移重复执行会因版本号主键冲突而中断，
-- 因此整脚本只适合在空库上跑一次，日常升级仍走 init() 自动迁移。
--
-- 前置：先建库再跑本脚本（本脚本只建表，不建库）：
--   CREATE DATABASE j_admin;
--   psql -d j_admin -f server/schema.sql

CREATE TABLE IF NOT EXISTS schema_migrations (
    version    text PRIMARY KEY,
    name       text NOT NULL,
    applied_at text NOT NULL
  );

-- ==== 0001 init_schema ====
BEGIN;
CREATE TABLE IF NOT EXISTS users (
      id            text PRIMARY KEY,
      created_at    text NOT NULL,
      updated_at    text NOT NULL,
      deleted       boolean NOT NULL DEFAULT false,
      username      text NOT NULL,
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
      email      text NOT NULL,
      phone      text,
      status     text NOT NULL,
      remark     text
    );
INSERT INTO schema_migrations (version, name, applied_at) VALUES ('0001', 'init_schema', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
COMMIT;

-- ==== 0002 unique_and_query_indexes ====
BEGIN;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username ON users (username) WHERE deleted = false;
CREATE UNIQUE INDEX IF NOT EXISTS ux_customers_email ON customers (email) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS ix_users_status_created ON users (deleted, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_customers_status_created ON customers (deleted, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_users_created ON users (deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_customers_created ON customers (deleted, created_at DESC);
INSERT INTO schema_migrations (version, name, applied_at) VALUES ('0002', 'unique_and_query_indexes', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
COMMIT;
