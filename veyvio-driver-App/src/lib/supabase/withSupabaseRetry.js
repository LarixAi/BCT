/**
 * Retry wrapper for Supabase calls that fail with HTTP 429 (rate limit).
 *
 * Usage:
 *   const result = await withSupabaseRetry(() =>
 *     supabase.from("table").select("*"),
 *   );
 *
 * Notes:
 * - Supabase responses do not throw on 429; they return { error, status }.
 *   We detect both shapes so the helper works for `.select()`, `.rpc()`,
 *   and direct fetch calls.
 * - Backoff is exponential with optional jitter, capped at maxDelayMs.
 * - Non-429 errors are returned/thrown immediately.
 */

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 800;
const DEFAULT_MAX_DELAY_MS = 8_000;

function isRateLimitResult(result) {
  if (!result) return false;
  if (typeof result === "object") {
    if (result.status === 429) return true;
    const err = result.error;
    if (err) {
      if (err.status === 429) return true;
      const code = String(err.code ?? "").toLowerCase();
      const message = String(err.message ?? "").toLowerCase();
      if (code.includes("429") || code === "rate_limited") return true;
      if (message.includes("rate limit") || message.includes("too many requests") || message.includes("429")) {
        return true;
      }
    }
  }
  return false;
}

function isRateLimitError(err) {
  if (!err) return false;
  if (err.status === 429) return true;
  const message = String(err.message ?? "").toLowerCase();
  return message.includes("rate limit") || message.includes("too many requests") || message.includes("429");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withSupabaseRetry(requestFn, options = {}) {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelay = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelay = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

  let attempt = 0;
  let delay = baseDelay;

  while (true) {
    try {
      const result = await requestFn();
      if (!isRateLimitResult(result) || attempt >= maxRetries) {
        return result;
      }
    } catch (err) {
      if (!isRateLimitError(err) || attempt >= maxRetries) {
        throw err;
      }
    }
    const jitter = Math.floor(Math.random() * 250);
    await sleep(Math.min(delay + jitter, maxDelay));
    delay = Math.min(delay * 2, maxDelay);
    attempt += 1;
  }
}
