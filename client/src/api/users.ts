import http from './index';
import type { PageResult } from './customers';

/** 用户实体（后端已剔除 passwordHash） */
export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'user';
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface UserQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** GET /api/users */
export function apiListUsers(q: UserQuery): Promise<PageResult<AdminUser>> {
  return http.get('/users', { params: q });
}

/** PATCH /api/users/:id/status */
export function apiUpdateUserStatus(
  id: string,
  status: 'active' | 'disabled',
): Promise<AdminUser> {
  return http.patch(`/users/${id}/status`, { status });
}
