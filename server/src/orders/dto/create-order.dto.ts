import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** 明细入参：前端只提交商品 id 与数量，单价 / 名称由后端按商品表解析，防止篡改 */
export class OrderItemInputDto {
  @IsNotEmpty()
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty!: number;
}

/** POST /api/orders 新增 */
export class CreateOrderDto {
  @IsNotEmpty()
  @IsString()
  customerId!: string;

  @IsArray()
  @ArrayMinSize(1, { message: '至少选择一件商品' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];

  @IsOptional()
  @IsString()
  @MaxLength(30)
  orderNo?: string; // 留空由后端自动生成

  @IsOptional()
  @IsIn(['pending', 'paid', 'completed', 'cancelled'])
  status?: 'pending' | 'paid' | 'completed' | 'cancelled';

  @IsOptional()
  @MaxLength(200)
  remark?: string;
}
