import type { OrderStatus } from '../data/data-store.interface';

/** GET /api/reports/overview 出参（金额均排除 cancelled） */
export interface ReportOverview {
  totalSales: number; // 区间内有效订单销售额
  orderCount: number; // 区间内订单总数（含取消，用于取消率分母）
  avgOrderValue: number; // 客单价 = totalSales / 有效订单数
  cancelRate: number; // 取消率 = 取消数 / 总数（0~1）
}

/** GET /api/reports/sales-trend 单日点 */
export interface SalesTrendPoint {
  date: string; // YYYY-MM-DD
  amount: number;
  count: number;
}

/** GET /api/reports/order-status 单状态桶 */
export interface OrderStatusBucket {
  status: OrderStatus;
  count: number;
}

/** GET /api/reports/category-sales 单分类（TOP5） */
export interface CategorySalesPoint {
  category: string;
  amount: number;
  qty: number;
}
