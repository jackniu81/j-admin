import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { TrendQueryDto } from './dto/trend-query.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  /** 顶部统计卡片：{ totalUsers, todayNew, activeCount } */
  @Get('stats')
  getStats() {
    return this.svc.getStats();
  }

  /** 近 N 天新增趋势（7/14/30） */
  @Get('trend')
  getTrend(@Query() q: TrendQueryDto) {
    return this.svc.getTrend(q.days as 7 | 14 | 30);
  }

  /** 客户状态分布 */
  @Get('status-distribution')
  getStatusDistribution() {
    return this.svc.getStatusDistribution();
  }
}
