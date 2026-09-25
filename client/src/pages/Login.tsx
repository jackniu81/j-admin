import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { getToken } from '../api';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 已登录直接跳首页
  if (getToken()) {
    navigate('/', { replace: true });
    return null;
  }

  const onFinish = async ({ username, password }: { username: string; password: string }) => {
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      const from = params.get('from') || '/';
      navigate(from, { replace: true });
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? ((e as any).response?.data?.message ?? '登录失败')
          : '登录失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <Card style={{ width: 380, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          J-Admin 登录
        </Typography.Title>

        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="用户名" autoFocus />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>

        <Typography.Paragraph type="secondary" style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          演示账号：admin / admin &nbsp;|&nbsp; user1 / user1
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
