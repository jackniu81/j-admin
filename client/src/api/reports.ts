import http from './index';
import type { OrderStatus } from './orders';

export type ReportDays = 7 | 14 | 30;

/** GET /api/reports/overview */
export interface ReportOverview {
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
  cancelRate: number; // 0~1
}

/** GET /api/reports/sales-trend 单日点 */
export interface SalesTrendPoint {
  date: string;
  amount: number;
  count: number;
}

/** GET /api/reports/order-status */
export interface OrderStatusBucket {
  status: OrderStatus;
  count: number;
}

/** GET /api/reports/category-sales TOP5 */
export interface CategorySalesPoint {
  category: string;
  amount: number;
  qty: number;
}

export function apiReportOverview(days: ReportDays): Promise<ReportOverview> {
  return http.get('/reports/overview', { params: { days } });
}

export function apiReportSalesTrend(days: ReportDays): Promise<SalesTrendPoint[]> {
  return http.get('/reports/sales-trend', { params: { days } });
}

export function apiReportOrderStatus(): Promise<OrderStatusBucket[]> {
  return http.get('/reports/order-status');
}

export function apiReportCategorySales(days: ReportDays): Promise<CategorySalesPoint[]> {
  return http.get('/reports/category-sales', { params: { days } });
}
