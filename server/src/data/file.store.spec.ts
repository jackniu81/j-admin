import { mkdtempSync, rmSync } from 'fs';
import { readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { FileStore } from './file.store';

jest.setTimeout(30_000); // 首条用例含 bcrypt seed（cost 10 x 3）

describe('FileStore', () => {
  let dir: string;
  let filePath: string;
  let store: FileStore;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'jadmin-filestore-'));
    filePath = join(dir, 'db.json');
    store = new FileStore({ filePath });
    await store.init();
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe('init / seed', () => {
    it('文件不存在时首次 init 写入种子数据', async () => {
      const raw = JSON.parse(await readFile(filePath, 'utf-8'));
      expect(raw.users).toHaveLength(3);
      expect(raw.customers).toHaveLength(50);
      expect(raw.products).toHaveLength(22);
      expect(raw.orders).toHaveLength(60);
    });

    it('再次 init 读回已有数据而非重新 seed', async () => {
      const extra = await store.insert('customers', {
        name: '测试客户', email: 'extra@unit.test', status: 'enabled',
      });
      const store2 = new FileStore({ filePath });
      await store2.init();
      expect(await store2.findOne('customers', extra.id)).not.toBeNull();
    });
  });

  describe('find 查询', () => {
    it('默认过滤软删行，分页 total 与 list 一致', async () => {
      const { list, total } = await store.find('customers', { page: 1, pageSize: 10 });
      expect(total).toBe(51); // 50 seed + 上一用例插入
      expect(list).toHaveLength(10);
    });

    it('keyword 对 name/email 模糊匹配且不区分大小写', async () => {
      const byName = await store.find('customers', { keyword: '星辰' });
      expect(byName.list.every((c) => c.name.includes('星辰'))).toBe(true);
      const byEmail = await store.find('customers', { keyword: 'CUSTOMER01@' });
      expect(byEmail.list.map((c) => c.email)).toContain('customer01@example.com');
    });

    it('status 精确匹配 + createdAt 区间过滤', async () => {
      const disabled = await store.find('customers', { status: 'disabled', pageSize: 100 });
      expect(disabled.list.every((c) => c.status === 'disabled')).toBe(true);

      const future = await store.find('orders', { from: '2999-01-01T00:00:00.000Z' });
      expect(future.total).toBe(0);
    });

    it('sortBy 白名单：非白名单列回退 createdAt', async () => {
      const hacked = await store.find('customers', { sortBy: 'password' as any, pageSize: 100 });
      const normal = await store.find('customers', { pageSize: 100 });
      expect(hacked.list.map((r) => r.id)).toEqual(normal.list.map((r) => r.id));
    });

    it('按 amount 降序排序有效', async () => {
      const { list } = await store.find('orders', { sortBy: 'amount', sortOrder: 'desc', pageSize: 100 });
      const amounts = list.map((o) => o.amount);
      expect([...amounts].sort((a, b) => b - a)).toEqual(amounts);
    });
  });

  describe('写操作', () => {
    it('insert 生成 id/时间戳并落盘', async () => {
      const created = await store.insert('products', {
        name: '单元测试商品', category: '数码配件', price: 1, stock: 1, status: 'on',
      });
      expect(created.id).toEqual(expect.any(String));
      expect(created.deleted).toBe(false);

      const raw = JSON.parse(await readFile(filePath, 'utf-8'));
      expect(raw.products.some((p: any) => p.id === created.id)).toBe(true);
    });

    it('update 不存在的 id 抛错', async () => {
      await expect(store.update('users', 'nope', { displayName: 'x' })).rejects.toThrow();
    });

    it('softDelete 后默认查不到，includeDeleted 可见', async () => {
      const created = await store.insert('customers', {
        name: '待删除客户', email: 'del@unit.test', status: 'enabled',
      });
      await store.softDelete('customers', created.id);

      const page = await store.find('customers', { keyword: '待删除客户', includeDeleted: true });
      expect(page.list[0].deleted).toBe(true);
      const normal = await store.find('customers', { keyword: '待删除客户' });
      expect(normal.total).toBe(0);
      // findBy 同样排除软删行（应用级查重依赖此行为）
      expect(await store.findBy('customers', { email: 'del@unit.test' })).toBeNull();
    });

    it('count 支持条件统计（排除软删）', async () => {
      const activeAdmins = await store.count('users', { role: 'admin' });
      expect(activeAdmins).toBe(1); // seed 中仅 admin 一个管理员
      expect(await store.count('users')).toBe(3);
    });
  });
});

