/** All times are shown in the viewer's own time zone; the API stores UTC. */
export const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const dayMonth = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const longDay = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export const formatTime = (iso: string | Date) => time.format(new Date(iso));
export const formatWeekday = (iso: string | Date) => weekday.format(new Date(iso));
export const formatDayMonth = (iso: string | Date) => dayMonth.format(new Date(iso));
export const formatLongDay = (iso: string | Date) => longDay.format(new Date(iso));

/** Local calendar day key, e.g. "2026-10-26". */
export function dayKey(iso: string | Date) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function relativeDay(iso: string | Date) {
  const key = dayKey(iso);
  const today = new Date();
  if (key === dayKey(today)) return 'Today';
  today.setDate(today.getDate() + 1);
  if (key === dayKey(today)) return 'Tomorrow';
  return formatWeekday(iso);
}

/** Groups items by local calendar day, preserving order. */
export function groupByDay<T extends { startsAt: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = dayKey(item.startsAt);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].map(([key, slots]) => ({ key, date: slots[0].startsAt, slots }));
}

const pad = (n: number) => String(n).padStart(2, '0');
