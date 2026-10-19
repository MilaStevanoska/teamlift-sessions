import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MAX_DURATION } from '../common/session-options.js';
import { CreateSlotDto } from './dto/create-slot.dto.js';

const MINUTE = 60_000;

type SlotWithBooking = Awaited<
  ReturnType<SlotsService['findUpcoming']>
>[number];

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Slots that haven't ended yet, soonest first. */
  async findUpcoming() {
    const now = new Date();
    const slots = await this.prisma.slot.findMany({
      where: {
        startsAt: { gt: new Date(now.getTime() - MAX_DURATION * MINUTE) },
      },
      include: { booking: true },
      orderBy: { startsAt: 'asc' },
    });
    return slots.filter((s) => endOf(s) > now);
  }

  async create(dto: CreateSlotDto) {
    const first = new Date(dto.startsAt);
    if (first <= new Date()) {
      throw new BadRequestException('Sessions must start in the future.');
    }

    const count = dto.count ?? 1;
    const length = dto.durationMinutes * MINUTE;
    const starts = Array.from(
      { length: count },
      (_, i) => new Date(first.getTime() + i * length),
    );
    const lastEnd = new Date(first.getTime() + count * length);

    return this.prisma.$transaction(async (tx) => {
      // Any existing slot that could overlap must start within this window.
      const nearby = await tx.slot.findMany({
        where: {
          startsAt: {
            gt: new Date(first.getTime() - MAX_DURATION * MINUTE),
            lt: lastEnd,
          },
        },
      });
      const clash = nearby.find(
        (s) => s.startsAt < lastEnd && endOf(s) > first,
      );
      if (clash) {
        throw new ConflictException(
          'This overlaps a session you already published.',
        );
      }

      await tx.slot.createMany({
        data: starts.map((startsAt) => ({
          startsAt,
          durationMinutes: dto.durationMinutes,
        })),
      });
      return tx.slot.findMany({
        where: { startsAt: { gte: first, lt: lastEnd } },
        orderBy: { startsAt: 'asc' },
      });
    });
  }

  async remove(id: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id },
      include: { booking: true },
    });
    if (!slot) throw new NotFoundException('Session not found.');
    if (slot.booking) {
      throw new ConflictException(
        'This session is already booked and can’t be removed.',
      );
    }
    await this.prisma.slot.delete({ where: { id } });
  }

  /** Public shape: whether a slot is taken, but not by whom. */
  static toPublic(slot: SlotWithBooking) {
    return {
      id: slot.id,
      startsAt: slot.startsAt,
      endsAt: endOf(slot),
      durationMinutes: slot.durationMinutes,
      isBooked: slot.booking !== null,
    };
  }

  /** Instructor shape: includes who booked and what they want to work on. */
  static toHost(slot: SlotWithBooking) {
    const { booking } = slot;
    return {
      ...SlotsService.toPublic(slot),
      booking: booking && {
        name: booking.name,
        email: booking.email,
        focus: booking.focus,
        note: booking.note,
        bookedAt: booking.createdAt,
      },
    };
  }
}

function endOf(slot: { startsAt: Date; durationMinutes: number }) {
  return new Date(slot.startsAt.getTime() + slot.durationMinutes * MINUTE);
}
