import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import {
  BarChartOutlined,
  BellOutlined,
  DashboardOutlined,
  FileSearchOutlined,
  GoldOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';

/**
 * 路由与菜单元数据（唯一数据源）。
 * 侧边栏 Menu / 面包屑 / 路由注册 均由此派生，不要手写第二份菜单。
 * 页面组件用 React.lazy 做代码分割，Suspense 提供 loading 兜底（#8）。
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
  component: LazyExoticComponent<ComponentType>;
  meta?: RouteMeta;
}

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const Orders = lazy(() => import('./pages/Orders'));
const Products = lazy(() => import('./pages/Products'));
const Reports = lazy(() => import('./pages/Reports'));
const Users = lazy(() => import('./pages/Users'));
// 未实现模块共用的占位页（#23）
const ComingSoon = lazy(() => import('./pages/ComingSoon'));

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
    path: '/orders',
    label: '订单管理',
    component: Orders,
    meta: { title: '订单管理', breadcrumb: ['首页', '订单管理'], icon: ShoppingCartOutlined },
  },
  {
    path: '/products',
    label: '商品管理',
    component: Products,
    meta: { title: '商品管理', breadcrumb: ['首页', '商品管理'], icon: GoldOutlined },
  },
  {
    path: '/reports',
    label: '报表中心',
    component: Reports,
    meta: { title: '报表中心', breadcrumb: ['首页', '报表中心'], icon: BarChartOutlined },
  },
  {
    path: '/messages',
    label: '消息通知',
    component: ComingSoon,
    meta: { title: '消息通知', breadcrumb: ['首页', '消息通知'], icon: BellOutlined },
  },
  {
    path: '/users',
    label: '用户管理',
    component: Users,
    meta: {
      title: '用户管理',
      breadcrumb: ['首页', '用户管理'],
      icon: TeamOutlined,
      roles: ['admin'],
    },
  },
  {
    path: '/logs',
    label: '操作日志',
    component: ComingSoon,
    meta: {
      title: '操作日志',
      breadcrumb: ['首页', '操作日志'],
      icon: FileSearchOutlined,
      roles: ['admin'],
    },
  },
  {
    path: '/settings',
    label: '系统设置',
    component: ComingSoon,
    meta: {
      title: '系统设置',
      breadcrumb: ['首页', '系统设置'],
      icon: SettingOutlined,
      roles: ['admin'],
    },
  },
];
