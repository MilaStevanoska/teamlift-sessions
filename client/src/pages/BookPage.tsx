import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { api, ApiError, type Booking, type Slot } from '../api';
import { Icon } from '../components/Icon';
import { icons } from '../lib/icons';
import { LoadState } from '../components/LoadState';
import { TeamoNote } from '../components/TeamoNote';
import {
  formatDayMonth,
  formatLongDay,
  formatTime,
  groupByDay,
  relativeDay,
  timeZone,
} from '../lib/dates';
import { useAsync } from '../lib/useAsync';

type Step = { name: 'pick' } | { name: 'details'; slot: Slot } | { name: 'done'; booking: Booking };

/** Form input, kept here so it survives going back to pick another time. */
type Draft = { name: string; email: string; focus: string; note: string };
const emptyDraft: Draft = { name: '', email: '', focus: '', note: '' };

export function BookPage() {
  const load = useCallback(() => Promise.all([api.slots(), api.options()]), []);
  const state = useAsync(load);
  const [step, setStep] = useState<Step>({ name: 'pick' });
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const [slots, options] = state.data ?? [[], null];

  return (
    <div className="book-layout">
      <aside className="intro card">
        <p className="eyebrow">TeamLift · 1:1 coaching</p>
        <h1>
          Book time with your <em>AI coach</em>
        </h1>
        <p className="muted">
          Bring a real task from your week. Together you’ll turn it into a working AI solution
          you can reuse, using the tools your company already approved.
        </p>
        <ul className="meta-list">
          <li>
            <Icon d={icons.clock} /> 15–90 minute sessions
          </li>
          <li>
            <Icon d={icons.video} /> 1:1 video call with your coach
          </li>
          <li>
            <Icon d={icons.globe} /> Times shown in {timeZone.replace(/_/g, ' ')}
          </li>
        </ul>
      </aside>

      <section className="card book-main">
        {state.status !== 'ready' && !state.data ? (
          <LoadState
            slow={state.status === 'loading' && state.slow}
            error={state.status === 'error' ? state.error : undefined}
            onRetry={state.reload}
          />
        ) : step.name === 'done' ? (
          <Confirmed
            booking={step.booking}
            onAgain={() => setStep({ name: 'pick' })}
          />
        ) : step.name === 'details' && options ? (
          <DetailsForm
            slot={step.slot}
            focusAreas={options.focusAreas}
            draft={draft}
            onChange={setDraft}
            onBack={() => setStep({ name: 'pick' })}
            onBooked={(booking) => {
              setStep({ name: 'done', booking });
              setDraft((d) => ({ ...emptyDraft, name: d.name, email: d.email }));
              void state.reload();
            }}
            onTaken={(message) => {
              setNotice(message);
              setStep({ name: 'pick' });
              void state.reload();
            }}
          />
        ) : (
          <SlotPicker
            slots={slots}
            notice={notice}
            onPick={(slot) => {
              setNotice(null);
              setStep({ name: 'details', slot });
            }}
          />
        )}
      </section>
    </div>
  );
}

function SlotPicker({
  slots,
  notice,
  onPick,
}: {
  slots: Slot[];
  notice: string | null;
  onPick: (slot: Slot) => void;
}) {
  const days = useMemo(() => groupByDay(slots), [slots]);
  const firstOpenDay = days.find((d) => d.slots.some((s) => !s.isBooked))?.key;
  const [chosen, setChosen] = useState<string | undefined>();
  const selectedKey = days.some((d) => d.key === chosen) ? chosen : (firstOpenDay ?? days[0]?.key);
  const selected = days.find((d) => d.key === selectedKey);

  if (days.length === 0) {
    return (
      <div className="empty">
        <h2>No sessions published yet</h2>
        <p className="muted">Your coach hasn’t opened up any times. Check back soon.</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="step-title">Pick a day and time</h2>
      {notice && (
        <div className="banner banner-warn" role="alert">
          {notice}
        </div>
      )}
      {!firstOpenDay && (
        <div className="banner banner-warn">
          Every session is booked right now. Check back soon for new times.
        </div>
      )}

      <div className="day-strip" role="tablist" aria-label="Days with sessions">
        {days.map((day) => {
          const open = day.slots.filter((s) => !s.isBooked).length;
          return (
            <button
              key={day.key}
              role="tab"
              aria-selected={day.key === selectedKey}
              className="day-pill"
              onClick={() => setChosen(day.key)}
            >
              <span className="day-name">{relativeDay(day.date)}</span>
              <span className="day-date">{formatDayMonth(day.date)}</span>
              <span className={open ? 'day-count' : 'day-count full'}>
                {open ? `${open} open` : 'Full'}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <>
          <p className="day-heading">{formatLongDay(selected.date)}</p>
          <div className="slot-grid">
            {selected.slots.map((slot) => (
              <button
                key={slot.id}
                className="slot"
                disabled={slot.isBooked}
                onClick={() => onPick(slot)}
                aria-label={`${formatTime(slot.startsAt)}, ${slot.durationMinutes} minutes${slot.isBooked ? ', already booked' : ''}`}
              >
                <span className="slot-time">{formatTime(slot.startsAt)}</span>
                <span className="slot-sub">{slot.isBooked ? 'Booked' : `${slot.durationMinutes} min`}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function DetailsForm({
  slot,
  focusAreas,
  draft,
  onChange,
  onBack,
  onBooked,
  onTaken,
}: {
  slot: Slot;
  focusAreas: string[];
  draft: Draft;
  onChange: (draft: Draft) => void;
  onBack: () => void;
  onBooked: (b: Booking) => void;
  onTaken: (message: string) => void;
}) {
  const { name, email, note } = draft;
  const focus = draft.focus || focusAreas[0];
  const set = (field: keyof Draft) => (value: string) => onChange({ ...draft, [field]: value });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      onBooked(await api.book({ slotId: slot.id, name, email, focus, note: note || undefined }));
    } catch (err) {
      const apiErr = err as ApiError;
      // 409/404: the slot was taken or removed meanwhile, so go back to the list.
      if (apiErr.status === 409 || apiErr.status === 404) onTaken(apiErr.message);
      else setError(apiErr.message);
      setSubmitting(false);
    }
  }

  return (
    <form className="details" onSubmit={submit}>
      <button type="button" className="link-btn" onClick={onBack}>
        ← Change time
      </button>
      <div className="chosen">
        <div>
          <div className="chosen-day">{formatLongDay(slot.startsAt)}</div>
          <div className="chosen-time">
            {formatTime(slot.startsAt)} – {formatTime(slot.endsAt)}
          </div>
        </div>
        <span className="tag">{slot.durationMinutes} min</span>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Your name</span>
          <input
            required
            maxLength={80}
            autoComplete="name"
            value={name}
            onChange={(e) => set('name')(e.target.value)}
            placeholder="Ana Petrova"
          />
        </label>
        <label className="field">
          <span>Work email</span>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => set('email')(e.target.value)}
            placeholder="ana@company.com"
          />
        </label>
      </div>

      <fieldset className="field">
        <legend>What would you like to focus on?</legend>
        <div className="chips">
          {focusAreas.map((area) => (
            <label key={area} className="chip">
              <input
                type="radio"
                name="focus"
                value={area}
                checked={focus === area}
                onChange={() => set('focus')(area)}
              />
              <span>{area}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>
          Anything your coach should know? <em className="optional">optional</em>
        </span>
        <textarea
          rows={3}
          maxLength={500}
          value={note}
          onChange={(e) => set('note')(e.target.value)}
          placeholder="e.g. I spend 3 hours every Monday building the weekly sales report in Excel."
        />
      </label>

      {error && (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      )}

      <button className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? 'Booking…' : 'Confirm booking'}
      </button>
    </form>
  );
}

function Confirmed({ booking, onAgain }: { booking: Booking; onAgain: () => void }) {
  return (
    <div className="confirmed">
      <div className="check" aria-hidden="true">
        <Icon d={icons.check} size={28} />
      </div>
      <h2>You’re booked, {booking.name.split(' ')[0]}!</h2>
      <p className="muted">
        {formatLongDay(booking.startsAt)} at {formatTime(booking.startsAt)} ·{' '}
        {booking.durationMinutes} min · {booking.focus}
      </p>
      <TeamoNote bookingId={booking.id} />
      <button className="btn btn-secondary" onClick={onAgain}>
        Book another session
      </button>
    </div>
  );
}
