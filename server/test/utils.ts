import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { DATA_STORE } from '../src/data/data-store.interface';
import { FileStore } from '../src/data/file.store';

export interface E2eContext {
  app: INestApplication;
  dbFile: string;
  cleanup: () => Promise<void>;
}

/**
 * 启动一份完整的 AppModule，但把 DATA_STORE 覆盖成指向临时文件的 FileStore，
 * 保证 e2e 读写不污染 server/data/db.json（.env 的 DB_FILE 优先级高于 process.env，
 * 靠环境变量隔离不可靠，故直接 overrideProvider）。
 */
export async function createTestApp(): Promise<E2eContext> {
  const dir = mkdtempSync(join(tmpdir(), 'jadmin-e2e-'));
  const dbFile = join(dir, 'db.json');

  const store = new FileStore({ filePath: dbFile });
  await store.init(); // 文件不存在 -> 自动 seed

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DATA_STORE)
    .useValue(store)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api'); // 与 main.ts 保持一致
  await app.init();

  return {
    app,
    dbFile,
    cleanup: async () => {
      await app.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export async function loginAs(app: INestApplication, username: string, password: string): Promise<string> {
  const res = await import('supertest').then((request) =>
    request.default(app.getHttpServer()).post('/api/auth/login').send({ username, password }).expect(200),
  );
  return res.body.data.token as string;
}
