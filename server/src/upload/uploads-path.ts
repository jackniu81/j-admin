import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';

/**
 * 本地磁盘上传基座（spec §7.3 / issue #34）。
 * uploads 根目录相对 server cwd（与 db.json 一致，须用 npm run -w server 启动）。
 * 后续可平滑替换为阿里云 OSS：仅改 controller 的落盘逻辑，返回结构 { url } 不变。
 */
export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** 当前年月目录名，如 2026-09 */
export function monthDirName(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** 确保并返回某年月的绝对目录 */
export function ensureMonthDir(month: string): string {
  const dir = join(UPLOADS_ROOT, month);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** 由磁盘绝对路径推导对外相对 URL：/uploads/yyyy-mm/uuid.ext（统一用正斜杠） */
export function toPublicUrl(month: string, filename: string): string {
  return ['/uploads', month, filename].join('/');
}

/** 保留原扩展名（小写，仅白名单类型），生成 uuid 文件名防冲突 */
export function buildFilename(originalName: string): string {
  const ext = extname(originalName || '').toLowerCase();
  const safeExt = /^\.[a-z0-9]+$/.test(ext) ? ext : '';
  return `${randomUUID()}${safeExt}`;
}
