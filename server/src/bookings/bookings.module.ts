import { Module } from '@nestjs/common';
import { TeamoModule } from '../teamo/teamo.module.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';

@Module({
  imports: [TeamoModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
