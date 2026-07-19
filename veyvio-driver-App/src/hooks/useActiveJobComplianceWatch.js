/**
 * useActiveJobComplianceWatch
 *
 * Polls compliance status of the driver and vehicle assigned to active bookings.
 * If a critical compliance item changes during an in-progress trip
 * (e.g. insurance expires mid-shift), dispatchers are alerted immediately.
 *
 * Used in DispatchBoard to power the "in-trip compliance change" alert feed.
 */
import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { validateDispatchCompliance } from "@/lib/dispatchCompliance";

const POLL_INTERVAL_MS = 120_000; // 2 minutes

export function useActiveJobComplianceWatch(activeBookings, drivers, vehicles) {
  const [complianceAlerts, setComplianceAlerts] = useState([]);
  const prevSnapshotRef = useRef({});

  useEffect(() => {
    if (!activeBookings?.length) return;

    const check = () => {
      const inTrip = activeBookings.filter(b =>
        ["en_route", "arrived", "in_progress"].includes(b.booking_status) && b.assigned_driver_id
      );

      const newAlerts = [];

      inTrip.forEach(booking => {
        const driver = drivers.find(d => d.id === booking.assigned_driver_id);
        const vehicle = vehicles.find(v => v.id === booking.assigned_vehicle_id);
        if (!driver || !vehicle) return;

        const result = validateDispatchCompliance(driver, vehicle);

        if (!result.ok) {
          const key = booking.id;
          const prev = prevSnapshotRef.current[key];
          const blockerStr = result.blockers.join("|");

          // Only fire alert if blockers changed since last check
          if (prev !== blockerStr) {
            prevSnapshotRef.current[key] = blockerStr;
            newAlerts.push({
              bookingId: booking.id,
              bookingReference: booking.booking_reference,
              driverName: driver.full_name,
              vehicleReg: vehicle.registration,
              blockers: result.blockers,
              warnings: result.warnings,
              detectedAt: new Date().toISOString(),
            });

            // Log to AuditLog immediately
            base44.entities.AuditLog.create({
              action: "in_trip_compliance_change",
              entity_type: "Booking",
              entity_id: booking.id,
              actor_name: "Compliance Monitor",
              actor_role: "system",
              description: `[LIVE COMPLIANCE ALERT] Active booking ${booking.booking_reference} — compliance issue detected during trip. Driver: ${driver.full_name}. Issues: ${result.blockers.join("; ")}`,
              severity: "critical",
            }).catch(() => {});
          }
        } else {
          // Clear resolved alert
          if (prevSnapshotRef.current[booking.id]) {
            delete prevSnapshotRef.current[booking.id];
          }
        }
      });

      if (newAlerts.length > 0) {
        setComplianceAlerts(prev => {
          // Merge, deduplicate by bookingId
          const map = {};
          [...prev, ...newAlerts].forEach(a => { map[a.bookingId] = a; });
          return Object.values(map);
        });
      }
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeBookings, drivers, vehicles]);

  const dismissAlert = (bookingId) => {
    setComplianceAlerts(prev => prev.filter(a => a.bookingId !== bookingId));
    delete prevSnapshotRef.current[bookingId];
  };

  return { complianceAlerts, dismissAlert };
}