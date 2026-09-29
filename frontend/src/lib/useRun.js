// ---------------------------------------------------------------------------
// Small async-operation hook every view uses: busy flag, normalized error and
// the successful `data` payload (the backend's `{success,data}` wrapper is
// already unwrapped by the API client).
// ---------------------------------------------------------------------------

import { useCallback, useState } from 'react';

export default function useRun() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const run = useCallback(async (fn) => {
    setBusy(true);
    setError(null);
    try {
      const data = await fn();
      setResult(data);
      return data;
    } catch (e) {
      setError(e);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    busy,
    error,
    result,
    setResult,
    setError,
    clearError: () => setError(null),
    run
  };
}