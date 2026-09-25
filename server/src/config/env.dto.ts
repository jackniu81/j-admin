import { plainToInstance } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';

/**
 * 环境变量校验（spec §3.1）。
 * 带默认值 -> file 模式零配置即可启动；enableImplicitConversion 让数字/布尔字符串自动转型。
 */
export class EnvDto {
  @IsIn(['file', 'postgres'])
  DB_DRIVER: 'file' | 'postgres' = 'file';

  @IsString()
  DB_FILE: string = './data/db.json';

  @IsString()
  @IsOptional()
  PG_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PG_PORT: number = 5432;

  @IsString()
  @IsOptional()
  PG_USER: string = 'postgres';

  @IsString()
  @IsOptional()
  PG_PASSWORD?: string;

  @IsString()
  @IsOptional()
  PG_DATABASE: string = 'j_admin';

  @IsString()
  JWT_SECRET: string = 'dev-secret-change-me';

  @IsString()
  JWT_EXPIRES_IN: string = '2h';

  @IsInt()
  @Min(1)
  @IsOptional()
  PORT: number = 3000;
}

/**
 * ConfigModule 的 validate 回调：校验失败或 postgres 缺密码时直接抛错，让进程 fail fast。
 */
export function validateEnv(config: Record<string, unknown>): EnvDto {
  const validated = plainToInstance(EnvDto, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const detail = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('; ');
    throw new Error(`环境变量配置错误 -> ${detail}`);
  }

  if (validated.DB_DRIVER === 'postgres' && !validated.PG_PASSWORD) {
    throw new Error('环境变量配置错误 -> DB_DRIVER=postgres 时 PG_PASSWORD 必填');
  }

  return validated;
}
