import { IsOptional, IsTimeZone } from 'class-validator';

export class ConfirmationDto {
  /** IANA time zone of the person booking, so Teamo quotes their local time. */
  @IsOptional()
  @IsTimeZone()
  timeZone?: string;
}
