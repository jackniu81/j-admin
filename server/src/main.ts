import { NestFactory } from '@nestjs/core';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import express from 'express';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { UPLOADS_ROOT } from './upload/uploads-path';

const clientDist = join(__dirname, '..', '..', 'client', 'dist');
const indexHtml = join(clientDist, 'index.html');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // All API endpoints live under /api
  app.setGlobalPrefix('api');
  app.enableCors();

  // Finalize Nest's routes first, then attach static hosting + SPA fallback
  // AFTER them, so /api is always matched by the API and never shadowed.
  await app.init();

  const server = app.getHttpAdapter().getInstance();

  // 上传图片静态托管：必须挂到 SPA catch-all 之前，否则 /uploads/* 会被非 /api 通配吃掉返回 index.html
  if (!existsSync(UPLOADS_ROOT)) mkdirSync(UPLOADS_ROOT, { recursive: true });
  server.use('/uploads', express.static(UPLOADS_ROOT));

  if (existsSync(indexHtml)) {
    server.use(express.static(clientDist));
    // Deep links (e.g. a refresh on /about) -> serve the SPA shell
    server.get(/^(?!\/api).*/, (_req: Request, res: Response) => {
      res.sendFile(indexHtml);
    });
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 Server ready at http://localhost:${port}`);
}
bootstrap();
