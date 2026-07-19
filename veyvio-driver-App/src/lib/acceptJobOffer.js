import { base44 } from "@/api/base44Client";
import { invokeFunction } from "@/lib/invokeFunction";
import { fetchBookingById } from "@/lib/fetchEntity";

/** Driver accepts a job offer — stamps driver_accept_time server-side. */
export async function acceptJobOffer({ booking, driver }) {
  const res = await invokeFunction(
    "acceptJob",
    { bookingId: booking.id, driverId: driver.id },
    { timeoutMs: 15_000 }
  );

  if (res.data?.success || res.data?.already_accepted) {
    const acceptedAt = res.data?.accepted_at || new Date().toISOString();
    try {
      const fresh = await fetchBookingById(booking.id, { timeoutMs: 8000 });
      if (
        fresh?.assigned_driver_id === driver.id &&
        fresh.booking_status === "driver_assigned" &&
        fresh.driver_accept_time
      ) {
        return fresh;
      }
    } catch {
      /* fall through */
    }
    return { ...booking, driver_accept_time: acceptedAt };
  }

  if (res.data?.error) {
    // Accept may have won a race with expiry — re-read booking before failing
    try {
      const fresh = await fetchBookingById(booking.id, { timeoutMs: 8000 });
      if (
        fresh?.driver_accept_time &&
        fresh.assigned_driver_id === driver.id &&
        fresh.booking_status === "driver_assigned"
      ) {
        return fresh;
      }
    } catch {
      /* fall through */
    }
    throw new Error(res.data.error);
  }

  throw new Error("Could not accept job. Try again.");
}

/** Direct client fallback when the acceptJob function is unreachable. */
export async function acceptJobOfferClientFallback({ booking, driver }) {
  const now = new Date().toISOString();
  await base44.entities.Booking.update(booking.id, { driver_accept_time: now });
  return { ...booking, driver_accept_time: now };
}
