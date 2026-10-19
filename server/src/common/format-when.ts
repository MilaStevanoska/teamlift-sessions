/** e.g. "Tuesday, October 20 at 11:00 AM GMT+2", in the booker's time zone. */
export function formatWhen(date: Date, timeZone: string) {
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
