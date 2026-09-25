import { IsIn } from 'class-validator';

/** PATCH /api/users/:id/status（spec §6） */
export class UpdateUserStatusDto {
  @IsIn(['active', 'disabled'])
  status!: 'active' | 'disabled';
}
