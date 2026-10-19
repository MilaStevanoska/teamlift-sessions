import { IsIn, IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';
import { DURATIONS } from '../../common/session-options.js';

export class CreateSlotDto {
  /** Start of the first session, as an ISO 8601 timestamp with offset. */
  @IsISO8601({ strict: true })
  startsAt: string;

  @IsIn(DURATIONS)
  durationMinutes: number;

  /** Create this many back-to-back sessions in one go. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  count?: number;
}
