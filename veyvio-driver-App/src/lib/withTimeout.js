/** Resolve with fallback if the promise does not settle (or rejects) in time. */
export function withTimeout(promise, ms, fallback) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = globalThis.setTimeout(() => resolve(fallback), ms);
  });
  const guarded = Promise.resolve(promise).catch(() => fallback);
  return Promise.race([guarded, timeout]).finally(() => {
    if (timer) globalThis.clearTimeout(timer);
  });
}
