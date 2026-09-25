import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** PATCH /api/customers/:id 局部更新（spec §6）—— 所有字段可选 */
export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^\d{11}$/, { message: 'phone 必须是 11 位手机号' })
  phone?: string;

  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: 'enabled' | 'disabled';

  @IsOptional()
  @MaxLength(200)
  remark?: string;
}
