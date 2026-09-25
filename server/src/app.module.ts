import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AllExceptionsFilter, ResponseInterceptor } from './common';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { DataModule } from './data/data.module';
import { VersionModule } from './version/version.module';

@Module({
  imports: [AppConfigModule, DataModule, AuthModule, VersionModule],
  providers: [
    // 统一响应体 { code, message, data }（spec §4.3）
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    // 全局异常 -> 业务码（spec §4.3）
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // DTO 校验：白名单 + 禁止未知字段 + 类型转换
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
    },
  ],
})
export class AppModule {}
