import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

/** GET /api/dashboard/trend 查询参数 */
export class TrendQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsIn([7, 14, 30])
  @IsOptional()
  days = 7;
}
