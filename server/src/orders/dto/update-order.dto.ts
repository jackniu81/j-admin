import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { OrderItemInputDto } from './create-order.dto';

/** PATCH /api/orders/:id 编辑（客户 / 明细 / 备注，局部更新，所有字段可选） */
export class UpdateOrderDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: '至少选择一件商品' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items?: OrderItemInputDto[];

  @IsOptional()
  @MaxLength(200)
  remark?: string;
}
