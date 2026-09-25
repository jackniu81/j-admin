import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly svc: CustomersService) {}

  /** 列表（登录即可） */
  @Get()
  findAll(@Query() q: QueryCustomerDto) {
    return this.svc.findAll(q);
  }

  /** 新增（admin） */
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.svc.create(dto);
  }

  /** 编辑（admin） */
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.svc.update(id, dto);
  }

  /** 软删除（admin） */
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.softDelete(id);
  }
}
