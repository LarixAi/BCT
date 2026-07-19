/**
 * Client API for server-side fare quotes and booking confirmation.
 */
import { invokeFunction } from "@/lib/invokeFunction";

export async function createFareQuote(payload) {
  const res = await invokeFunction("createFareQuote", payload, { timeoutMs: 25_000 });
  if (res.data?.error) {
    throw new Error(res.data.error);
  }
  return res.data;
}

export async function confirmBookingFromQuote(payload) {
  const res = await invokeFunction("confirmBooking", payload, { timeoutMs: 25_000 });
  if (res.data?.error) {
    throw new Error(res.data.error);
  }
  return res.data;
}

export function isQuoteExpired(quote) {
  const expiresAt = quote?.expiresAt || quote?.expires_at;
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() < Date.now();
}

export function quoteDisplayFromResponse(data) {
  const quote = data?.quote;
  const display = data?.display;
  if (!quote || !display) return null;
  let breakdown = null;
  if (quote.breakdown_json) {
    try {
      breakdown = JSON.parse(quote.breakdown_json);
    } catch {
      breakdown = null;
    }
  }
  return {
    quoteId: quote.id,
    total: quote.total_fare,
    driverPayout: quote.driver_payout,
    miles: display.distance_miles,
    minutes: display.duration_minutes,
    peakApplied: display.peak_applied,
    ruleName: display.rule_name,
    expiresAt: quote.expires_at,
    breakdown,
    airportFees: display.airport_fees || breakdown?.airport_fees || [],
    airportSurcharge: display.airport_surcharge ?? breakdown?.airport_surcharge ?? 0,
  };
}
