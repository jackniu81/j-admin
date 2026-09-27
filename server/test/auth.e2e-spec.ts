import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, loginAs } from './utils';

jest.setTimeout(60_000); // 每个 suite 独立启动 app + bcrypt seed

/** 登录/RBAC 冒烟：种子账号 admin(admin) / user2(user) */
describe('Auth e2e', () => {
  let app: INestApplication;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    ({ app, cleanup } = await createTestApp());
  });

  afterAll(async () => {
    await cleanup();
  });

  const http = () => request(app.getHttpServer());

  it('账密错误 -> 401 + 40101 统一文案', async () => {
    const res = await http()
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' })
      .expect(401);
    expect(res.body.code).toBe(40101);
    expect(res.body.message).toBe('账号或密码错误');
  });

  it('登录成功 -> 200 { code:0, data:{ token, user } }，user 不含 passwordHash', async () => {
    const res = await http()
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' })
      .expect(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.role).toBe('admin');
  });

  it('无 token 访问受保护接口 -> 401 + 40100', async () => {
    const res = await http().get('/api/auth/profile').expect(401);
    expect(res.body.code).toBe(40100);
  });

  it('伪造 token -> 401 + 40100', async () => {
    const res = await http()
      .get('/api/customers')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
    expect(res.body.code).toBe(40100);
  });

  it('带 token 获取 profile', async () => {
    const token = await loginAs(app, 'admin', 'admin');
    const res = await http()
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.username).toBe('admin');
  });

  it('RBAC：user 角色访问 admin 接口 -> 403 + 40300', async () => {
    const token = await loginAs(app, 'user2', 'user2');
    const res = await http()
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    expect(res.body.code).toBe(40300);
  });

  it('RBAC：admin 访问用户列表 -> 200', async () => {
    const token = await loginAs(app, 'admin', 'admin');
    const res = await http()
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(3);
  });

  it('未知路由 -> 统一响应体（40404 或映射码）', async () => {
    const res = await http().get('/api/nope').expect(404);
    expect(res.body.code).toEqual(expect.any(Number));
  });
});
