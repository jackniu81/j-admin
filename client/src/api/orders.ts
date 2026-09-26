import http from './index';
import type { PageResult } from './customers';

/** 订单明细项（后端已把 items 从 JSON 解析为数组返回） */
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled';

/** 订单实体（对外视图） */
export interface Order {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: OrderStatus;
  items: OrderItem[];
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  from?: string;
  to?: string;
}

/** 新增/编辑入参：明细只提交 productId + qty，单价与金额由后端计算 */
export interface OrderItemInput {
  productId: string;
  qty: number;
}
export interface OrderPayload {
  customerId: string;
  items: OrderItemInput[];
  orderNo?: string;
  status?: OrderStatus;
  remark?: string;
}

/** GET /api/orders */
export function apiListOrders(q: OrderQuery): Promise<PageResult<Order>> {
  return http.get('/orders', { params: q });
}

/** GET /api/orders/:id（详情，items 已解析） */
export function apiGetOrder(id: string): Promise<Order> {
  return http.get(`/orders/${id}`);
}

/** 表单可选项：客户 + 上架商品摘要 */
export interface OrderFormOptions {
  customers: { id: string; name: string }[];
  products: { id: string; name: string; price: number; category: string }[];
}

/** GET /api/orders/form-options */
export function apiOrderFormOptions(): Promise<OrderFormOptions> {
  return http.get('/orders/form-options');
}

/** POST /api/orders（admin） */
export function apiCreateOrder(payload: OrderPayload): Promise<Order> {
  return http.post('/orders', payload);
}

/** PATCH /api/orders/:id（admin） */
export function apiUpdateOrder(id: string, payload: Partial<OrderPayload>): Promise<Order> {
  return http.patch(`/orders/${id}`, payload);
}

/** PATCH /api/orders/:id/status（admin，状态流转） */
export function apiUpdateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  return http.patch(`/orders/${id}/status`, { status });
}

/** DELETE /api/orders/:id（admin，软删除） */
export function apiDeleteOrder(id: string): Promise<Order> {
  return http.delete(`/orders/${id}`);
}

/** 状态展示元数据（四态：文案 + 颜色），列表 / 抽屉 / 表单共用 */
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { text: string; color: string; badge: 'default' | 'processing' | 'success' | 'warning' | 'error' }
> = {
  pending: { text: '待付款', color: 'orange', badge: 'warning' },
  paid: { text: '待发货', color: 'blue', badge: 'processing' },
  completed: { text: '已完成', color: 'green', badge: 'success' },
  cancelled: { text: '已取消', color: 'default', badge: 'default' },
};

/** 允许的下一步流转目标（与后端 ALLOWED_TRANSITIONS 对齐，前端仅用于按钮展示） */
export const ORDER_NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};
