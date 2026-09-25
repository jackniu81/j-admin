import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Result, Spin } from 'antd';
import { getToken } from '../api';
import { useAuth } from './AuthContext';

/** 无 token → 跳登录并记住来源；角色不足 → 403 页面 */
export default function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: string[];
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 正在验证 token（拉 profile 中）→ 短暂 loading
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 120 }}>
        <Spin size="large" />
      </div>
    );
  }

  const token = getToken();
  if (!token) {
    const from = location.pathname + location.search;
    return <Navigate to={`/login?from=${encodeURIComponent(from)}`} replace />;
  }

  // 角色检查：不足则展示 403
  if (roles && roles.length > 0 && user && !roles.includes(user.role)) {
    return <Result status="403" title="403" subTitle="无权访问该页面" />;
  }

  return <>{children}</>;
}
