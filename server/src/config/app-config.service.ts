import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvDto } from './env.dto';

/**
 * 类型化配置读取，屏蔽 ConfigService 的字符串 key 取值，避免散落的魔法字符串。
 * 值已由 validateEnv 校验并填充默认值，这里可安全断言类型。
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<EnvDto, true>) {}

  get dbDriver(): 'file' | 'postgres' {
    return this.config.get('DB_DRIVER', { infer: true });
  }

  get dbFile(): string {
    return this.config.get('DB_FILE', { infer: true });
  }

  get pgHost(): string {
    return this.config.get('PG_HOST', { infer: true });
  }

  get pgPort(): number {
    return this.config.get('PG_PORT', { infer: true });
  }

  get pgUser(): string {
    return this.config.get('PG_USER', { infer: true });
  }

  get pgPassword(): string | undefined {
    return this.config.get('PG_PASSWORD', { infer: true });
  }

  get pgDatabase(): string {
    return this.config.get('PG_DATABASE', { infer: true });
  }

  get jwtSecret(): string {
    return this.config.get('JWT_SECRET', { infer: true });
  }

  get jwtExpiresIn(): string {
    return this.config.get('JWT_EXPIRES_IN', { infer: true });
  }

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }
}
