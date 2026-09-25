import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';

const TOKEN_KEY = 'j-admin.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string): void {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** 后端统一响应体 */
interface Envelope<T = unknown> {
  code: number;
  message: string;
  data: T;
}

// 同一轮并发 401 只跳一次 + 提示一次
let redirecting = false;

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '/api',
  headers: { Accept: 'application/json' },
});

// 请求拦截：自动带 token
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：解包 + 错误统一处理
http.interceptors.response.use(
  (response) => {
    const body = response.data as Envelope;
    // 非标准响应体（如文件流）透传
    if (typeof body?.code !== 'number') return response.data;
    return body.data;
  },
  (error: AxiosError<Envelope>) => {
    const status = error.response?.status;
    const bizMsg = error.response?.data?.message;

    if (status === 401) {
      clearToken();
      if (!redirecting) {
        redirecting = true;
        message.error(bizMsg || '登录已过期，请重新登录');
        // 记住当前路径供登录后回跳
        const from = window.location.pathname;
        window.location.href = `/login?from=${encodeURIComponent(from)}`;
      }
      return Promise.reject(error);
    }

    if (status === 403) {
      message.error(bizMsg || '无权执行该操作');
      return Promise.reject(error);
    }

    // 其余错误：展示后端 message 或兜底
    message.error(bizMsg || '请求失败，请稍后重试');
    return Promise.reject(error);
  },
);

export default http;
