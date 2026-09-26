import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

/** GET /api/reports/* 通用时间范围参数（近 7/14/30 天，默认 30） */
export class ReportQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsIn([7, 14, 30])
  @IsOptional()
  days = 30;
}
