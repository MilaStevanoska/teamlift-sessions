import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { ConfirmationDto } from './dto/confirmation.dto.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  async create(@Body() dto: CreateBookingDto) {
    const { id, name, email, focus, slot } = await this.bookings.create(dto);
    // Not awaited: the booker gets their response without waiting on email.
    void this.bookings.sendConfirmationEmail(id, dto.timeZone);
    return {
      id,
      name,
      email,
      focus,
      startsAt: slot.startsAt,
      durationMinutes: slot.durationMinutes,
    };
  }

  /** The LLM endpoint: a short, personal confirmation written by Teamo. */
  @Post(':id/confirmation')
  @HttpCode(200)
  confirmation(@Param('id') id: string, @Body() dto: ConfirmationDto) {
    return this.bookings.confirmation(id, dto.timeZone);
  }
}
