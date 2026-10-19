import { Injectable, Logger } from '@nestjs/common';
import type { Booking, Slot } from '../generated/prisma/client.js';
import { bookingEmail } from './booking-email.js';

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Sends transactional email through Brevo's HTTP API. (Render's free tier
 * blocks outbound SMTP, so an HTTP API is used instead of nodemailer.)
 * Disabled unless BREVO_API_KEY and MAIL_FROM are set.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey = process.env.BREVO_API_KEY;
  private readonly from = process.env.MAIL_FROM;
  private readonly fromName =
    process.env.MAIL_FROM_NAME || 'TeamLift Sessions (demo)';

  get enabled() {
    return Boolean(this.apiKey && this.from);
  }

  async sendBookingConfirmation(
    booking: Booking & { slot: Slot },
    teamoMessage: string,
    timeZone: string,
  ) {
    if (!this.apiKey || !this.from) return;

    const { subject, html, text } = bookingEmail({
      booking,
      teamoMessage,
      timeZone,
    });
    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: this.fromName, email: this.from },
        to: [{ email: booking.email, name: booking.name }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      throw new Error(`Brevo responded ${res.status}: ${await res.text()}`);
    }
    this.logger.log(`Confirmation email sent for booking ${booking.id}`);
  }
}
