import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** 标记免鉴权路由（如登录、version、静态资源），跳过全局 JwtAuthGuard（spec §5） */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
