import { IsIn } from 'class-validator';

/** PATCH /api/products/:id/status（上下架，spec §7.3） */
export class UpdateProductStatusDto {
  @IsIn(['on', 'off'])
  status!: 'on' | 'off';
}
