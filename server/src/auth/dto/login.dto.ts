import { IsNotEmpty, IsString } from 'class-validator';

/** 登录入参（spec §6） */
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
