type Props = { slow?: boolean; error?: string; onRetry?: () => void };

/** Loading and error placeholder shared by both pages. */
export function LoadState({ slow, error, onRetry }: Props) {
  if (error) {
    return (
      <div className="load-state">
        <p>{error}</p>
        {onRetry && (
          <button className="btn btn-secondary" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="load-state" aria-busy="true">
      <span className="spinner" />
      <p>{slow ? 'Waking up the server… free hosting can take up to a minute.' : 'Loading sessions…'}</p>
    </div>
  );
}
