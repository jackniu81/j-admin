import { OrdersService } from './orders.service';
import type { DataStore, OrderRow, ProductRow, CustomerRow } from '../data/data-store.interface';

const P1: ProductRow = {
  id: 'p1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  deleted: false, name: '无线蓝牙耳机', category: '数码配件', price: 100, stock: 10, status: 'on',
};
const P2: ProductRow = {
  id: 'p2', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  deleted: false, name: '桌面收纳盒', category: '家居用品', price: 50, stock: 10, status: 'on',
};
const P_DELETED: ProductRow = { ...P1, id: 'p-dead', deleted: true };
const C1: CustomerRow = {
  id: 'c1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  deleted: false, name: '星辰科技1号', email: 'a@b.com', status: 'enabled',
};
const C_DELETED: CustomerRow = { ...C1, id: 'c-dead', deleted: true };

function order(over: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 'o1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deleted: false,
    orderNo: 'ORD20260101000001',
    customerId: 'c1',
    customerName: '星辰科技1号',
    amount: 250,
    status: 'pending',
    items: JSON.stringify([
      { productId: 'p1', name: P1.name, price: 100, qty: 2 },
      { productId: 'p2', name: P2.name, price: 50, qty: 1 },
    ]),
    ...over,
  };
}

/** 内存版 store：orders 单集合 + 商品/客户定点查询 */
function makeStore(rows: OrderRow[]) {
  const store = {
    async findOne(c: string, id: string) {
      if (c === 'orders') return rows.find((r) => r.id === id) ?? null;
      if (c === 'products') return [P1, P2, P_DELETED].find((p) => p.id === id) ?? null;
      if (c === 'customers') return [C1, C_DELETED].find((x) => x.id === id) ?? null;
      return null;
    },
    async findBy(_c: 'orders', where: Partial<OrderRow>) {
      return rows.find((r) => !r.deleted && r.orderNo === where.orderNo) ?? null;
    },
    async insert(_c: 'orders', data: Omit<OrderRow, 'id' | 'createdAt' | 'updatedAt' | 'deleted'>) {
      const row = { ...data, id: 'new-1', createdAt: 'x', updatedAt: 'x', deleted: false } as OrderRow;
      rows.push(row);
      return row;
    },
    async update(_c: 'orders', id: string, patch: Partial<OrderRow>) {
      const idx = rows.findIndex((r) => r.id === id);
      rows[idx] = { ...rows[idx], ...patch };
      return rows[idx];
    },
    async softDelete(_c: 'orders', id: string) {
      return this.update('orders', id, { deleted: true });
    },
  };
  return { store: store as unknown as DataStore, rows };
}

describe('OrdersService#create', () => {
  it('金额按商品表重算（防前端篡改价格），并落客户名快照', async () => {
    const { store } = makeStore([]);
    const svc = new OrdersService(store);

    const created = await svc.create({
      customerId: 'c1',
      items: [
        { productId: 'p1', qty: 2 },
        { productId: 'p2', qty: 1 },
      ],
    } as any);

    expect(created.amount).toBe(250); // 100*2 + 50*1，全部取自商品表单价
    expect(created.customerName).toBe('星辰科技1号');
    expect(created.items).toEqual([
      { productId: 'p1', name: P1.name, price: 100, qty: 2 },
      { productId: 'p2', name: P2.name, price: 50, qty: 1 },
    ]);
  });

  it('客户不存在或已软删 -> 40000', async () => {
    const { store } = makeStore([]);
    const svc = new OrdersService(store);
    const base = { items: [{ productId: 'p1', qty: 1 }] };

    await expect(svc.create({ customerId: 'ghost', ...base } as any)).rejects.toMatchObject({ code: 40000 });
    await expect(svc.create({ customerId: 'c-dead', ...base } as any)).rejects.toMatchObject({ code: 40000 });
  });

  it('商品已软删 -> 40000', async () => {
    const { store } = makeStore([]);
    const svc = new OrdersService(store);
    await expect(
      svc.create({ customerId: 'c1', items: [{ productId: 'p-dead', qty: 1 }] } as any),
    ).rejects.toMatchObject({ code: 40000 });
  });

  it('显式订单号重复 -> 40900', async () => {
    const { store } = makeStore([order()]);
    const svc = new OrdersService(store);
    await expect(
      svc.create({
        customerId: 'c1',
        items: [{ productId: 'p1', qty: 1 }],
        orderNo: 'ORD20260101000001',
      } as any),
    ).rejects.toMatchObject({ code: 40900 });
  });

  it('订单号留空 -> 自动生成 ORD 前缀编号', async () => {
    const { store } = makeStore([]);
    const svc = new OrdersService(store);
    const created = await svc.create({
      customerId: 'c1',
      items: [{ productId: 'p1', qty: 1 }],
    } as any);
    expect(created.orderNo).toMatch(/^ORD\d{17}$/);
  });
});

describe('OrdersService 状态流转', () => {
  it('合法链路 pending→paid→completed', async () => {
    const { store, rows } = makeStore([order()]);
    const svc = new OrdersService(store);

    expect((await svc.updateStatus('o1', { status: 'paid' } as any)).status).toBe('paid');
    expect((await svc.updateStatus('o1', { status: 'completed' } as any)).status).toBe('completed');
    expect(rows[0].status).toBe('completed');
  });

  it('pending→cancelled 合法；跨级 pending→completed -> 40000', async () => {
    const { store } = makeStore([order()]);
    const svc = new OrdersService(store);

    await expect(svc.updateStatus('o1', { status: 'completed' } as any)).rejects.toMatchObject({
      code: 40000,
    });
    expect((await svc.updateStatus('o1', { status: 'cancelled' } as any)).status).toBe('cancelled');
  });

  it('终态不可再流转；同状态重复提交放行（幂等）', async () => {
    const { store } = makeStore([order({ status: 'completed' })]);
    const svc = new OrdersService(store);

    await expect(svc.updateStatus('o1', { status: 'pending' } as any)).rejects.toMatchObject({
      code: 40000,
    });
    expect((await svc.updateStatus('o1', { status: 'completed' } as any)).status).toBe('completed');
  });
});

describe('OrdersService 视图与删除', () => {
  it('items 脏数据（非法 JSON）兜底为空数组', async () => {
    const { store } = makeStore([order({ items: 'not-a-json' })]);
    const svc = new OrdersService(store);
    expect((await svc.findOne('o1')).items).toEqual([]);
  });

  it('编辑商品明细 -> 重算金额', async () => {
    const { store, rows } = makeStore([order()]);
    const svc = new OrdersService(store);

    const updated = await svc.update('o1', { items: [{ productId: 'p2', qty: 3 }] } as any);
    expect(updated.amount).toBe(150);
    expect(rows[0].items).toBe(JSON.stringify([{ productId: 'p2', name: P2.name, price: 50, qty: 3 }]));
  });

  it('软删后详情 40400，重复删除也 40400', async () => {
    const { store } = makeStore([order()]);
    const svc = new OrdersService(store);

    await svc.softDelete('o1');
    await expect(svc.findOne('o1')).rejects.toMatchObject({ code: 40400 });
    await expect(svc.softDelete('o1')).rejects.toMatchObject({ code: 40400 });
  });
});
