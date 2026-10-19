import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  MaxLength,
} from 'class-validator';
import { FOCUS_AREAS } from '../../common/session-options.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  slotId: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Please tell us your name.' })
  @MaxLength(80)
  name: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @MaxLength(254)
  email: string;

  @IsIn(FOCUS_AREAS)
  focus: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** IANA time zone of the person booking, used to format the email. */
  @IsOptional()
  @IsTimeZone()
  timeZone?: string;
}
