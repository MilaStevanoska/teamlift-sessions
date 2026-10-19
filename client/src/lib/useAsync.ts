import { useCallback, useEffect, useState } from 'react';

type State<T> =
  | { status: 'loading'; data?: T; slow: boolean }
  | { status: 'ready'; data: T }
  | { status: 'error'; data?: T; error: string };

/**
 * Loads data and exposes `reload`. Flags `slow` after a few seconds, since the
 * free hosting tier sleeps and the first request can take a while.
 * Also refreshes when the tab regains focus, so availability stays current.
 */
export function useAsync<T>(load: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ status: 'loading', slow: false });

  const reload = useCallback(async () => {
    const timer = setTimeout(
      () => setState((s) => (s.status === 'loading' ? { ...s, slow: true } : s)),
      4000,
    );
    try {
      const data = await load();
      setState({ status: 'ready', data });
    } catch (e) {
      setState((s) => ({ status: 'error', data: s.data, error: (e as Error).message }));
    } finally {
      clearTimeout(timer);
    }
  }, [load]);

  useEffect(() => {
    void reload();
    const onFocus = () => void reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);

  return { ...state, reload };
}
