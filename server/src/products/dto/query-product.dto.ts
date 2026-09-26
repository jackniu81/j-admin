import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** GET /api/products 查询参数（spec §6）。分类经 keyword 命中（KEYWORD_FIELDS 含 category） */
export class QueryProductDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize = 10;

  @IsString()
  @IsOptional()
  keyword?: string;

  @IsIn(['on', 'off'])
  @IsOptional()
  status?: string;

  @IsIn(['name', 'price', 'stock', 'createdAt'])
  @IsOptional()
  sortBy?: string;

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
