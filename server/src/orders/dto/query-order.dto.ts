import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

/** GET /api/orders 查询参数（spec §6） */
export class QueryOrderDto {
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

  @IsIn(['pending', 'paid', 'completed', 'cancelled'])
  @IsOptional()
  status?: string;

  @IsIn(['orderNo', 'amount', 'createdAt'])
  @IsOptional()
  sortBy?: string;

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @Matches(/^\d{4}-\d{2}-\d{2}/, { message: 'from 需为 YYYY-MM-DD 或 ISO 时间' })
  @IsOptional()
  from?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}/, { message: 'to 需为 YYYY-MM-DD 或 ISO 时间' })
  @IsOptional()
  to?: string;
}
