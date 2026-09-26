import { Inject, Injectable } from '@nestjs/common';
import { BizException } from '../common/biz.exception';
import { DATA_STORE, DataStore } from '../data/data-store.interface';
import type { OrderItem, OrderRow, OrderStatus } from '../data/data-store.interface';
import { CreateOrderDto, OrderItemInputDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

/** 合法状态流转：pending→paid→completed；pending|paid→cancelled */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

/** 对外视图：items 由 JSON 字符串解析为数组，便于详情抽屉渲染 */
export interface OrderView extends Omit<OrderRow, 'items'> {
  items: OrderItem[];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

@Injectable()
export class OrdersService {
  constructor(@Inject(DATA_STORE) private readonly store: DataStore) {}

  /** 解析 items JSON 字符串（脏数据兜底为空数组），屏蔽 file/pg 存储差异 */
  private toView(row: OrderRow): OrderView {
    let items: OrderItem[] = [];
    try {
      items = JSON.parse(row.items) as OrderItem[];
    } catch {
      items = [];
    }
    return { ...row, items };
  }

  /** 校验客户存在（软删也视为不存在），返回下单快照名 */
  private async resolveCustomer(customerId: string): Promise<string> {
    const c = await this.store.findOne('customers', customerId);
    if (!c || c.deleted) throw new BizException(40000, '所选客户不存在或已删除');
    return c.name;
  }

  /** 按商品表解析单价与名称，重算金额；防止前端篡改价格 */
  private async buildItems(
    inputs: OrderItemInputDto[],
  ): Promise<{ items: OrderItem[]; amount: number }> {
    const items: OrderItem[] = [];
    for (const it of inputs) {
      const p = await this.store.findOne('products', it.productId);
      if (!p || p.deleted) throw new BizException(40000, `商品不存在：${it.productId}`);
      items.push({ productId: p.id, name: p.name, price: p.price, qty: it.qty });
    }
    const amount = items.reduce((sum, x) => sum + x.price * x.qty, 0);
    return { items, amount };
  }

  /** 订单号：ORD + yyyymmddHHmmss + 3 位随机；调用方再查重 */
  private genOrderNo(): string {
    const d = new Date();
    const ymd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const hms = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const rnd = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `ORD${ymd}${hms}${rnd}`;
  }

  private async assertOrderNoFree(orderNo: string): Promise<void> {
    const dup = await this.store.findBy('orders', { orderNo });
    if (dup) throw new BizException(40900, '订单号已存在');
  }

  /** 分页列表（支持 keyword / status / 排序 / createdAt 区间） */
  async findAll(q: QueryOrderDto) {
    const { list, total } = await this.store.find('orders', {
      keyword: q.keyword,
      status: q.status,
      sortBy: q.sortBy as any,
      sortOrder: q.sortOrder,
      page: q.page,
      pageSize: q.pageSize,
      from: q.from,
      to: q.to,
    });
    return { list: list.map((r) => this.toView(r)), total, page: q.page, pageSize: q.pageSize };
  }

  /** 详情（items 已解析，供抽屉） */
  async findOne(id: string): Promise<OrderView> {
    const target = await this.store.findOne('orders', id);
    if (!target || target.deleted) throw new BizException(40400, '订单不存在');
    return this.toView(target);
  }

  /**
   * 新增/编辑表单的可选项（客户 + 上架商品摘要）。
   * 商品完整 CRUD 属 #34，这里只为订单表单提供最小只读数据，使 #33 自洽。
   */
  async getFormOptions() {
    const [customers, products] = await Promise.all([
      this.store.find('customers', { pageSize: 100, status: 'enabled' }),
      this.store.find('products', { pageSize: 100, status: 'on' }),
    ]);
    return {
      customers: customers.list.map((c) => ({ id: c.id, name: c.name })),
      products: products.list.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
      })),
    };
  }

  async create(dto: CreateOrderDto): Promise<OrderView> {
    const customerName = await this.resolveCustomer(dto.customerId);
    const { items, amount } = await this.buildItems(dto.items);
    const orderNo = dto.orderNo?.trim() || this.genOrderNo();
    await this.assertOrderNoFree(orderNo);

    const created = await this.store.insert('orders', {
      orderNo,
      customerId: dto.customerId,
      customerName,
      amount,
      status: dto.status ?? 'pending',
      items: JSON.stringify(items),
      remark: dto.remark,
    });
    return this.toView(created);
  }

  async update(id: string, dto: UpdateOrderDto): Promise<OrderView> {
    const target = await this.store.findOne('orders', id);
    if (!target || target.deleted) throw new BizException(40400, '订单不存在');

    const patch: Partial<OrderRow> = {};
    if (dto.customerId && dto.customerId !== target.customerId) {
      patch.customerId = dto.customerId;
      patch.customerName = await this.resolveCustomer(dto.customerId);
    }
    if (dto.items) {
      const { items, amount } = await this.buildItems(dto.items);
      patch.items = JSON.stringify(items);
      patch.amount = amount;
    }
    if (dto.remark !== undefined) patch.remark = dto.remark;

    const updated = await this.store.update('orders', id, patch);
    return this.toView(updated);
  }

  /** 状态推进：校验合法流转，非法 → 40000 */
  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<OrderView> {
    const target = await this.store.findOne('orders', id);
    if (!target || target.deleted) throw new BizException(40400, '订单不存在');

    if (dto.status !== target.status && !ALLOWED_TRANSITIONS[target.status].includes(dto.status)) {
      throw new BizException(40000, `不允许从「${target.status}」流转到「${dto.status}」`);
    }
    const updated = await this.store.update('orders', id, { status: dto.status });
    return this.toView(updated);
  }

  async softDelete(id: string): Promise<OrderView> {
    const target = await this.store.findOne('orders', id);
    if (!target || target.deleted) throw new BizException(40400, '订单不存在');
    const deleted = await this.store.softDelete('orders', id);
    return this.toView(deleted);
  }
}
