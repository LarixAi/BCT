import { base44 } from "@/api/base44Client";
import { fetchBookingById } from "@/lib/fetchEntity";
import { withTimeout } from "@/lib/withTimeout";
import { BOOKING_LOAD_TIMEOUT_MS } from "@/lib/phv-job/job-flow";

export async function loadBookingRecord(bookingId) {
  try {
    const results = await withTimeout(
      base44.entities.Booking.filter({ id: bookingId }, "-created_date", 1),
      BOOKING_LOAD_TIMEOUT_MS,
    );
    if (results?.length) return results[0];
  } catch {
    // Fall through to REST fetch.
  }
  return fetchBookingById(bookingId, { timeoutMs: BOOKING_LOAD_TIMEOUT_MS });
}
