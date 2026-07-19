/**
 * Create a test booking and offer it to a driver (shows in driver app as trip offer).
 */
import { base44 } from "@/api/base44Client";
import { validateDispatchCompliance } from "@/lib/dispatchCompliance";
import { logAuditEvent, logBookingEvent } from "@/lib/auditLogger";

export const DEFAULT_TEST_BOOKING = {
  customer_name: "Test Customer",
  customer_phone: "07700900000",
  pickup_address: "Westminster, London SW1A 2AA",
  pickup_lat: 51.5034,
  pickup_lng: -0.1276,
  dropoff_address: "Tower Bridge, London SE1 2UP",
  dropoff_lat: 51.5055,
  dropoff_lng: -0.0754,
  vehicle_type_requested: "any",
  booking_type: "asap",
  payment_method: "card",
  fare_estimate: 25,
  passenger_count: 1,
};

/**
 * @param {{ driver: object, vehicle: object, dispatchedBy?: string, bookingFields?: object }} params
 * @returns {Promise<{ booking: object, dispatchRecord: object, reference: string }>}
 */
export async function sendJobOfferToDriver({
  driver,
  vehicle,
  dispatchedBy = "Admin",
  bookingFields = {},
}) {
  if (!driver?.id) {
    throw new Error("Driver is required.");
  }
  if (!vehicle?.id) {
    throw new Error("Assign a vehicle to this driver before sending a job offer.");
  }

  const compliance = validateDispatchCompliance(driver, vehicle);
  if (!compliance.ok) {
    const err = new Error("Dispatch blocked by compliance.");
    err.blockers = compliance.blockers;
    throw err;
  }

  const reference = `TEST-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();

  // Fixed landmark pickup for test jobs — not driver GPS (0 mi trips break Maps navigation).
  const pickupLat = bookingFields.pickup_lat ?? DEFAULT_TEST_BOOKING.pickup_lat;
  const pickupLng = bookingFields.pickup_lng ?? DEFAULT_TEST_BOOKING.pickup_lng;
  const pickupAddress = bookingFields.pickup_address ?? DEFAULT_TEST_BOOKING.pickup_address;

  const booking = await base44.entities.Booking.create({
    ...DEFAULT_TEST_BOOKING,
    ...bookingFields,
    pickup_lat: pickupLat,
    pickup_lng: pickupLng,
    pickup_address: pickupAddress,
    booking_reference: reference,
    booking_status: "pending",
    payment_status: "pending",
  });

  const complianceSnapshot = JSON.stringify({
    driver_phv_verified: driver.phv_licence_verified,
    driver_phv_expiry: driver.phv_licence_expiry,
    vehicle_phv_verified: vehicle.phv_licence_verified,
    vehicle_phv_expiry: vehicle.phv_licence_expiry,
    mot_expiry: vehicle.mot_expiry,
    insurance_expiry: vehicle.insurance_expiry,
    daily_check_completed: driver.daily_check_completed_today,
    dispatched_at: now,
  });

  const updated = await base44.entities.Booking.update(booking.id, {
    assigned_driver_id: driver.id,
    assigned_vehicle_id: vehicle.id,
    driver_name: driver.full_name,
    driver_phv_licence_number: driver.phv_licence_number,
    vehicle_registration: vehicle.registration,
    vehicle_make: vehicle.make,
    vehicle_model: vehicle.model,
    vehicle_colour: vehicle.colour,
    booking_status: "driver_assigned",
  });

  const dispatchRecord = await base44.entities.DispatchRecord.create({
    booking_id: booking.id,
    booking_reference: reference,
    driver_id: driver.id,
    driver_name: driver.full_name,
    driver_phv_licence: driver.phv_licence_number,
    driver_phv_expiry: driver.phv_licence_expiry,
    vehicle_id: vehicle.id,
    vehicle_registration: vehicle.registration,
    vehicle_make: vehicle.make,
    vehicle_model: vehicle.model,
    vehicle_colour: vehicle.colour,
    vehicle_phv_licence: vehicle.phv_licence_number,
    vehicle_mot_expiry: vehicle.mot_expiry,
    vehicle_insurance_expiry: vehicle.insurance_expiry,
    daily_check_completed: driver.daily_check_completed_today,
    dispatch_method: "manual",
    dispatched_by_staff_name: dispatchedBy,
    dispatched_at: now,
    offer_sent_at: now,
    compliance_snapshot: complianceSnapshot,
    status: "offered",
  });

  await logBookingEvent({
    bookingId: booking.id,
    eventType: "driver_offered_job",
    actorName: dispatchedBy,
    actorRole: "dispatcher",
    description: `Job offered to ${driver.full_name} (${driver.phv_licence_number}) — Vehicle: ${vehicle.registration}`,
    metadata: { driverId: driver.id, vehicleId: vehicle.id, test: true },
  });

  await logAuditEvent({
    action: "test_dispatch",
    entityType: "Booking",
    entityId: booking.id,
    actorName: dispatchedBy,
    actorRole: "dispatcher",
    description: `[TEST] ${reference} offered to ${driver.full_name} / ${vehicle.registration}`,
    severity: "info",
  });

  return { booking: updated, dispatchRecord, reference };
}
