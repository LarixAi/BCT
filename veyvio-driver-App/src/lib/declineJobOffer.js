import { base44 } from "@/api/base44Client";
import { invokeFunction } from "@/lib/invokeFunction";
import { triggerRedispatch } from "@/lib/triggerRedispatch";

function isRateLimitError(message = "") {
  const m = String(message).toLowerCase();
  return m.includes("rate limit") || m.includes("too many requests") || m.includes("429");
}

async function declineViaSingleUpdate(booking) {
  await base44.entities.Booking.update(booking.id, {
    booking_status: "searching",
    assigned_driver_id: null,
    driver_name: null,
    driver_phv_licence_number: null,
    vehicle_registration: null,
    vehicle_make: null,
    vehicle_model: null,
    vehicle_colour: null,
    dispatch_attempts: (booking.dispatch_attempts || 0) + 1,
  });
}

async function declineWithRetry(booking) {
  try {
    await declineViaSingleUpdate(booking);
  } catch (err) {
    if (isRateLimitError(err?.message || String(err))) {
      await new Promise(r => setTimeout(r, 4000));
      await declineViaSingleUpdate(booking);
      return;
    }
    throw err;
  }
}

/**
 * Driver declines a job offer.
 * Tries one backend function call first; falls back to a single booking update
 * to stay under Base44 API rate limits.
 */
export async function declineJobOffer({ booking, driver, skipRedispatch = false }) {
  // Skip if driver already accepted (race with expiry timer near 0s)
  try {
    const fresh = await base44.entities.Booking.filter({ id: booking.id }, "-created_date", 1);
    const current = fresh[0];
    if (current?.driver_accept_time) return;
    if (current?.booking_status !== "driver_assigned") return;
  } catch {
    /* continue with decline */
  }

  const res = await invokeFunction(
    "declineJob",
    { bookingId: booking.id, driverId: driver.id },
    { timeoutMs: 6000 }
  );

  if (res.data?.success || res.data?.already_declined) {
    if (!skipRedispatch) triggerRedispatch();
    return;
  }

  // Function missing, timed out, or failed — one lightweight client update
  await declineWithRetry(booking);
  if (!skipRedispatch) triggerRedispatch();
}
