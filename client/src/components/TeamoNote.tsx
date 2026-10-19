import { useEffect, useState } from 'react';
import { api, type Confirmation } from '../api';

/** Asks the backend for Teamo's personal confirmation message. */
export function TeamoNote({ bookingId }: { bookingId: string }) {
  const [note, setNote] = useState<Confirmation | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .confirmation(bookingId)
      .then((c) => active && setNote(c))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [bookingId]);

  if (failed) return null;

  return (
    <div className="teamo" aria-live="polite">
      <div className="teamo-avatar" aria-hidden="true">T</div>
      <div className="teamo-bubble">
        <div className="teamo-name">
          Teamo <span>your AI assistant</span>
        </div>
        {note ? (
          <p className="teamo-text">{note.message}</p>
        ) : (
          <p className="teamo-typing">
            Writing you a note<span className="dots" />
          </p>
        )}
        {note && note.source !== 'fallback' && (
          <div className="teamo-credit">Written with Gemini</div>
        )}
      </div>
    </div>
  );
}
