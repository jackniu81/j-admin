import type { CSSProperties, ReactNode } from 'react';
import { NavLink } from 'react-router';
import { Button, Flex, Layout as AntdLayout, Typography } from 'antd';

const { Header, Content, Footer } = AntdLayout;

// Shared content width so header / main / footer stay aligned
const SHELL: CSSProperties = {
  maxWidth: 768,
  margin: '0 auto',
  width: '100%',
};

const NAV_ITEMS = [
  { to: '/', label: 'Welcome', end: true },
  { to: '/about', label: 'About', end: false },
];

function NavBar() {
  return (
    <Flex gap={4}>
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end}>
          {({ isActive }) => (
            <Button type={isActive ? 'primary' : 'text'}>
              {item.label}
            </Button>
          )}
        </NavLink>
      ))}
    </Flex>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AntdLayout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 24px',
        }}
      >
        <Flex
          align="center"
          justify="space-between"
          style={{ ...SHELL, height: '100%' }}
        >
          <Typography.Text strong style={{ fontSize: 18 }}>
            NestJS + React
          </Typography.Text>
          <NavBar />
        </Flex>
      </Header>

      <Content style={{ padding: '40px 24px' }}>
        <div style={SHELL}>{children}</div>
      </Content>

      <Footer style={{ padding: '16px 24px', background: '#fff' }}>
        <Flex align="center" justify="space-between" style={SHELL}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            NestJS + React Full Stack Starter · v{__APP_VERSION__}
          </Typography.Text>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12 }}
            title="Build timestamp"
          >
            2026.09 · built {__BUILD_TIME__}
          </Typography.Text>
        </Flex>
      </Footer>
    </AntdLayout>
  );
}
