import { getSupabaseClient } from "@/lib/supabase/client";
import { getJobStopsForMap } from "@/services/jobs.service";
import { MATCHED_TRIP_ACTIVE_STATUSES } from "@/lib/matchedTripDisplay";

const SEEN_KEY = "driver_matched_trip_seen_v1";

function readSeenSet() {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSeenSet(set) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
}

export function hasSeenMatchedTrip(jobId) {
  if (!jobId) return true;
  return readSeenSet().has(jobId);
}

export function markMatchedTripSeen(jobId) {
  if (!jobId) return;
  const set = readSeenSet();
  set.add(jobId);
  writeSeenSet(set);
}

export async function markPhvTripNotificationRead(notificationId) {
  if (!notificationId) return;
  const supabase = getSupabaseClient();
  await supabase
    .from("notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("status", "unread");
}

export async function findPendingMatchedTripNotification(userId) {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, source_entity_id, notification_type, status, created_at")
    .eq("recipient_user_id", userId)
    .eq("notification_type", "phv_trip_assigned")
    .eq("status", "unread")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.source_entity_id ? { jobId: data.source_entity_id, notificationId: data.id } : null;
}

function mapBookingRow(booking) {
  if (!booking) return null;
  return {
    reference: booking.booking_reference,
    pickupAddress: booking.pickup_address,
    destinationAddress: booking.main_destination_address,
    pickupLatitude: booking.pickup_latitude,
    pickupLongitude: booking.pickup_longitude,
    destinationLatitude: booking.main_destination_latitude,
    destinationLongitude: booking.main_destination_longitude,
    farePence: booking.agreed_fare_pence ?? booking.final_fare_pence ?? null,
    finalFarePence: booking.final_fare_pence,
    estimatedDurationSeconds: booking.estimated_duration_seconds,
    estimatedDistanceMeters: booking.estimated_distance_meters,
    passengerCount: booking.passenger_count,
    luggageCount: booking.luggage_count,
    childSeatRequired: booking.child_seat_required,
    wheelchairRequired: booking.wheelchair_required,
    accessibilityNotes: booking.accessibility_notes,
    customerNotes: booking.customer_notes,
    scheduledPickupAt: booking.scheduled_pickup_at ?? booking.requested_pickup_at,
    serviceType: booking.service_type,
    paymentMethod: booking.payment_method,
  };
}

function mergePhvPayload(booking, payload) {
  if (!payload || typeof payload !== "object") return booking;
  const merged = { ...(booking ?? {}) };
  if (merged.farePence == null && payload.agreed_fare_pence != null) {
    merged.farePence = payload.agreed_fare_pence;
  }
  if (!merged.pickupAddress && payload.pickup_address) merged.pickupAddress = payload.pickup_address;
  if (!merged.destinationAddress && payload.destination_address) {
    merged.destinationAddress = payload.destination_address;
  }
  if (!merged.scheduledPickupAt && payload.scheduled_pickup_at) {
    merged.scheduledPickupAt = payload.scheduled_pickup_at;
  }
  return merged;
}

export async function loadMatchedTripForJob(jobId, driverId) {
  if (!jobId || !driverId) return null;

  const supabase = getSupabaseClient();

  const [{ data: job }, { data: assignment }] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, route_name, status, customer_booking_id, pickup_json, dropoff_json, scheduled_start_at, job_number",
      )
      .eq("id", jobId)
      .maybeSingle(),
    supabase
      .from("job_assignments")
      .select("id, vehicle_id, vehicles(registration)")
      .eq("job_id", jobId)
      .eq("driver_id", driverId)
      .eq("is_current", true)
      .maybeSingle(),
  ]);

  if (!job?.customer_booking_id || !assignment) return null;
  if (!MATCHED_TRIP_ACTIVE_STATUSES.has(job.status ?? "")) return null;

  const [{ data: bookingRow }, { data: phvRecord }] = await Promise.all([
    supabase
      .from("customer_bookings")
      .select(
        "booking_reference, pickup_address, main_destination_address, pickup_latitude, pickup_longitude, main_destination_latitude, main_destination_longitude, agreed_fare_pence, final_fare_pence, estimated_duration_seconds, estimated_distance_meters, passenger_count, luggage_count, child_seat_required, wheelchair_required, accessibility_notes, customer_notes, scheduled_pickup_at, requested_pickup_at, service_type, payment_method",
      )
      .eq("id", job.customer_booking_id)
      .maybeSingle(),
    supabase
      .from("phv_booking_records")
      .select("booking_confirmation_payload")
      .eq("booking_id", job.customer_booking_id)
      .maybeSingle(),
  ]);

  const stops = await getJobStopsForMap(jobId).catch(() => []);

  let booking = mapBookingRow(bookingRow);
  booking = mergePhvPayload(booking, phvRecord?.booking_confirmation_payload);

  return {
    id: job.id,
    jobNumber: job.job_number ?? null,
    routeName: job.route_name ?? booking?.reference ?? "Trip",
    status: job.status,
    scheduledStartAt: job.scheduled_start_at,
    pickup: job.pickup_json,
    dropoff: job.dropoff_json,
    stops,
    vehicleRegistration: assignment.vehicles?.registration ?? null,
    customerBookingId: job.customer_booking_id,
    booking,
  };
}
