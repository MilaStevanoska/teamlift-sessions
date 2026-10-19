/** Session lengths the instructor can offer, in minutes. */
export const DURATIONS = [15, 30, 45, 60, 90] as const;
export const MAX_DURATION = Math.max(...DURATIONS);

/** What an AI Champion can pick as the focus of their coaching session. */
export const FOCUS_AREAS = [
  'Map my workflows',
  'Build an automation',
  'Prompting deep-dive',
  'Review my AI solution',
  'Something else',
] as const;
