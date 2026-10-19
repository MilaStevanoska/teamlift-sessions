import { useCallback, useState, type FormEvent } from 'react';
import { api, type HostSlot } from '../api';
import { Icon } from '../components/Icon';
import { icons } from '../lib/icons';
import { LoadState } from '../components/LoadState';
import { dayKey, formatLongDay, formatTime, groupByDay, relativeDay } from '../lib/dates';
import { useAsync } from '../lib/useAsync';

export function HostPage() {
  const load = useCallback(() => Promise.all([api.hostSlots(), api.options()]), []);
  const state = useAsync(load);
  const [slots, options] = state.data ?? [[], null];
  const booked = slots.filter((s) => s.isBooked).length;

  return (
    <div className="host-layout">
      <section className="card host-form">
        <p className="eyebrow">Instructor</p>
        <h1>
          Publish your <em>availability</em>
        </h1>
        {options ? (
          <PublishForm durations={options.durations} onPublished={state.reload} />
        ) : (
          <LoadState
            slow={state.status === 'loading' && state.slow}
            error={state.status === 'error' ? state.error : undefined}
            onRetry={state.reload}
          />
        )}
      </section>

      <section className="card host-list">
        <div className="list-head">
          <h2>Upcoming sessions</h2>
          {state.data && (
            <div className="stats">
              <span className="stat">
                <b>{slots.length - booked}</b> open
              </span>
              <span className="stat stat-booked">
                <b>{booked}</b> booked
              </span>
            </div>
          )}
        </div>
        {state.data && slots.length === 0 ? (
          <div className="empty">
            <p className="muted">Nothing published yet. Add your first session on the left.</p>
          </div>
        ) : (
          groupByDay(slots).map((day) => (
            <div key={day.key} className="host-day">
              <h3>
                {relativeDay(day.date)} <span>{formatLongDay(day.date)}</span>
              </h3>
              <ul>
                {day.slots.map((slot) => (
                  <SessionRow key={slot.id} slot={slot} onChange={state.reload} />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function PublishForm({
  durations,
  onPublished,
}: {
  durations: number[];
  onPublished: () => void;
}) {
  const [today] = useState(() => dayKey(new Date()));
  const [date, setDate] = useState(() => dayKey(new Date(Date.now() + 864e5)));
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Parsed in the browser's local time zone, then sent to the API as UTC.
  const first = new Date(`${date}T${time}`);
  const valid = !Number.isNaN(first.getTime());
  const preview = valid
    ? Array.from({ length: count }, (_, i) => new Date(first.getTime() + i * duration * 60_000))
    : [];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const created = await api.createSlots({
        startsAt: first.toISOString(),
        durationMinutes: duration,
        count,
      });
      setMessage({
        kind: 'ok',
        text: `Published ${created.length} session${created.length > 1 ? 's' : ''}.`,
      });
      onPublished();
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field-row">
        <label className="field">
          <span>Date</span>
          <input
            type="date"
            required
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Start time</span>
          <input
            type="time"
            required
            step={900}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
      </div>

      <fieldset className="field">
        <legend>Session length</legend>
        <div className="segmented">
          {durations.map((d) => (
            <label key={d}>
              <input
                type="radio"
                name="duration"
                checked={duration === d}
                onChange={() => setDuration(d)}
              />
              <span>{d} min</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <span id="count-label">Back-to-back sessions</span>
        <div className="stepper" role="group" aria-labelledby="count-label">
          <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} disabled={count <= 1} aria-label="Fewer">
            −
          </button>
          <output aria-live="polite">{count}</output>
          <button type="button" onClick={() => setCount((c) => Math.min(8, c + 1))} disabled={count >= 8} aria-label="More">
            +
          </button>
        </div>
      </div>

      {preview.length > 0 && (
        <div className="preview">
          <span className="preview-label">You’ll publish</span>
          <div className="preview-times">
            {preview.map((p) => (
              <span key={p.getTime()} className="tag">
                {formatTime(p)} – {formatTime(new Date(p.getTime() + duration * 60_000))}
              </span>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div className={`banner ${message.kind === 'ok' ? 'banner-ok' : 'banner-error'}`} role="status">
          {message.text}
        </div>
      )}

      <button className="btn btn-primary btn-block" disabled={busy || !valid}>
        {busy ? 'Publishing…' : `Publish ${count} session${count > 1 ? 's' : ''}`}
      </button>
    </form>
  );
}

function SessionRow({ slot, onChange }: { slot: HostSlot; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const { booking } = slot;

  async function remove() {
    setBusy(true);
    try {
      await api.deleteSlot(slot.id);
    } catch (err) {
      alert((err as Error).message);
    }
    onChange();
  }

  return (
    <li className={booking ? 'session booked' : 'session'}>
      <div className="session-time">
        <b>{formatTime(slot.startsAt)}</b>
        <span>{slot.durationMinutes} min</span>
      </div>
      {booking ? (
        <div className="session-body">
          <div className="session-who">
            <b>{booking.name}</b>
            <a href={`mailto:${booking.email}`}>
              <Icon d={icons.mail} size={14} /> {booking.email}
            </a>
          </div>
          <span className="tag tag-accent">{booking.focus}</span>
          {booking.note && <p className="session-note">“{booking.note}”</p>}
        </div>
      ) : (
        <div className="session-body session-open">
          <span className="tag">Open</span>
          <button className="icon-btn" onClick={remove} disabled={busy} aria-label="Remove session" title="Remove session">
            <Icon d={icons.trash} size={16} />
          </button>
        </div>
      )}
    </li>
  );
}
