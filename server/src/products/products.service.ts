import { Inject, Injectable } from '@nestjs/common';
import { BizException } from '../common/biz.exception';
import { DATA_STORE, DataStore } from '../data/data-store.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(@Inject(DATA_STORE) private readonly store: DataStore) {}

  /** 分页列表（keyword 命中名称/分类，status 精确，支持排序） */
  async findAll(q: QueryProductDto) {
    const { list, total } = await this.store.find('products', {
      keyword: q.keyword,
      status: q.status,
      sortBy: q.sortBy as any,
      sortOrder: q.sortOrder,
      page: q.page,
      pageSize: q.pageSize,
    });
    return { list, total, page: q.page, pageSize: q.pageSize };
  }

  async findOne(id: string) {
    const target = await this.store.findOne('products', id);
    if (!target || target.deleted) throw new BizException(40400, '商品不存在');
    return target;
  }

  /** 新增（名称允许重复，无库级唯一约束） */
  async create(dto: CreateProductDto) {
    return this.store.insert('products', dto);
  }

  /** 局部更新（不存在 → 40400） */
  async update(id: string, dto: UpdateProductDto) {
    const target = await this.store.findOne('products', id);
    if (!target || target.deleted) throw new BizException(40400, '商品不存在');
    return this.store.update('products', id, dto);
  }

  /** 上下架（spec §7.3） */
  async updateStatus(id: string, dto: UpdateProductStatusDto) {
    const target = await this.store.findOne('products', id);
    if (!target || target.deleted) throw new BizException(40400, '商品不存在');
    return this.store.update('products', id, { status: dto.status });
  }

  /** 软删除（不存在 → 40400） */
  async softDelete(id: string) {
    const target = await this.store.findOne('products', id);
    if (!target || target.deleted) throw new BizException(40400, '商品不存在');
    return this.store.softDelete('products', id);
  }
}
