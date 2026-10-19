import { Controller, Get } from '@nestjs/common';
import { DURATIONS, FOCUS_AREAS } from './common/session-options.js';
import { MailService } from './mail/mail.service.js';

@Controller()
export class HealthController {
  constructor(private readonly mail: MailService) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  /** Options the frontend renders, so the lists live in one place. */
  @Get('options')
  options() {
    return {
      durations: DURATIONS,
      focusAreas: FOCUS_AREAS,
      emailEnabled: this.mail.enabled,
    };
  }
}
