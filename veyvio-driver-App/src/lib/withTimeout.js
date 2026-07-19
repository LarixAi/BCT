/**
 * Reject if a promise does not settle within `ms` milliseconds.
 */
export function withTimeout(promise, ms, message = "Request timed out") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
