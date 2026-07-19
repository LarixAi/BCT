import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { withTimeout } from "@/lib/withTimeout";
import {
  computeWeekStats,
  lastCompletedTrip,
  bestDayThisWeek,
  nearestDemandZones,
} from "@/lib/driverStats";

const FETCH_TIMEOUT_MS = 8000;

export function useDriverHomeData(driver) {
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [weekStats, setWeekStats] = useState({ trips: 0, net: 0, gross: 0 });
  const [recentTrip, setRecentTrip] = useState(null);
  const [bestDay, setBestDay] = useState({ label: "—", net: 0 });
  const [hotZones, setHotZones] = useState([]);

  useEffect(() => {
    if (!driver?.id) return;

    let cancelled = false;
    const lat = driver.current_lat || 51.5074;
    const lng = driver.current_lng || -0.1278;
    const today = new Date().toISOString().split("T")[0];

    setHotZones(nearestDemandZones(lat, lng, 2));

    async function load() {
      setLoading(true);
      try {
        const vehiclePromise = driver.assigned_vehicle_id
          ? base44.entities.Vehicle.filter({ id: driver.assigned_vehicle_id }, "-created_date", 1)
          : Promise.resolve([]);

        const [bookings, promos, vehicleRows] = await withTimeout(
          Promise.all([
            base44.entities.Booking.filter({ assigned_driver_id: driver.id }, "-completion_time", 80),
            base44.entities.Promotion.filter({ is_active: true }, "-created_date", 8),
            vehiclePromise,
          ]),
          FETCH_TIMEOUT_MS
        );

        if (cancelled) return;

        const completed = bookings.filter(b => b.booking_status === "completed");
        setWeekStats(computeWeekStats(completed));
        setRecentTrip(lastCompletedTrip(completed));
        setBestDay(bestDayThisWeek(completed));

        const activePromos = promos.filter(
          p =>
            (!p.valid_until || p.valid_until >= today) &&
            (!p.valid_from || p.valid_from <= today)
        );
        setPromotions(activePromos.slice(0, 3));

        setVehicle(vehicleRows[0] || null);
      } catch (err) {
        console.warn("[DriverHome] data load failed:", err?.message || err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [driver?.id, driver?.assigned_vehicle_id, driver?.current_lat, driver?.current_lng]);

  return { loading, vehicle, promotions, weekStats, recentTrip, bestDay, hotZones };
}
