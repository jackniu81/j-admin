import { Inject, Injectable } from '@nestjs/common';
import { BizException } from '../common/biz.exception';
import { SafeUser } from '../common/auth.types';
import { AuthUser } from '../common/auth.types';
import { DATA_STORE, DataStore, UserRow } from '../data/data-store.interface';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserStatusDto } from './dto/update-status.dto';

function sanitize(u: UserRow): SafeUser {
  const { passwordHash: _, ...safe } = u;
  return safe as SafeUser;
}

@Injectable()
export class UsersService {
  constructor(@Inject(DATA_STORE) private readonly store: DataStore) {}

  /** 分页列表（去掉 passwordHash） */
  async findAll(q: QueryUserDto) {
    const { list, total } = await this.store.find('users', {
      keyword: q.keyword,
      sortBy: q.sortBy as any,
      sortOrder: q.sortOrder,
      page: q.page,
      pageSize: q.pageSize,
    });
    return { list: (list as UserRow[]).map(sanitize), total, page: q.page, pageSize: q.pageSize };
  }

  /**
   * 切换启用/禁用（spec 保护规则）：
   * - 不允许禁用自己
   * - 不允许禁用最后一个活跃 admin
   */
  async updateStatus(id: string, dto: UpdateUserStatusDto, currentUser: AuthUser) {
    const target = await this.store.findOne('users', id);
    if (!target || target.deleted) throw new BizException(40400, '用户不存在');

    if (dto.status === 'disabled') {
      if (id === currentUser.sub) {
        throw new BizException(40900, '不能禁用自己的账号');
      }
      if (target.role === 'admin' && target.status === 'active') {
        const activeAdmins = await this.store.count('users', { role: 'admin', status: 'active' } as Partial<UserRow>);
        if (activeAdmins <= 1) {
          throw new BizException(40900, '不能禁用最后一个管理员');
        }
      }
    }
    const updated = await this.store.update('users', id, { status: dto.status } as Partial<UserRow>);
    return sanitize(updated);
  }
}
