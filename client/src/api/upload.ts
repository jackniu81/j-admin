/** 图片上传接口封装（issue #34）*/
import { getToken } from './index';

/**
 * ProFormUploadButton / antd Upload 直接走 XHR，不经过 axios 拦截器，
 * 因此需要手动带上 Authorization 头。上传地址与 vite proxy / Nest 静态托管对齐。
 */
export const UPLOAD_IMAGE_URL = '/api/upload/image';

/** 上传请求需要携带的鉴权头（无 token 时返回空对象） */
export function uploadHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** 后端返回：{ code, message, data: { url } } */
export interface UploadResult {
  url: string;
}

/** 供自定义上传（如需要）使用的辅助：从统一响应体取 url */
export function pickUploadUrl(res: UploadResult | { data: UploadResult }): string {
  return (res as { data?: UploadResult }).data?.url ?? (res as UploadResult).url;
}
