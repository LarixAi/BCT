export const BOOKING_LOAD_TIMEOUT_MS = 8000;

export const JOB_FLOW = [
  {
    status: "driver_assigned",
    label: "Accepted",
    shortLabel: "Accepted",
    action: "Start Journey to Pickup",
    next: "en_route",
    timeField: "dispatch_time",
    bookingEvent: "driver_en_route",
    description: "Driver started journey to pickup location",
    actionColor: "bg-blue-600 hover:bg-blue-700",
    icon: "🚗",
  },
  {
    status: "en_route",
    label: "En Route",
    shortLabel: "En Route",
    action: "I've Arrived at Pickup",
    next: "arrived",
    timeField: "arrival_time",
    bookingEvent: "driver_arrived",
    description: "Driver arrived at pickup location",
    actionColor: "bg-amber-500 hover:bg-amber-600",
    icon: "📍",
  },
  {
    status: "arrived",
    label: "At Pickup",
    shortLabel: "Arrived",
    action: "Passenger On Board — Start Trip",
    next: "in_progress",
    timeField: "pickup_time",
    bookingEvent: "passenger_picked_up",
    description: "Passenger confirmed on board, trip started",
    actionColor: "bg-purple-600 hover:bg-purple-700",
    icon: "🧍",
  },
  {
    status: "in_progress",
    label: "Trip in Progress",
    shortLabel: "In Progress",
    action: "Complete Trip",
    next: "completed",
    timeField: "completion_time",
    bookingEvent: "trip_completed",
    description: "Trip completed — awaiting payment confirmation",
    actionColor: "bg-emerald-600 hover:bg-emerald-700",
    icon: "🏁",
  },
];

export function isTerminalBooking(booking) {
  return booking?.booking_status === "completed" || booking?.booking_status === "cancelled";
}

export function isPendingOffer(booking) {
  return booking?.booking_status === "driver_assigned" && !booking?.driver_accept_time;
}

export function resolvePhaseFromBooking(booking, driver, fromHistory = false) {
  let complianceBlocked = "";
  if (!booking.driver_accept_time && booking.booking_status === "driver_assigned") {
    const today = new Date().toISOString().split("T")[0];
    if (!driver.daily_check_completed_today || driver.daily_check_date !== today) {
      complianceBlocked =
        "Daily vehicle safety check not completed today. Complete your check to accept jobs.";
    } else if (driver.status !== "active") {
      complianceBlocked = `Your driver account status is: ${driver.status}. Contact your operator.`;
    }
  }

  let phase = "job";
  if (!booking.driver_accept_time && booking.booking_status === "driver_assigned") {
    phase = "offer";
  } else if (booking.booking_status === "driver_assigned") {
    phase = "checklist";
  } else if (booking.booking_status === "completed" && booking.payment_status !== "captured" && !fromHistory) {
    phase = "payment";
  } else if (isTerminalBooking(booking)) {
    phase = "tripDetails";
  }

  return { phase, complianceBlocked };
}
