import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '../common';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserStatusDto } from './dto/update-status.dto';
import { UsersService } from './users.service';

@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  /** 用户列表（仅 admin） */
  @Get()
  findAll(@Query() q: QueryUserDto) {
    return this.svc.findAll(q);
  }

  /** 启用/禁用（仅 admin） */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.updateStatus(id, dto, user);
  }
}
