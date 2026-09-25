import { Inject, Injectable } from '@nestjs/common';
import { DATA_STORE, DataStore } from '../data/data-store.interface';
import type { CustomerRow } from '../data/data-store.interface';

/** {date: 'YYYY-MM-DD', count: number} 折线图点 */
export interface TrendPoint {
  date: string;
  count: number;
}

/** 状态分布 {status, count} */
export interface StatusBucket {
  status: 'enabled' | 'disabled';
  count: number;
}

/** 本地时区 YYYY-MM-DD（避免 UTC 偏移导致跨天误统计） */
function toLocalDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Injectable()
export class DashboardService {
  constructor(@Inject(DATA_STORE) private readonly store: DataStore) {}

  /** 扫描全部未删除客户（分页遍历，demo 规模一次即返回） */
  private async scanAllCustomers(): Promise<CustomerRow[]> {
    const out: CustomerRow[] = [];
    let page = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { list, total } = await this.store.find('customers', { page, pageSize: 100 });
      out.push(...(list as CustomerRow[]));
      if (out.length >= total) break;
      page++;
    }
    return out;
  }

  /** 顶部三张卡片 */
  async getStats() {
    const rows = await this.scanAllCustomers();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return {
      totalUsers: rows.length,
      todayNew: rows.filter((r) => new Date(r.createdAt) >= startOfToday).length,
      activeCount: rows.filter((r) => r.status === 'enabled').length,
    };
  }

  /** 近 N 天新增趋势，缺日补 0 */
  async getTrend(days: 7 | 14 | 30): Promise<TrendPoint[]> {
    const rows = await this.scanAllCustomers();
    // 预生成日历（今天向前推 days-1 天）
    const buckets = new Map<string, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      buckets.set(toLocalDay(d), 0);
    }
    // 累加
    for (const r of rows) {
      const key = toLocalDay(new Date(r.createdAt));
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([date, count]) => ({ date, count }));
  }

  /** 状态分布（启用/禁用） */
  async getStatusDistribution(): Promise<StatusBucket[]> {
    const rows = await this.scanAllCustomers();
    const enabled = rows.filter((r) => r.status === 'enabled').length;
    const disabled = rows.filter((r) => r.status === 'disabled').length;
    return [
      { status: 'enabled', count: enabled },
      { status: 'disabled', count: disabled },
    ];
  }
}
