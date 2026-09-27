import { JwtService } from '@nestjs/jwt';
import { hashSync } from 'bcryptjs';
import { AuthService } from './auth.service';
import { BizException } from '../common/biz.exception';
import type { DataStore, UserRow } from '../data/data-store.interface';

/** 只记录调用入参的内存版 store，登录逻辑只用到 users 两张查询 */
function makeStore(users: UserRow[]): DataStore & { findByCalls: Array<Partial<UserRow>> } {
  const findByCalls: Array<Partial<UserRow>> = [];
  return {
    findByCalls,
    async findBy(_c: 'users', where: Partial<UserRow>) {
      findByCalls.push(where);
      return users.find((u) => Object.entries(where).every(([k, v]) => (u as any)[k] === v)) ?? null;
    },
    async findOne(_c: 'users', id: string) {
      return users.find((u) => u.id === id && !u.deleted) ?? null;
    },
  } as unknown as DataStore & { findByCalls: Array<Partial<UserRow>> };
}

function user(over: Partial<UserRow> = {}): UserRow {
  return {
    id: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deleted: false,
    username: 'admin',
    passwordHash: hashSync('admin', 4),
    displayName: '系统管理员',
    role: 'admin',
    status: 'active',
    ...over,
  };
}

const jwt = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '1h' } });

describe('AuthService#login', () => {
  it('账密正确 -> 签发 token 且返回值不含 passwordHash', async () => {
    const store = makeStore([user()]);
    const svc = new AuthService(store, jwt);

    const { token, user: safe } = await svc.login('admin', 'admin');

    expect(token).toEqual(expect.any(String));
    expect((safe as any).passwordHash).toBeUndefined();
    expect(safe.username).toBe('admin');

    const payload = await jwt.verify(token);
    expect(payload).toMatchObject({ sub: 'u1', username: 'admin', role: 'admin' });
  });

  it('密码错误 -> 40101 统一文案，不泄露账号是否存在', async () => {
    const svc = new AuthService(makeStore([user()]), jwt);
    await expect(svc.login('admin', 'wrong')).rejects.toMatchObject({
      code: 40101,
      message: '账号或密码错误',
    });
  });

  it('账号不存在 -> 同样 40101，且仍执行一次 bcrypt 比较（防时序探测）', async () => {
    const store = makeStore([]);
    const svc = new AuthService(store, jwt);

    await expect(svc.login('ghost', 'x')).rejects.toMatchObject({ code: 40101 });
    expect(store.findByCalls).toHaveLength(1);
  });

  it('disabled 用户即使密码正确也拒绝登录', async () => {
    const svc = new AuthService(makeStore([user({ status: 'disabled' })]), jwt);
    await expect(svc.login('admin', 'admin')).rejects.toBeInstanceOf(BizException);
  });
});

describe('AuthService#profile / logout', () => {
  it('返回去掉 passwordHash 的用户信息', async () => {
    const svc = new AuthService(makeStore([user()]), jwt);
    const profile = await svc.profile('u1');
    expect((profile as any).passwordHash).toBeUndefined();
    expect(profile.displayName).toBe('系统管理员');
  });

  it('用户不存在 -> 40400', async () => {
    const svc = new AuthService(makeStore([user()]), jwt);
    await expect(svc.profile('nope')).rejects.toMatchObject({ code: 40400 });
  });

  it('logout 为语义占位，恒返回 success', () => {
    const svc = new AuthService(makeStore([]), jwt);
    expect(svc.logout()).toEqual({ success: true });
  });
});
