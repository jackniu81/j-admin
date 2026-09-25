import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppConfigModule } from '../config/config.module';
import { DATA_STORE, DataStore } from './data-store.interface';
import { DataModule } from './data.module';

/**
 * 强制重置种子数据：npm run seed -w server
 * 复用 Nest 上下文以自动加载 .env / 校验配置 / 按 DB_DRIVER 选择 store。
 * 先 init()（工厂内）建表读文件，再 reseed() 覆盖为最新种子数据。
 */
@Module({ imports: [AppConfigModule, DataModule] })
class SeedModule {}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['error', 'warn'] });
  const store = app.get<DataStore>(DATA_STORE);
  await store.reseed?.();
  await app.close();
  // eslint-disable-next-line no-console
  console.log('✅ 种子数据已重置（admin/admin, user2/user2, user3/user3 + 50 条客户）');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('种子数据重置失败:', err);
  process.exit(1);
});
