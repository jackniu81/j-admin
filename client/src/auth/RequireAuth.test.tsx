import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getToken } from '../api';
import { useAuth } from './AuthContext';
import RequireAuth from './RequireAuth';

vi.mock('../api', () => ({ getToken: vi.fn() }));
vi.mock('./AuthContext', () => ({ useAuth: vi.fn() }));

type AuthOverride = Partial<{
  user: { role: 'admin' | 'user' } | null;
  loading: boolean;
}>;

function mockAuth({ user = null, loading = false }: AuthOverride = {}) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    loading,
    isAdmin: user?.role === 'admin',
    login: vi.fn(),
    logout: vi.fn(),
  } as never);
}

function renderAt(path = '/secret') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>登录页</div>} />
        <Route
          path="/secret"
          element={
            <RequireAuth roles={['admin']}>
              <div>私密内容</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(getToken).mockReset();
  vi.mocked(useAuth).mockReset();
});

describe('RequireAuth', () => {
  it('校验 token 中：显示 loading，不渲染内容也不跳转', () => {
    mockAuth({ loading: true });
    renderAt();
    expect(screen.queryByText('私密内容')).not.toBeInTheDocument();
    expect(screen.queryByText('登录页')).not.toBeInTheDocument();
  });

  it('无 token：重定向到登录页', () => {
    mockAuth({ user: null });
    vi.mocked(getToken).mockReturnValue(null);
    renderAt();
    expect(screen.getByText('登录页')).toBeInTheDocument();
    expect(screen.queryByText('私密内容')).not.toBeInTheDocument();
  });

  it('有 token 且角色匹配：渲染受保护内容', () => {
    mockAuth({ user: { role: 'admin' } });
    vi.mocked(getToken).mockReturnValue('tok');
    renderAt();
    expect(screen.getByText('私密内容')).toBeInTheDocument();
  });

  it('有 token 但角色不足：展示 403', () => {
    mockAuth({ user: { role: 'user' } });
    vi.mocked(getToken).mockReturnValue('tok');
    renderAt();
    expect(screen.queryByText('私密内容')).not.toBeInTheDocument();
    expect(screen.getByText('无权访问该页面')).toBeInTheDocument();
  });
});
