import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** GET /api/customers 查询参数（spec §6） */
export class QueryCustomerDto {
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

  @IsIn(['enabled', 'disabled'])
  @IsOptional()
  status?: string;

  @IsIn(['name', 'email', 'createdAt'])
  @IsOptional()
  sortBy?: string;

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
