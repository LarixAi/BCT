import { invokeFunction } from "@/lib/invokeFunction";

export const JOB_FLOW = [
  { status: "driver_assigned", action: "Start Journey to Pickup",       next: "en_route",    timeField: "dispatch_time" },
  { status: "en_route",        action: "I've Arrived at Pickup",         next: "arrived",     timeField: "arrival_time" },
  { status: "arrived",         action: "Passenger On Board — Start Trip", next: "in_progress", timeField: "pickup_time" },
  { status: "in_progress",     action: "Complete Trip",                  next: "completed",   timeField: "completion_time" },
];

export function jobFlowStep(status) {
  return JOB_FLOW.find(s => s.status === status);
}

export function jobActionLabel(booking) {
  return jobFlowStep(booking?.booking_status)?.action || "Continue";
}

export function jobStartButtonLabel(booking) {
  const vehicle = [booking?.vehicle_make, booking?.vehicle_model].filter(Boolean).join(" ");
  if (vehicle) return `Start ${vehicle}`;
  return "Start Trip";
}

const LIVE_TRIP_STATUSES = new Set([
  "driver_assigned",
  "en_route",
  "arrived",
  "in_progress",
  "completed",
]);

const STATUS_RANK = {
  driver_assigned: 0,
  en_route: 1,
  arrived: 2,
  in_progress: 3,
  completed: 4,
};

export async function advanceJobStep({ booking, driver }) {
  const currentStep = jobFlowStep(booking.booking_status);
  if (!currentStep) return { error: "Invalid trip status" };

  const res = await invokeFunction("advanceJobStep", {
    bookingId: booking.id,
    driverId: driver.id,
    currentStatus: currentStep.status,
  });

  if (res.data?.error) return { error: res.data.error };

  const now = res.data?.timestamp || new Date().toISOString();

  if (res.data?.already_advanced) {
    const serverStatus = res.data.current_status || booking.booking_status;
    if (!LIVE_TRIP_STATUSES.has(serverStatus)) {
      return {
        error: `Trip is no longer active (${serverStatus}). The offer may have expired — contact dispatch if this is wrong.`,
      };
    }
    const fromRank = STATUS_RANK[currentStep.status] ?? -1;
    const serverRank = STATUS_RANK[serverStatus] ?? -1;
    if (serverRank < fromRank) {
      return {
        error: `Trip was reset (${serverStatus}). Try accepting a new offer.`,
      };
    }
    return {
      booking: {
        ...booking,
        booking_status: serverStatus,
      },
    };
  }

  const nextStatus = res.data?.new_status || currentStep.next;
  return {
    booking: {
      ...booking,
      booking_status: nextStatus,
      [currentStep.timeField]: now,
    },
  };
}

export function primaryAddressLine(address) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
}
