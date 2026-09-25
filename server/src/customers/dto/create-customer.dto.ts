import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** POST /api/customers 新增（spec §3.3 / §6） */
export class CreateCustomerDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  name!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsOptional()
  @Matches(/^\d{11}$/, { message: 'phone 必须是 11 位手机号' })
  phone?: string;

  @IsNotEmpty()
  @IsIn(['enabled', 'disabled'])
  status!: 'enabled' | 'disabled';

  @IsOptional()
  @MaxLength(200)
  remark?: string;
}
