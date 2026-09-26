import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}

  /** 列表（登录即可） */
  @Get()
  findAll(@Query() q: QueryProductDto) {
    return this.svc.findAll(q);
  }

  /** 详情（登录即可） */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  /** 新增（admin） */
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.svc.create(dto);
  }

  /** 编辑（admin） */
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.svc.update(id, dto);
  }

  /** 上下架（admin） */
  @Roles('admin')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateProductStatusDto) {
    return this.svc.updateStatus(id, dto);
  }

  /** 软删除（admin） */
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.softDelete(id);
  }
}
