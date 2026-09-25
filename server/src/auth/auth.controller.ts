import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthUser, CurrentUser, Public } from '../common';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** 登录（公开） */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  /** 当前用户信息（需登录） */
  @Get('profile')
  profile(@CurrentUser() user: AuthUser | undefined) {
    return this.auth.profile(user!.sub);
  }

  /** 登出（语义占位） */
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout() {
    return this.auth.logout();
  }
}
