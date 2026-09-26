import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PRODUCT_CATEGORIES } from './create-product.dto';

/** PATCH /api/products/:id 局部更新（spec §6）—— 所有字段可选 */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsIn(PRODUCT_CATEGORIES as unknown as string[])
  category?: (typeof PRODUCT_CATEGORIES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999999)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999999)
  stock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  image?: string;

  @IsOptional()
  @MaxLength(200)
  remark?: string;
}
