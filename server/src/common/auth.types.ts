import { UserRow } from '../data/data-store.interface';

/** 登录 / 对外返回的用户视图：去掉 passwordHash 等敏感字段 */
export type SafeUser = Omit<UserRow, 'passwordHash'>;

/** JWT payload（spec §5） */
export interface AuthUser {
  sub: string;
  username: string;
  role: UserRow['role'];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
