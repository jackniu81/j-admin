import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { BizException } from '../biz.exception';
import { UserRow } from '../../data/data-store.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * 角色守卫（spec §5）：读取 @Roles 元数据，当前用户角色不足 -> 40300（HTTP 403）。
 * 未标注 @Roles 的路由直接放行（是否已登录由 JwtAuthGuard 负责）。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRow['role'][]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = ctx.switchToHttp().getRequest<Request>().user;
    if (!user) {
      throw new BizException(40100, '登录已过期，请重新登录');
    }
    if (!required.includes(user.role)) {
      throw new BizException(40300, '无权限访问该资源');
    }
    return true;
  }
}
