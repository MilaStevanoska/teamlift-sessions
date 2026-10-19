import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { type Confirmation, TeamoService } from '../teamo/teamo.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';

const TAKEN =
  'Sorry, someone just booked this session. Please pick another time.';

type ConfirmationResult = Confirmation | { message: string; source: 'saved' };

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  /** In-flight Teamo requests, so the email and the page share one LLM call. */
  private readonly pending = new Map<string, Promise<ConfirmationResult>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly teamo: TeamoService,
    private readonly mail: MailService,
  ) {}

  // timeZone is only used for formatting messages, not stored.
  async create({ slotId, timeZone: _timeZone, ...details }: CreateBookingDto) {
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
  confirmation(id: string, timeZone = 'UTC') {
    let request = this.pending.get(id);
    if (!request) {
      request = this.generateConfirmation(id, timeZone).finally(() =>
        this.pending.delete(id),
      );
      this.pending.set(id, request);
    }
    return request;
  }

  /**
   * Emails the booker their confirmation, including Teamo's note. Runs in the
   * background after booking; failures are logged, never shown to the user.
   */
  async sendConfirmationEmail(id: string, timeZone = 'UTC') {
    if (!this.mail.enabled) return;
    try {
      const { message } = await this.confirmation(id, timeZone);
      const booking = await this.prisma.booking.findUniqueOrThrow({
        where: { id },
        include: { slot: true },
      });
      await this.mail.sendBookingConfirmation(booking, message, timeZone);
    } catch (error) {
      this.logger.error(
        `Confirmation email failed for ${id}: ${String(error)}`,
      );
    }
  }

  private async generateConfirmation(
    id: string,
    timeZone: string,
  ): Promise<ConfirmationResult> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { slot: true },
    });
    if (!booking) throw new NotFoundException('Booking not found.');

    if (booking.confirmationMessage) {
      return { message: booking.confirmationMessage, source: 'saved' };
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
