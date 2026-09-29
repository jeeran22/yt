// ---------------------------------------------------------------------------
// Poll-with-backoff helper for async jobs (video generations & campaign jobs).
// Starts at `interval` ms and backs off up to `maxInterval` ms.
// ---------------------------------------------------------------------------

export async function pollUntil(
  fn,
  {
    isDone,
    onPoll,
    interval = 2000,
    maxInterval = 5000,
    timeoutMs = 10 * 60 * 1000,
    timeoutError = { message: 'This operation timed out.', code: 'POLL_TIMEOUT' }
  } = {}
) {
  const start = Date.now();
  let delay = interval;

  while (true) {
    const state = await fn();
    if (onPoll) onPoll(state);
    if (isDone(state)) return state;
    if (Date.now() - start > timeoutMs) throw timeoutError;

    delay = Math.min(delay * 1.5, maxInterval);
    await new Promise((r) => setTimeout(r, delay));
  }
}