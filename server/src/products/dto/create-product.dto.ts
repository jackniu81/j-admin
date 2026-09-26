import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** 商品分类枚举（与 data-store ProductCategory 对齐） */
export const PRODUCT_CATEGORIES = [
  '数码配件',
  '家居用品',
  '服装鞋帽',
  '美妆个护',
  '食品生鲜',
] as const;

/** POST /api/products 新增（spec §7.3） */
export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name!: string;

  @IsIn(PRODUCT_CATEGORIES as unknown as string[])
  category!: (typeof PRODUCT_CATEGORIES)[number];

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999999)
  price!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999999)
  stock!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  image?: string; // 上传接口返回的相对 URL，如 /uploads/2026-09/xxx.png

  @IsIn(['on', 'off'])
  status!: 'on' | 'off';

  @IsOptional()
  @MaxLength(200)
  remark?: string;
}
