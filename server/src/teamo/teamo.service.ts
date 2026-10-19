import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import type { Booking, Slot } from '../generated/prisma/client.js';

export type Confirmation = { message: string; source: 'ai' | 'fallback' };

const SYSTEM_PROMPT = `You are Teamo, the friendly AI assistant at TeamLift.
TeamLift trains "AI Champions" inside companies through 1:1 sessions with a human AI coach.
Someone just booked a coaching session. Write them a short confirmation:
- Greet them by first name and confirm the day and time exactly as given.
- Add two concrete, practical prep tips tailored to their session focus and note.
- Warm, encouraging and specific. No hype, no emojis, no markdown, no sign-off.
- At most 80 words.`;

/** Teamo writes the personal confirmation shown after someone books. */
@Injectable()
export class TeamoService {
  private readonly logger = new Logger(TeamoService.name);
  private readonly model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  private readonly ai = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { timeout: 15_000 },
      })
    : null;

  async writeConfirmation(
    booking: Booking & { slot: Slot },
    timeZone: string,
  ): Promise<Confirmation> {
    const when = formatWhen(booking.slot.startsAt, timeZone);
    const fallback: Confirmation = {
      message: fallbackMessage(booking, when),
      source: 'fallback',
    };
    if (!this.ai) return fallback;

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          `Name: ${booking.name}`,
          `When: ${when} (${booking.slot.durationMinutes} minutes)`,
          `Session focus: ${booking.focus}`,
          `Their note: ${booking.note || '(none)'}`,
        ].join('\n'),
        config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.7 },
      });
      const message = response.text?.trim();
      return message ? { message, source: 'ai' } : fallback;
    } catch (error) {
      this.logger.warn(`Gemini call failed, using fallback: ${String(error)}`);
      return fallback;
    }
  }
}

function formatWhen(date: Date, timeZone: string) {
  return date.toLocaleString('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function fallbackMessage(booking: Booking, when: string) {
  const firstName = booking.name.split(/\s+/)[0];
  return (
    `You're all set, ${firstName}! Your "${booking.focus}" session is on ${when}. ` +
    `To get the most out of it, pick one real task from your week you'd like AI to help with, ` +
    `and have the tools you already use open and ready to share.`
  );
}
