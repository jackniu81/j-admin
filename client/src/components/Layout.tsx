import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Breadcrumb,
  Button,
  Dropdown,
  Flex,
  Layout as AntdLayout,
  Menu,
  Tag,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import { confirmModal } from '../utils/feedback';
import { ROUTES } from '../routes';

const { Header, Sider, Content } = AntdLayout;

const SIDER_KEY = 'j-admin.sider.collapsed';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 折叠态持久化
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDER_KEY) === '1');

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDER_KEY, next ? '1' : '0');
  };

  // 按角色过滤菜单（单一数据源：routes.tsx）
  const menuItems: MenuProps['items'] = useMemo(() => {
    return ROUTES
      .filter((r) => {
        if (!r.meta?.roles?.length) return true;
        return user && r.meta.roles.includes(user.role);
      })
      .map((r) => {
        const IconComp = r.meta?.icon;
        return {
          key: r.path,
          icon: IconComp ? <IconComp /> : undefined,
          label: r.label,
        };
      });
  }, [user]);

  // 当前高亮菜单项 = pathname 最长匹配
  const selectedKey = useMemo(() => {
    const sorted = [...ROUTES].sort((a, b) => b.path.length - a.path.length);
    const match = sorted.find((r) => location.pathname.startsWith(r.path));
    return match?.path ?? '/';
  }, [location.pathname]);

  // 面包屑由当前路由 meta.breadcrumb 派生
  const breadcrumbItems = useMemo(() => {
    const route = ROUTES.find((r) => r.path === selectedKey);
    const crumbs = route?.meta?.breadcrumb ?? ['首页'];
    return crumbs.map((c) => ({ title: c }));
  }, [selectedKey]);

  // 用户下拉
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        confirmModal({
          title: '确认退出',
          content: '确定要退出登录吗？',
          okText: '退出',
          cancelText: '取消',
          onOk: async () => {
            await logout();
            navigate('/login', { replace: true });
          },
        });
      },
    },
  ];

  return (
    <AntdLayout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={208}
        collapsedWidth={64}
        style={{ overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0 }}
      >
        <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: collapsed ? 14 : 18 }}>
          {collapsed ? 'JA' : 'J-Admin'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <AntdLayout style={{ marginLeft: collapsed ? 64 : 208, transition: 'margin-left .2s' }}>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Flex align="center" gap={16}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapsed}
            />
            <Breadcrumb items={breadcrumbItems} />
          </Flex>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Flex align="center" gap={8} style={{ cursor: 'pointer' }}>
              <Typography.Text ellipsis style={{ maxWidth: 120 }}>
                {user?.displayName ?? user?.username ?? '未知'}
              </Typography.Text>
              {user && (
                <Tag color={user.role === 'admin' ? 'blue' : 'default'}>
                  {user.role}
                </Tag>
              )}
            </Flex>
          </Dropdown>
        </Header>

        <Content style={{ padding: 24, minHeight: 'calc(100vh - 56px)' }}>
          {children}
        </Content>
      </AntdLayout>
    </AntdLayout>
  );
}
