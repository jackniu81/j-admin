import http from './index';

/** 后端用户实体（无 passwordHash） */
export interface UserInfo {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'user';
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface LoginResult {
  token: string;
  user: UserInfo;
}

/** POST /api/auth/login */
export function apiLogin(username: string, password: string): Promise<LoginResult> {
  return http.post('/auth/login', { username, password });
}

/** GET /api/auth/profile */
export function apiProfile(): Promise<UserInfo> {
  return http.get('/auth/profile');
}

/** POST /api/auth/logout */
export function apiLogout(): Promise<void> {
  return http.post('/auth/logout');
}
