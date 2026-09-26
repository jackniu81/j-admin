import type { OrderStatus } from '../data/data-store.interface';
import type {
  CategorySalesPoint,
  OrderStatusBucket,
  ReportOverview,
  SalesTrendPoint,
} from './reports.types';

/**
 * Demo 兜底 mock（issue #35 附加要求）。
 * 当数据库中确实没有订单/商品数据时（例如全新 PostgreSQL 库未播种），
 * server 读取后自动生成一批「好看」的演示数据，保证报表/看板有观感。
 * 数值带轻微随机，接口每次调用即刷新；仅用于演示，非真实统计。
 */

/** 本地时区 YYYY-MM-DD（与 service 口径一致，避免 UTC 跨天偏移） */
export function toLocalDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** [min,max] 闭区间取整 */
function rand(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/** 近 N 天日期数组（今天向前推 days-1 天，升序） */
function recentDays(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(toLocalDay(d));
  }
  return out;
}

export function mockSalesTrend(days: number): SalesTrendPoint[] {
  const dates = recentDays(days);
  return dates.map((date, idx) => {
    // 轻微上行的基线 + 周末波动 + 噪声，看起来自然
    const base = 6000 + (idx / days) * 4000;
    const weekend = [0, 6].includes(new Date(date).getDay()) ? 1.3 : 1;
    const amount = Math.round(base * weekend * (0.8 + Math.random() * 0.5));
    const count = Math.max(1, Math.round(amount / (400 + rand(0, 200))));
    return { date, amount, count };
  });
}

export function mockOverview(days: number): ReportOverview {
  const trend = mockSalesTrend(days);
  const totalSales = trend.reduce((s, t) => s + t.amount, 0);
  const orderCount = trend.reduce((s, t) => s + t.count, 0);
  const valid = Math.round(orderCount * 0.93); // 扣掉取消
  const avgOrderValue = valid ? Math.round((totalSales / valid) * 100) / 100 : 0;
  const cancelRate = 0.05 + Math.random() * 0.05;
  return {
    totalSales,
    orderCount,
    avgOrderValue,
    cancelRate: Math.round(cancelRate * 1000) / 1000,
  };
}

export function mockOrderStatus(): OrderStatusBucket[] {
  return [
    { status: 'pending', count: rand(8, 25) },
    { status: 'paid', count: rand(15, 40) },
    { status: 'completed', count: rand(60, 140) },
    { status: 'cancelled', count: rand(3, 15) },
  ];
}

const MOCK_CATEGORIES = ['数码配件', '家居用品', '服装鞋帽', '美妆个护', '食品生鲜'];

export function mockCategorySales(): CategorySalesPoint[] {
  return MOCK_CATEGORIES.map((category) => ({
    category,
    amount: rand(20000, 90000),
    qty: rand(60, 400),
  }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
}
