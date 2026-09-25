import http from './index';

export interface DashboardStats {
  totalUsers: number;
  todayNew: number;
  activeCount: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface StatusBucket {
  status: 'enabled' | 'disabled';
  count: number;
}

/** GET /api/dashboard/stats */
export function apiDashboardStats(): Promise<DashboardStats> {
  return http.get('/dashboard/stats');
}

/** GET /api/dashboard/trend?days=7|14|30 */
export function apiDashboardTrend(days: 7 | 14 | 30 = 7): Promise<TrendPoint[]> {
  return http.get('/dashboard/trend', { params: { days } });
}

/** GET /api/dashboard/status-distribution */
export function apiDashboardStatusDistribution(): Promise<StatusBucket[]> {
  return http.get('/dashboard/status-distribution');
}
