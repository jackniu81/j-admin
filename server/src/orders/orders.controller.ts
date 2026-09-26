import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../common';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly svc: OrdersService) {}

  /** 列表（登录即可）：分页 / keyword / status / 排序 / 日期区间 */
  @Get()
  findAll(@Query() q: QueryOrderDto) {
    return this.svc.findAll(q);
  }

  /** 表单可选项（登录，供新增/编辑下拉；需先于 :id 声明） */
  @Get('form-options')
  formOptions() {
    return this.svc.getFormOptions();
  }

  /** 详情（登录即可，items 已解析供抽屉） */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  /** 新增（admin） */
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.svc.create(dto);
  }

  /** 编辑（admin） */
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.svc.update(id, dto);
  }

  /** 状态推进（admin） */
  @Roles('admin')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.svc.updateStatus(id, dto);
  }

  /** 软删除（admin） */
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.softDelete(id);
  }
}
