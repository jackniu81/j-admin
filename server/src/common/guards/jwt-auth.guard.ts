import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { BizException } from '../biz.exception';
import { AuthUser } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 全局 JWT 守卫（spec §5）：@Public 放行；否则校验 `Authorization: Bearer <token>`。
 * token 缺失 / 格式错误 / 过期 / 签名不符 -> 统一 40100（HTTP 401），文案「登录已过期，请重新登录」。
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);
    if (!token) {
      throw new BizException(40100, '登录已过期，请重新登录');
    }
    try {
      req.user = await this.jwt.verifyAsync<AuthUser>(token);
    } catch {
      throw new BizException(40100, '登录已过期，请重新登录');
    }
    return true;
  }

  private extractToken(req: Request): string | undefined {
    const raw = req.headers.authorization;
    if (!raw) return undefined;
    const [type, token] = raw.split(' ');
    return type?.toLowerCase() === 'bearer' ? token : undefined;
  }
}
