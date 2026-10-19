import { Controller, Get } from '@nestjs/common';
import { DURATIONS, FOCUS_AREAS } from './common/session-options.js';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { ok: true };
  }

  /** Options the frontend renders, so the lists live in one place. */
  @Get('options')
  options() {
    return { durations: DURATIONS, focusAreas: FOCUS_AREAS };
  }
}
