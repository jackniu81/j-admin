import { SetMetadata } from '@nestjs/common';
import { UserRow } from '../../data/data-store.interface';

export const ROLES_KEY = 'roles';

/** 声明访问所需角色，配合 RolesGuard；不足返回 40300（spec §5） */
export const Roles = (...roles: UserRow['role'][]) => SetMetadata(ROLES_KEY, roles);
