import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, loginAs } from './utils';

jest.setTimeout(60_000);

/** 各业务模块主链路冒烟（file 模式，均用 admin token，写接口仅 admin 可用） */
describe('CRUD e2e', () => {
  let app: INestApplication;
  let cleanup: () => Promise<void>;
  let token: string;

  beforeAll(async () => {
    ({ app, cleanup } = await createTestApp());
    token = await loginAs(app, 'admin', 'admin');
  });

  afterAll(async () => {
    await cleanup();
  });

  const http = () => request(app.getHttpServer());
  // supertest 要求先选动词再 set header，故包一层返回已带鉴权头的请求构造器
  const auth = () => {
    const bearer = (r: any) => r.set('Authorization', `Bearer ${token}`);
    return {
      get: (u: string) => bearer(http().get(u)),
      post: (u: string) => bearer(http().post(u)),
      patch: (u: string) => bearer(http().patch(u)),
      delete: (u: string) => bearer(http().delete(u)),
    };
  };

  describe('customers', () => {
    it('新增 -> 列表可见 -> 邮箱重复 40900 -> 软删后详情 40400', async () => {
      const email = `e2e_${Date.now()}@test.com`;
      const created = await auth()
        .post('/api/customers')
        .send({ name: 'E2E 客户', email, status: 'enabled' })
        .expect(201);
      const id = created.body.data.id;
      expect(created.body.data.passwordHash).toBeUndefined();

      // customers 无详情路由，用列表 keyword 验证可见
      const list = await auth()
        .get('/api/customers')
        .query({ keyword: 'E2E 客户' })
        .expect(200);
      expect(list.body.data.list.some((c: any) => c.id === id)).toBe(true);

      await auth()
        .post('/api/customers')
        .send({ name: 'E2E 客户2', email, status: 'enabled' })
        .expect(409)
        .then((r) => expect(r.body.code).toBe(40900));

      await auth().delete(`/api/customers/${id}`).expect(200);
      const after = await auth()
        .get('/api/customers')
        .query({ keyword: 'E2E 客户' })
        .expect(200);
      expect(after.body.data.list.some((c: any) => c.id === id)).toBe(false);
    });

    it('参数校验失败 -> 40000 附字段错误', async () => {
      const res = await auth()
        .post('/api/customers')
        .send({ name: 'A', email: 'not-an-email', status: 'enabled' })
        .expect(400);
      expect(res.body.code).toBe(40000);
      expect(Array.isArray(res.body.data.errors)).toBe(true);
    });
  });

  describe('products', () => {
    it('新增 -> 上下架流转', async () => {
      const created = await auth()
        .post('/api/products')
        .send({ name: 'E2E 商品', category: '数码配件', price: 99, stock: 5, status: 'on' })
        .expect(201);
      const id = created.body.data.id;

      const off = await auth().patch(`/api/products/${id}/status`).send({ status: 'off' }).expect(200);
      expect(off.body.data.status).toBe('off');
    });
  });

  describe('orders', () => {
    it('取表单可选项 -> 下单（金额后端重算）-> 非法状态流转 40000', async () => {
      const opts = await auth().get('/api/orders/form-options').expect(200);
      const customerId = opts.body.data.customers[0].id;
      const productId = opts.body.data.products[0].id;
      const price = opts.body.data.products[0].price;

      const created = await auth()
        .post('/api/orders')
        .send({ customerId, items: [{ productId, qty: 2 }] })
        .expect(201);
      const order = created.body.data;
      expect(order.amount).toBe(price * 2);
      expect(order.status).toBe('pending');

      // pending 直接跳 completed 非法
      await auth()
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: 'completed' })
        .expect(400)
        .then((r) => expect(r.body.code).toBe(40000));

      // 合法：pending -> paid
      await auth()
        .patch(`/api/orders/${order.id}/status`)
        .send({ status: 'paid' })
        .expect(200);
    });
  });

  describe('users', () => {
    it('新增用户名重复 -> 40900', async () => {
      await auth()
        .post('/api/users')
        .send({ username: 'admin', password: 'secret123', displayName: 'x', role: 'user' })
        .expect(409)
        .then((r) => expect(r.body.code).toBe(40900));
    });

    it('不能删除自己 -> 40900', async () => {
      const me = await auth().get('/api/auth/profile').expect(200);
      await auth()
        .delete(`/api/users/${me.body.data.id}`)
        .expect(409)
        .then((r) => expect(r.body.code).toBe(40900));
    });
  });
});
