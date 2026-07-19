/**
 * useLocationHeartbeat
 * @deprecated Legacy Base44 TfL heartbeat — not used in Supabase operational driver app.
 * Use useFleetTracking + fleet-tracking.service instead.
 *
 * Sends GPS pings every 60 seconds while a trip is active.
 * Used for TfL audit trail — allows route reconstruction post-trip.
 *
 * @param {string} bookingId
 * @param {string} bookingReference
 * @param {string} driverId
 * @param {string} driverName
 * @param {string} vehicleId
 * @param {string} vehicleRegistration
 * @param {string} tripPhase  — "en_route_to_pickup" | "trip_in_progress"
 * @param {boolean} active    — set to false to stop pinging
 */
import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

const PING_INTERVAL_MS = 60_000; // 60 seconds

export function useLocationHeartbeat({
  bookingId,
  bookingReference,
  driverId,
  driverName,
  vehicleId,
  vehicleRegistration,
  tripPhase,
  active,
}) {
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const lastPositionRef = useRef(null);

  useEffect(() => {
    if (!active || !bookingId || !driverId) return;

    // Start watching GPS
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => { lastPositionRef.current = pos; },
        () => {},
        { enableHighAccuracy: true, maximumAge: 30_000 }
      );
    }

    let missedPingsRef = { count: 0 };

    // Send a ping immediately, then every 60s
    const sendPing = async () => {
      const pos = lastPositionRef.current;

      // GPS Discontinuity detection — if no position for >2 consecutive intervals, log it
      if (!pos) {
        missedPingsRef.count = (missedPingsRef.count || 0) + 1;
        if (missedPingsRef.count >= 2) {
          // Log GPS gap to AuditLog for TfL compliance
          base44.entities.AuditLog.create({
            action: "gps_discontinuity",
            entity_type: "Booking",
            entity_id: bookingId,
            actor_name: driverName || "Driver",
            actor_role: "driver",
            description: `[TfL GPS ALERT] GPS signal lost for booking ${bookingReference || bookingId}. Driver: ${driverName}. Vehicle: ${vehicleRegistration}. Trip phase: ${tripPhase}. Signal has been absent for ${missedPingsRef.count * (PING_INTERVAL_MS / 1000)}s. Route reconstruction may be incomplete.`,
            severity: "warning",
          }).catch(() => {});
          missedPingsRef.count = 0; // Reset to avoid spamming
        }
        return;
      }

      missedPingsRef.count = 0; // Reset on successful position

      const speedMs = pos.coords.speed || 0;
      const speedMph = parseFloat((speedMs * 2.237).toFixed(1));

      await base44.entities.VehicleLocationPing.create({
        booking_id: bookingId,
        booking_reference: bookingReference || "",
        driver_id: driverId,
        driver_name: driverName || "",
        vehicle_id: vehicleId || "",
        vehicle_registration: vehicleRegistration || "",
        lat: parseFloat(pos.coords.latitude.toFixed(6)),
        lng: parseFloat(pos.coords.longitude.toFixed(6)),
        accuracy_metres: Math.round(pos.coords.accuracy || 0),
        speed_mph: speedMph,
        heading_degrees: pos.coords.heading || 0,
        trip_phase: tripPhase || "trip_in_progress",
        recorded_at: new Date().toISOString(),
      }).catch(() => {}); // Silent fail — never block the driver UI
    };

    // First ping after 5s, then interval
    const initialTimer = setTimeout(sendPing, 5_000);
    intervalRef.current = setInterval(sendPing, PING_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalRef.current);
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [active, bookingId, driverId, tripPhase]);
}