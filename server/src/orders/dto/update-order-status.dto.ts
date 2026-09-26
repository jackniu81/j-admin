import { IsIn } from 'class-validator';

/** PATCH /api/orders/:id/status（spec §6）—— 仅允许推进到合法目标状态，流转校验在 service */
export class UpdateOrderStatusDto {
  @IsIn(['pending', 'paid', 'completed', 'cancelled'])
  status!: 'pending' | 'paid' | 'completed' | 'cancelled';
}
