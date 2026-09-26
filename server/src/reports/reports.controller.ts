import { Controller, Get, Query } from '@nestjs/common';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  /** 概览：{ totalSales, orderCount, avgOrderValue, cancelRate }（金额排除 cancelled） */
  @Get('overview')
  overview(@Query() q: ReportQueryDto) {
    return this.svc.overview(q.days);
  }

  /** 销售趋势：[{ date, amount, count }]，缺日补 0 */
  @Get('sales-trend')
  salesTrend(@Query() q: ReportQueryDto) {
    return this.svc.salesTrend(q.days);
  }

  /** 订单状态分布：[{ status, count }]（全量真实计数） */
  @Get('order-status')
  orderStatus() {
    return this.svc.orderStatus();
  }

  /** 分类销量 TOP5：[{ category, amount, qty }] */
  @Get('category-sales')
  categorySales(@Query() q: ReportQueryDto) {
    return this.svc.categorySales(q.days);
  }
}
