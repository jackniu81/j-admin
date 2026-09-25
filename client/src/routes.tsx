import type { ComponentType } from 'react';

/**
 * 路由与菜单元数据（唯一数据源，#5 侧边栏/面包屑由它派生）。
 * Issue #4 只用到 element + roles，meta 预留字段。
 */
export interface RouteMeta {
  title?: string;
  breadcrumb?: string[];
  /** 可见角色，空/undefined 表示全部登录用户可见 */
  roles?: string[];
}

export interface AppRoute {
  path: string;
  label: string;
  component: ComponentType;
  meta?: RouteMeta;
}

// 占位（Issue #5/#6 会补 Dashboard/Customers/Users 页面组件）
import Welcome from './pages/Welcome';

export const ROUTES: AppRoute[] = [
  {
    path: '/',
    label: '首页',
    component: Welcome,
    meta: { title: '首页', breadcrumb: ['首页'] },
  },
];
