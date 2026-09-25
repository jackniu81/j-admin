import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigService } from '../config/app-config.service';
import { JwtAuthGuard, RolesGuard } from '../common';
import { DataModule } from '../data/data.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * 认证模块（spec §5）。
 * "simple auth"：用 @nestjs/jwt 直接签发/校验，不引入 Passport；
 * 全局守卫在此注册（APP_GUARD 全局生效），顺序：先 JwtAuthGuard 再 RolesGuard。
 */
@Module({
  imports: [
    DataModule,
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (cfg: AppConfigService) => ({
        secret: cfg.jwtSecret,
        // expiresIn 为 ms 模板字面量类型，env 读入的是普通 string，做一次断言
        signOptions: { expiresIn: cfg.jwtExpiresIn as unknown as number },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: JwtAuthGuard }, { provide: APP_GUARD, useClass: RolesGuard }],
  exports: [AuthService],
})
export class AuthModule {}
