import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserInfo } from '../api/auth';
import { apiLogin, apiLogout, apiProfile } from '../api/auth';
import { clearToken, getToken, setToken } from '../api';
import { AuthProvider, useAuth } from './AuthContext';

// 隔离网络：只测 AuthProvider 的状态编排逻辑
vi.mock('../api', () => ({
  getToken: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));
vi.mock('../api/auth', () => ({
  apiLogin: vi.fn(),
  apiLogout: vi.fn(),
  apiProfile: vi.fn(),
}));

const ADMIN: UserInfo = {
  id: 'u1',
  username: 'admin',
  displayName: '系统管理员',
  role: 'admin',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

beforeEach(() => {
  vi.mocked(getToken).mockReset();
  vi.mocked(setToken).mockReset();
  vi.mocked(clearToken).mockReset();
  vi.mocked(apiLogin).mockReset();
  vi.mocked(apiLogout).mockReset();
  vi.mocked(apiProfile).mockReset();
  vi.mocked(getToken).mockReturnValue(null); // 默认未登录
});

describe('AuthProvider 启动', () => {
  it('无 token：loading 结束、user 为空、不请求 profile', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(apiProfile).not.toHaveBeenCalled();
  });

  it('有 token：拉取 profile 成功后写入 user 并识别 admin', async () => {
    vi.mocked(getToken).mockReturnValue('tok');
    vi.mocked(apiProfile).mockResolvedValue(ADMIN);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(ADMIN));
    expect(apiProfile).toHaveBeenCalledTimes(1);
    expect(result.current.isAdmin).toBe(true);
  });
});

describe('AuthProvider login / logout', () => {
  it('登录成功：落 token、置 user', async () => {
    vi.mocked(apiLogin).mockResolvedValue({ token: 'tk', user: ADMIN });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login('admin', 'admin');
    });
    expect(apiLogin).toHaveBeenCalledWith('admin', 'admin');
    expect(setToken).toHaveBeenCalledWith('tk');
    expect(result.current.user).toEqual(ADMIN);
    expect(result.current.isAdmin).toBe(true);
  });

  it('登录失败：抛出错误且保持未登录', async () => {
    vi.mocked(apiLogin).mockRejectedValue(new Error('账号或密码错误'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await expect(result.current.login('admin', 'bad')).rejects.toThrow('账号或密码错误');
    });
    expect(setToken).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it('登出：即便接口失败也清 token 与 user', async () => {
    vi.mocked(getToken).mockReturnValue('tok');
    vi.mocked(apiProfile).mockResolvedValue(ADMIN);
    vi.mocked(apiLogout).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(ADMIN));

    await act(async () => {
      await result.current.logout();
    });
    expect(clearToken).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });
});
