import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TeamoService } from '../teamo/teamo.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';

const TAKEN =
  'Sorry, someone just booked this session. Please pick another time.';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamo: TeamoService,
  ) {}

  async create({ slotId, ...details }: CreateBookingDto) {
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
      include: { booking: true },
    });
    if (!slot) throw new NotFoundException('That session no longer exists.');
    if (slot.startsAt <= new Date()) {
      throw new BadRequestException('This session has already started.');
    }
    if (slot.booking) throw new ConflictException(TAKEN);

    try {
      const booking = await this.prisma.booking.create({
        data: { slotId, ...details },
      });
      return { ...booking, slot };
    } catch (error) {
      // Two people raced for the same slot: the unique index on slotId
      // lets exactly one insert through and rejects the other here.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(TAKEN);
      }
      throw error;
    }
  }

  /**
   * Returns a personal confirmation from Teamo, generating it on first request
   * and storing it so refreshing doesn't spend more LLM calls.
   */
  async confirmation(id: string, timeZone = 'UTC') {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { slot: true },
    });
    if (!booking) throw new NotFoundException('Booking not found.');

    if (booking.confirmationMessage) {
      return { message: booking.confirmationMessage, source: 'saved' as const };
    }

    const result = await this.teamo.writeConfirmation(booking, timeZone);
    if (result.source === 'ai') {
      await this.prisma.booking.update({
        where: { id },
        data: { confirmationMessage: result.message },
      });
    }
    return result;
  }
}
