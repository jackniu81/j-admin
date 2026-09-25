import type { ComponentType } from 'react';
import { DashboardOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Users from './pages/Users';

/**
 * 路由与菜单元数据（唯一数据源）。
 * 侧边栏 Menu / 面包屑 / 路由注册 均由此派生，不要手写第二份菜单。
 */
export interface RouteMeta {
  title?: string;
  breadcrumb?: string[];
  icon?: ComponentType;
  /** 可见/可访问角色，空/undefined 表示全部登录用户 */
  roles?: string[];
}

export interface AppRoute {
  path: string;
  label: string;
  component: ComponentType;
  meta?: RouteMeta;
}

export const ROUTES: AppRoute[] = [
  {
    path: '/',
    label: '首页',
    component: Dashboard,
    meta: { title: '首页', breadcrumb: ['首页'], icon: DashboardOutlined },
  },
  {
    path: '/customers',
    label: '客户管理',
    component: Customers,
    meta: { title: '客户管理', breadcrumb: ['首页', '客户管理'], icon: UserOutlined },
  },
  {
    path: '/users',
    label: '用户管理',
    component: Users,
    meta: { title: '用户管理', breadcrumb: ['首页', '用户管理'], icon: TeamOutlined, roles: ['admin'] },
  },
];
