import { appParams } from "@/lib/app-params";
import { resolveApiHeaders, resolveServerUrl } from "@/lib/api-config";

const DEFAULT_TIMEOUT_MS = 15_000;

/** Fetch a single entity record by id via the direct REST API (reliable + timeout). */
export async function fetchEntityById(entityName, id, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const serverUrl = resolveServerUrl().replace(/\/$/, "");
  const headers = {
    "X-App-Id": String(appParams.appId || ""),
    ...resolveApiHeaders(),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${serverUrl}/api/entities/${entityName}?id=${encodeURIComponent(id)}`;
    const res = await fetch(url, { headers, signal: controller.signal });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const msg = data?.error || data?.message || `Request failed (${res.status})`;
      throw new Error(msg);
    }

    if (Array.isArray(data)) return data[0] ?? null;
    return data ?? null;
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Request timed out. Check your connection and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchBookingById(bookingId, options) {
  return fetchEntityById("Booking", bookingId, options);
}
