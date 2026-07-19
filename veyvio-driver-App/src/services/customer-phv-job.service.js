/**
 * Customer App V2 PHV fulfilment — driver progress + pickup PIN.
 */
import { getSupabaseClient } from "@/lib/supabase/client";

const PHV_ADVANCE_LABELS = {
  assigned: "Start journey to pickup",
  ready_to_dispatch: "Start journey to pickup",
  en_route_to_pickup: "I've arrived at pickup",
  en_route: "I've arrived at pickup",
  passenger_boarding: "Passenger on board — start trip",
  in_progress: "Complete trip",
};

export function phvAdvanceLabel(jobStatus) {
  return PHV_ADVANCE_LABELS[jobStatus] ?? null;
}

export function isPhvCustomerBookingJob(job) {
  return Boolean(job?.customerBookingId);
}

export function needsPickupPin(jobStatus) {
  return jobStatus === "arrived_at_pickup";
}

export async function advanceCustomerBookingJob(jobId, driver) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("driver_advance_customer_booking_job", {
    p_job_id: jobId,
  });

  if (error) return { ok: false, message: error.message };
  if (!data?.ok) return { ok: false, message: data?.message ?? "Could not advance job" };

  if (driver?.id) {
    try {
      const { ensureJobLinkedToFleetSession } = await import("@/services/fleet-tracking.service");
      const { data: assignment } = await supabase
        .from("job_assignments")
        .select("vehicle_id")
        .eq("job_id", jobId)
        .eq("driver_id", driver.id)
        .eq("is_current", true)
        .maybeSingle();
      await ensureJobLinkedToFleetSession(driver, {
        jobId,
        vehicleId: assignment?.vehicle_id ?? null,
      });
    } catch {
      /* optional */
    }
  }

  return {
    ok: true,
    newStatus: data.new_status,
    bookingStatus: data.booking_status,
  };
}

export async function verifyPickupPin(jobId, pin) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("driver_verify_pickup_pin", {
    p_job_id: jobId,
    p_pin: pin,
  });

  if (error) return { ok: false, message: error.message };
  if (!data?.ok) return { ok: false, message: data?.message ?? "PIN verification failed" };

  return {
    ok: true,
    newStatus: data.new_status,
    bookingStatus: data.booking_status,
  };
}
