// End-to-end smoke test for the API. Run it against a local, throwaway database:
//   npm run start:dev      (in one terminal)
//   npm run smoke          (in another)
// It creates sessions on a random future day, so it can be run repeatedly.

const API = (process.env.API_URL ?? 'http://localhost:3000') + '/api';

const call = async (method, path, body) => {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

let failures = 0;
const check = (label, ok, details) => {
  if (!ok) failures++;
  console.log(ok ? '  ✓' : '  ✗', label, ok ? '' : JSON.stringify(details));
};

const base = new Date();
base.setUTCDate(base.getUTCDate() + 30 + Math.floor(Math.random() * 300));
base.setUTCHours(9, 0, 0, 0);
const iso = (offsetMinutes) =>
  new Date(base.getTime() + offsetMinutes * 60_000).toISOString();

console.log('Slots');
const created = await call('POST', '/slots', {
  startsAt: iso(0),
  durationMinutes: 60,
  count: 3,
});
check(
  'creates 3 back-to-back sessions',
  created.status === 201 && created.body.length === 3,
  created,
);
check(
  'rejects an overlapping session',
  (await call('POST', '/slots', { startsAt: iso(30), durationMinutes: 30 }))
    .status === 409,
);
check(
  'rejects a session in the past',
  (
    await call('POST', '/slots', {
      startsAt: new Date(Date.now() - 60_000).toISOString(),
      durationMinutes: 30,
    })
  ).status === 400,
);
check(
  'rejects an unsupported duration',
  (await call('POST', '/slots', { startsAt: iso(600), durationMinutes: 17 }))
    .status === 400,
);

console.log('Bookings');
const slotId = created.body[0].id;
const booking = (i) => ({
  slotId,
  name: `Champion ${i}`,
  email: `c${i}@example.com`,
  focus: 'Build an automation',
  note: 'Automate the weekly report',
});
check(
  'rejects an invalid email',
  (await call('POST', '/bookings', { ...booking(0), email: 'nope' })).status ===
    400,
);

const race = await Promise.all(
  Array.from({ length: 10 }, (_, i) => call('POST', '/bookings', booking(i))),
);
const wins = race.filter((r) => r.status === 201);
const conflicts = race.filter((r) => r.status === 409);
check(
  '10 simultaneous bookings → exactly 1 succeeds, 9 get 409',
  wins.length === 1 && conflicts.length === 9,
  race.map((r) => r.status),
);

const listed = (await call('GET', '/slots')).body.find((s) => s.id === slotId);
check(
  'public list marks the slot booked without exposing who',
  listed.isBooked && !('booking' in listed),
  listed,
);
const hosted = (await call('GET', '/slots?view=host')).body.find(
  (s) => s.id === slotId,
);
check(
  'instructor view shows who booked',
  hosted.booking?.name === wins[0].body.name,
  hosted,
);

check(
  'a booked session cannot be removed',
  (await call('DELETE', `/slots/${slotId}`)).status === 409,
);
check(
  'an open session can be removed',
  (await call('DELETE', `/slots/${created.body[2].id}`)).status === 204,
);

console.log('Teamo');
const note = await call('POST', `/bookings/${wins[0].body.id}/confirmation`, {
  timeZone: 'Europe/Skopje',
});
check(
  'returns a confirmation message',
  note.status === 200 && note.body.message.length > 20,
  note,
);
console.log(`    [${note.body.source}] ${note.body.message}`);
check(
  'rejects an invalid time zone',
  (
    await call('POST', `/bookings/${wins[0].body.id}/confirmation`, {
      timeZone: 'Mars/Base',
    })
  ).status === 400,
);

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
