import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { BizException } from '../common/biz.exception';
import { SafeUser } from '../common/auth.types';
import { DATA_STORE, DataStore, UserRow } from '../data/data-store.interface';

/** 账号不存在与密码错误统一为此码/文案，不泄露账号是否存在（spec §5） */
const INVALID_CREDENTIALS = () => new BizException(40101, '账号或密码错误');

function sanitize(user: UserRow): SafeUser {
  const { passwordHash: _ignored, ...safe } = user;
  return safe;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATA_STORE) private readonly store: DataStore,
    private readonly jwt: JwtService,
  ) {}

  /** 校验账密 -> 签发 JWT（payload: sub / username / role） */
  async login(username: string, password: string): Promise<{ token: string; user: SafeUser }> {
    const user = await this.store.findBy('users', { username });
    // user 不存在也走一次 bcrypt 比较，避免通过响应时间探测账号存在性
    const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
    const ok = await compare(password, hash);
    if (!user || !ok) throw INVALID_CREDENTIALS();
    if (user.status === 'disabled') throw INVALID_CREDENTIALS();

    const token = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    return { token, user: sanitize(user) };
  }

  /** 当前登录用户信息（去掉敏感字段） */
  async profile(userId: string): Promise<SafeUser> {
    const user = await this.store.findOne('users', userId);
    if (!user) throw new BizException(40400, '用户不存在');
    return sanitize(user);
  }

  /** JWT 无状态，登出仅为语义占位（spec §5） */
  logout(): { success: boolean } {
    return { success: true };
  }
}
