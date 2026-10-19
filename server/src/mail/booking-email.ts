import { formatWhen } from '../common/format-when.js';
import type { Booking, Slot } from '../generated/prisma/client.js';

type Input = {
  booking: Booking & { slot: Slot };
  teamoMessage: string;
  timeZone: string;
};

/** Subject, HTML and plain-text versions of the booking confirmation email. */
export function bookingEmail({ booking, teamoMessage, timeZone }: Input) {
  const when = formatWhen(booking.slot.startsAt, timeZone);
  const firstName = booking.name.split(/\s+/)[0];
  const details: [string, string][] = [
    ['When', when],
    ['Length', `${booking.slot.durationMinutes} minutes`],
    ['Focus', booking.focus],
    ...(booking.note ? [['Your note', booking.note] as [string, string]] : []),
  ];

  const subject = `You're booked: ${when}`;

  const text = [
    `Hi ${firstName},`,
    '',
    'Your 1:1 AI coaching session is confirmed.',
    '',
    ...details.map(([label, value]) => `${label}: ${value}`),
    '',
    `A note from Teamo, your AI assistant:`,
    teamoMessage,
    '',
    '—',
    'TeamLift Sessions · a demo app built for the TeamLift internship challenge',
  ].join('\n');

  const rows = details
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 0;color:#5b6680;width:90px;vertical-align:top">${label}</td>
          <td style="padding:6px 0;color:#16213a;font-weight:600">${escape(value)}</td>
        </tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px 12px;background:#f5f6fa;font-family:Inter,Segoe UI,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e3e7ef;border-radius:14px;overflow:hidden">
      <tr>
        <td style="background:#0e1f3f;padding:18px 24px;color:#ffffff;font-weight:700;font-size:16px">
          TeamLift <span style="font-weight:400;opacity:.7">Sessions</span>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 24px 8px">
          <h1 style="margin:0 0 6px;font-size:22px;color:#0e1f3f">You’re booked, ${escape(firstName)}!</h1>
          <p style="margin:0 0 16px;color:#5b6680">Your 1:1 AI coaching session is confirmed.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px">${rows}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px 28px">
          <div style="background:#f5f6fa;border:1px solid #e3e7ef;border-radius:4px 14px 14px 14px;padding:14px 16px">
            <div style="font-size:13px;font-weight:700;color:#0e1f3f;margin-bottom:4px">
              Teamo <span style="font-weight:400;color:#5b6680">your AI assistant</span>
            </div>
            <div style="font-size:14px;line-height:1.5;color:#16213a;white-space:pre-line">${escape(teamoMessage)}</div>
          </div>
        </td>
      </tr>
    </table>
    <p style="max-width:520px;margin:16px auto 0;text-align:center;font-size:12px;color:#8a93a8">
      TeamLift Sessions is a demo app built for the TeamLift internship challenge.
    </p>
  </body>
</html>`;

  return { subject, html, text };
}

function escape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
