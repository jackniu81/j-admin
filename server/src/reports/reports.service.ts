import { Inject, Injectable, Logger } from '@nestjs/common';
import { DATA_STORE, DataStore } from '../data/data-store.interface';
import type { OrderItem, OrderRow, OrderStatus, ProductRow } from '../data/data-store.interface';
import {
  mockCategorySales,
  mockOrderStatus,
  mockOverview,
  mockSalesTrend,
  toLocalDay,
} from './report-mock';
import type {
  CategorySalesPoint,
  OrderStatusBucket,
  ReportOverview,
  SalesTrendPoint,
} from './reports.types';

const ALL_STATUSES: OrderStatus[] = ['pending', 'paid', 'completed', 'cancelled'];

/**
 * 报表聚合（spec §6 / issue #35）。读 orders / products，分页扫描全量（demo 规模一次即返回）。
 * 附加要求：当库中无订单数据时，自动回退到 mock 演示数据，保证看板/报表有观感（见 report-mock）。
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(@Inject(DATA_STORE) private readonly store: DataStore) {}

  /** 分页遍历某集合的全部未删除行（demo 规模，一次拉完） */
  private async scanAll(c: 'orders' | 'products'): Promise<any[]> {
    const out: any[] = [];
    let page = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { list, total } = await this.store.find(c, { page, pageSize: 100 });
      out.push(...list);
      if (out.length >= total || list.length === 0) break;
      page++;
    }
    return out;
  }

  /** 近 N 天的时间下界（本地 0 点） */
  private startMs(days: number): number {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (days - 1));
    return d.getTime();
  }

  private inRecent(iso: string, startMs: number): boolean {
    return new Date(iso).getTime() >= startMs;
  }

  /** 概览卡：销售额 / 订单数 / 客单价 / 取消率（金额排除 cancelled） */
  async overview(days: number): Promise<ReportOverview> {
    const orders = (await this.scanAll('orders')) as OrderRow[];
    if (orders.length === 0) {
      this.logger.debug('orders 为空，overview 返回 demo mock 数据');
      return mockOverview(days);
    }
    const start = this.startMs(days);
    const scoped = orders.filter((o) => this.inRecent(o.createdAt, start));
    const valid = scoped.filter((o) => o.status !== 'cancelled');
    const totalSales = valid.reduce((s, o) => s + o.amount, 0);
    const cancelled = scoped.filter((o) => o.status === 'cancelled').length;
    return {
      totalSales: Math.round(totalSales * 100) / 100,
      orderCount: scoped.length,
      avgOrderValue: valid.length ? Math.round((totalSales / valid.length) * 100) / 100 : 0,
      cancelRate: scoped.length ? Math.round((cancelled / scoped.length) * 1000) / 1000 : 0,
    };
  }

  /** 销售趋势：近 N 天逐日 amount / count（排除 cancelled），缺日补 0 */
  async salesTrend(days: number): Promise<SalesTrendPoint[]> {
    const orders = (await this.scanAll('orders')) as OrderRow[];
    if (orders.length === 0) {
      this.logger.debug('orders 为空，salesTrend 返回 demo mock 数据');
      return mockSalesTrend(days);
    }
    const buckets = new Map<string, SalesTrendPoint>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      buckets.set(toLocalDay(d), { date: toLocalDay(d), amount: 0, count: 0 });
    }
    for (const o of orders) {
      if (o.status === 'cancelled') continue;
      const key = toLocalDay(new Date(o.createdAt));
      const b = buckets.get(key);
      if (b) {
        b.amount += o.amount;
        b.count += 1;
      }
    }
    return [...buckets.values()];
  }

  /** 订单状态分布：四态真实计数（全量，不分时间） */
  async orderStatus(): Promise<OrderStatusBucket[]> {
    const orders = (await this.scanAll('orders')) as OrderRow[];
    if (orders.length === 0) {
      this.logger.debug('orders 为空，orderStatus 返回 demo mock 数据');
      return mockOrderStatus();
    }
    const counts = new Map<OrderStatus, number>(ALL_STATUSES.map((s) => [s, 0]));
    for (const o of orders) {
      counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
    }
    return ALL_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 }));
  }

  /** 分类销量 TOP5：按商品分类聚合有效订单 items 的金额与件数 */
  async categorySales(days: number): Promise<CategorySalesPoint[]> {
    const [orders, products] = (await Promise.all([
      this.scanAll('orders'),
      this.scanAll('products'),
    ])) as [OrderRow[], ProductRow[]];
    if (orders.length === 0) {
      this.logger.debug('orders 为空，categorySales 返回 demo mock 数据');
      return mockCategorySales();
    }
    const catById = new Map<string, string>(products.map((p) => [p.id, p.category]));
    const start = this.startMs(days);
    const agg = new Map<string, { amount: number; qty: number }>();
    for (const o of orders) {
      if (o.status === 'cancelled') continue;
      if (!this.inRecent(o.createdAt, start)) continue;
      let items: OrderItem[] = [];
      try {
        items = JSON.parse(o.items) as OrderItem[];
      } catch {
        items = [];
      }
      for (const it of items) {
        const category = catById.get(it.productId) ?? '未分类';
        const cur = agg.get(category) ?? { amount: 0, qty: 0 };
        cur.amount += it.price * it.qty;
        cur.qty += it.qty;
        agg.set(category, cur);
      }
    }
    return [...agg.entries()]
      .map(([category, v]) => ({
        category,
        amount: Math.round(v.amount * 100) / 100,
        qty: v.qty,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }
}
