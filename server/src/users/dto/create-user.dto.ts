import { IsIn, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** 新建用户入参（仅 admin 可调用） */
export class CreateUserDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,20}$/, { message: '用户名需为3-20位字母、数字或下划线' })
  username: string;

  @IsString()
  @MinLength(6, { message: '密码至少6位' })
  @MaxLength(30, { message: '密码不能超过30位' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: '显示名不能为空' })
  @MaxLength(30, { message: '显示名不能超过30位' })
  displayName: string;

  @IsIn(['admin', 'user'], { message: '角色只能是 admin 或 user' })
  role: 'admin' | 'user';
}
