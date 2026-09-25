import { Inject, Injectable } from '@nestjs/common';
import { BizException } from '../common/biz.exception';
import { DATA_STORE, DataStore } from '../data/data-store.interface';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(@Inject(DATA_STORE) private readonly store: DataStore) {}

  /** 分页列表 */
  async findAll(q: QueryCustomerDto) {
    const { list, total } = await this.store.find('customers', {
      keyword: q.keyword,
      status: q.status,
      sortBy: q.sortBy as any,
      sortOrder: q.sortOrder,
      page: q.page,
      pageSize: q.pageSize,
    });
    return { list, total, page: q.page, pageSize: q.pageSize };
  }

  /** 新增（email 唯一 → 40900） */
  async create(dto: CreateCustomerDto) {
    const existing = await this.store.findBy('customers', { email: dto.email });
    if (existing) throw new BizException(40900, `邮箱 ${dto.email} 已被使用`);
    return this.store.insert('customers', dto);
  }

  /** 局部更新（不存在 → 40400，email 冲突 → 40900） */
  async update(id: string, dto: UpdateCustomerDto) {
    const target = await this.store.findOne('customers', id);
    if (!target || target.deleted) throw new BizException(40400, '客户不存在');

    if (dto.email && dto.email !== target.email) {
      const dup = await this.store.findBy('customers', { email: dto.email });
      if (dup) throw new BizException(40900, `邮箱 ${dto.email} 已被使用`);
    }
    return this.store.update('customers', id, dto);
  }

  /** 软删除（不存在 → 40400） */
  async softDelete(id: string) {
    const target = await this.store.findOne('customers', id);
    if (!target || target.deleted) throw new BizException(40400, '客户不存在');
    return this.store.softDelete('customers', id);
  }
}
