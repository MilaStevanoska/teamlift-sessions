import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module.js';
import { TeamoModule } from '../teamo/teamo.module.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';

@Module({
  imports: [TeamoModule, MailModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
