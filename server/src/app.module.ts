import { Module } from '@nestjs/common';
import { BookingsModule } from './bookings/bookings.module.js';
import { HealthController } from './health.controller.js';
import { MailModule } from './mail/mail.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SlotsModule } from './slots/slots.module.js';

@Module({
  imports: [PrismaModule, SlotsModule, BookingsModule, MailModule],
  controllers: [HealthController],
})
export class AppModule {}
