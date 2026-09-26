import { renderMigrationSql } from './migration';
import { MIGRATIONS } from './migrations';

/**
 * 迁移脚本 CLI。
 *
 * npm run db:sql -w server     打印等价 SQL 脚本到 stdout（本地无 PG 时给 DBA / psql 用）
 *                              落盘： node dist/data/migration-cli.js > ../docs/sql/postgres-schema.sql
 * npm run db:migrate -w server 真正应用到 PG（读 server/.env 的 PG_* 配置，跑完即退出）
 *
 * 说明：正常情况下无需手工执行——DB_DRIVER=postgres 时 PostgresStore.init() 会自动迁移，
 * 这里只是把同一套定义导出成可读脚本，避免 DDL 只存在于代码里无法评审。
 */
async function apply(): Promise<void> {
  // 必须在任何 dynamic import 之前设定：config.module 正在被加载时就会跑 validateEnv，
  // 晚一行就会拿到 DB_DRIVER=file 的 store，迁移不会应用到 PG
  process.env.DB_DRIVER = 'postgres';

  // 动态 import 避免打印模式也拉起 Nest 依赖
  const { NestFactory } = await import('@nestjs/core');
  const { AppConfigModule } = await import('../config/config.module');
  const { DataModule } = await import('./data.module');
  const { Module } = await import('@nestjs/common');

  @Module({ imports: [AppConfigModule, DataModule] })
  class MigrateModule {}

  // 工厂内 store.init() 即完成迁移；能进到这里说明 PG_* 校验已通过
  const app = await NestFactory.createApplicationContext(MigrateModule, {
    logger: ['error', 'warn', 'log'],
  });
  await app.close();
  console.log('✅ 迁移已应用（详见上方 PostgresStore 日志与 schema_migrations 表）');
}

function printSql(): void {
  process.stdout.write(renderMigrationSql(MIGRATIONS));
}

if (require.main === module) {
  const mode = process.argv[2];
  if (mode === '--apply') {
    apply().catch((err) => {
      console.error('迁移应用失败:', err);
      process.exit(1);
    });
  } else if (mode === undefined || mode === '--print') {
    printSql();
  } else {
    console.error(`未知参数: ${mode}（可用: --print | --apply）`);
    process.exit(1);
  }
}
