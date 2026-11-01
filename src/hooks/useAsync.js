import { useCallback, useEffect, useRef, useState } from 'react';

// Runs an async function when the component appears (and whenever `deps` change) and
// reports { loading, data, error, reload }. A late answer from an old request is ignored.
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(fn);
  latest.current = fn;

  useEffect(() => {
    let active = true;
    setState({ loading: true, data: null, error: null });
    latest.current().then(
      (data) => active && setState({ loading: false, data, error: null }),
      (error) => active && setState({ loading: false, data: null, error }),
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
