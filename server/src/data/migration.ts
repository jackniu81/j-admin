/**
 * 轻量迁移机制（spec §3.2 issue #12）。
 *
 * 设计取舍：
 * - 不引入 ORM / 迁移 CLI，迁移就是仓库里的 SQL 字符串数组，与 FileStore 对等的心智负担
 * - forward-only：本项目规模下回滚靠备份恢复，不写 down
 * - 每个迁移在**独立连接的单个事务**内执行，失败整体回滚，不会留下半应用状态
 * - 所有 DDL 一律 IF NOT EXISTS / IF EXISTS，双保险可重入
 */

export interface Migration {
  /** 零填充递增版本号，决定应用顺序，如 '0001' */
  version: string;
  /** 人读描述，落库到 schema_migrations.name */
  name: string;
  /** 按序执行的 SQL，不接受外部入参拼接 */
  up: string[];
}

/** 事务内使用的执行器（pg.Client 结构兼容） */
export interface SqlExecutor {
  query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>;
}

/** 由 store 实现：取一条独占连接跑事务，保证 BEGIN/COMMIT 落在同一连接上 */
export interface TransactionRunner {
  withTransaction<T>(fn: (ex: SqlExecutor) => Promise<T>): Promise<T>;
}

export const MIGRATIONS_TABLE = 'schema_migrations';

export const DDL_CREATE_MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
    version    text PRIMARY KEY,
    name       text NOT NULL,
    applied_at text NOT NULL
  )
`;

/** 版本号字典序即时间序（零填充保证 0002 < 0010） */
const byVersion = (a: Migration, b: Migration) => a.version.localeCompare(b.version);

export function sortMigrations(migrations: Migration[]): Migration[] {
  const seen = new Set<string>();
  for (const m of migrations) {
    if (seen.has(m.version)) {
      throw new Error(`迁移版本号重复: ${m.version}`);
    }
    seen.add(m.version);
  }
  return [...migrations].sort(byVersion);
}

/**
 * 应用未执行的迁移。
 * @returns 本次实际应用的版本号列表（按序）：新库首轮返回 ['0001','0002']，之后返回空数组
 */
export async function runMigrations(
  runner: TransactionRunner,
  migrations: Migration[],
): Promise<string[]> {
  const ordered = sortMigrations(migrations);

  await runner.withTransaction((ex) => ex.query(DDL_CREATE_MIGRATIONS_TABLE));

  const { rows } = await runner.withTransaction((ex) =>
    ex.query(`SELECT version FROM ${MIGRATIONS_TABLE}`),
  );
  const applied = new Set(rows.map((r: any) => r.version as string));

  const done: string[] = [];
  for (const m of ordered) {
    if (applied.has(m.version)) continue;

    await runner.withTransaction(async (ex) => {
      for (const sql of m.up) {
        await ex.query(sql);
      }
      await ex.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (version, name, applied_at) VALUES ($1, $2, $3)`,
        [m.version, m.name, new Date().toISOString()],
      );
    });
    done.push(m.version);
  }
  return done;
}

/**
 * 把迁移渲染成可直接交给 psql / DBA 执行的等价 SQL 脚本（本地无 PG 时使用）。
 * 语义与 runMigrations 一致：每个迁移一个事务，DDL 与版本记录同事务提交。
 */
export function renderMigrationSql(migrations: Migration[]): string {
  const ordered = sortMigrations(migrations);
  const lines: string[] = [
    '-- 由 server/src/data/migrations 生成，请勿手工编辑: npm run db:sql -w server',
    '-- 与 PostgresStore.init() 应用迁移完全等价；已应用过的迁移重复执行会因版本号主键冲突而中断，',
    '-- 因此整脚本只适合在空库上跑一次，日常升级仍走 init() 自动迁移。',
    '',
    `${DDL_CREATE_MIGRATIONS_TABLE.trim()};`,
  ];

  for (const m of ordered) {
    lines.push('', `-- ==== ${m.version} ${m.name} ====`, 'BEGIN;');
    for (const sql of m.up) {
      lines.push(`${sql.trim()};`);
    }
    lines.push(
      `INSERT INTO ${MIGRATIONS_TABLE} (version, name, applied_at) VALUES (` +
        `'${m.version}', '${m.name}', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));`,
      'COMMIT;',
    );
  }
  return `${lines.join('\n')}\n`;
}
