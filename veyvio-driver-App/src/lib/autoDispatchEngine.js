/**
 * Auto-Dispatch Engine
 *
 * Progressive proximity-based driver allocation for TfL-compliant ride dispatch.
 * Algorithm expands search radius outward from pickup, tier by tier, starting at
 * 50m and working outward until a compliant online driver is found.
 *
 * Tier strategy (starting at 50m as per operator config):
 *   Primary  — 0-50m, 50-100m, 100-200m, 200-500m
 *   Extended — 500m-1km, 1km-2km, 2km-5km, 5km+    (fallback — wider search)
 *
 * Priority queue tiebreaker (equal distance):
 *   1. Driver star rating (highest first)
 *   2. Total trips completed (most experienced first)
 *   3. Daily check completed today (true first)
 *   4. Recency of location update (most recent first)
 */

/**
 * Cumulative radius search tiers — each tier includes ALL drivers within that radius,
 * not just those in a specific band. This prevents "dead zones" where drivers at 600m
 * are missed because they don't fit in the 500m bucket.
 */
export const PROXIMITY_TIERS = [
  { max: 500,    label: "Within 500m", color: "emerald", timeMs: 0     },
  { max: 2000,   label: "Within 2km",  color: "blue",    timeMs: 8000  },
  { max: 5000,   label: "Within 5km",  color: "amber",   timeMs: 16000 },
  { max: 999999, label: "Nearest",     color: "slate",   timeMs: 24000 },
];

export const EXTENDED_TIERS = PROXIMITY_TIERS; // Unified — no separate extended tiers needed

export const ALL_TIERS = PROXIMITY_TIERS;

/**
 * Haversine distance calculator — returns metres
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  if (!lat1 || !lng1 || !lat2 || !lng2) return Infinity;
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Check if a date string represents a valid, non-expired document.
 * Returns true if expiry is today or in the future.
 */
export const isDocumentValid = (expiryDateStr) => {
  if (!expiryDateStr) return false;
  const expiry = new Date(expiryDateStr);
  expiry.setHours(23, 59, 59, 999); // Valid until end of expiry day
  return expiry >= new Date();
};

/**
 * Validate vehicle PHV licence before dispatch.
 * Returns { ok, reason } — if not ok, dispatch must be blocked.
 */
export const validateVehiclePhv = (vehicle) => {
  if (!vehicle) return { ok: false, reason: "No vehicle provided" };
  if (!vehicle.phv_licence_number) return { ok: false, reason: `Vehicle ${vehicle.registration} has no PHV licence number` };
  if (!vehicle.phv_licence_expiry) return { ok: false, reason: `Vehicle ${vehicle.registration} PHV licence has no expiry date` };
  if (!isDocumentValid(vehicle.phv_licence_expiry)) {
    return { ok: false, reason: `Vehicle ${vehicle.registration} PHV licence EXPIRED on ${vehicle.phv_licence_expiry}` };
  }
  if (!vehicle.phv_licence_verified) {
    return { ok: false, reason: `Vehicle ${vehicle.registration} PHV licence not yet verified by compliance team` };
  }
  return { ok: true, reason: null };
};

/**
 * Priority score for equally-close drivers.
 * Higher = preferred. Used as tiebreaker within the same distance tier.
 *
 * Scoring:
 *   +40  driver star rating (0-5 → 0-40 pts, scaled ×8)
 *   +30  total trips (capped at 500 trips → max 30 pts)
 *   +20  daily check completed today
 *   +10  location recently updated (within last 10 minutes)
 */
export const driverPriorityScore = (driver) => {
  let score = 0;
  if (driver.rating) score += Math.min(driver.rating, 5) * 8;
  if (driver.total_trips) score += Math.min(driver.total_trips / 500, 1) * 30;
  if (driver.daily_check_completed_today) score += 20;
  if (driver.last_location_update) {
    const age = Date.now() - new Date(driver.last_location_update).getTime();
    if (age < 10 * 60 * 1000) score += 10; // Fresh ping within 10 mins
  }
  return score;
};

/**
 * Filter drivers by compliance — must be online, active, safety-checked,
 * have a valid PHV licence, and be paired with a vehicle that also has a valid PHV licence.
 *
 * Returns { compliant: Driver[], excluded: { driver, reason }[] } so callers
 * can surface exactly WHY each driver was skipped (Dispatch Trace / diagnostics).
 */
export const filterCompliantDrivers = (drivers, vehicles, validateFn) => {
  const compliant = [];
  const excluded = [];

  for (const driver of drivers) {
    if (driver.status !== "active" || !driver.is_online) {
      excluded.push({ driver, reason: `Not online/active (status=${driver.status}, online=${driver.is_online})` });
      continue;
    }
    if (!driver.daily_check_completed_today) {
      excluded.push({ driver, reason: "Daily safety check not completed today" });
      continue;
    }

    // Find the driver's assigned vehicle first, then any active vehicle with valid PHV
    const vehicle =
      vehicles.find(v => v.id === driver.assigned_vehicle_id && v.status === "active") ||
      vehicles.find(v => v.status === "active" && validateVehiclePhv(v).ok);

    if (!vehicle) {
      excluded.push({ driver, reason: "No active vehicle with valid PHV licence assigned" });
      continue;
    }

    // Hard block: vehicle PHV licence must be valid
    const phvCheck = validateVehiclePhv(vehicle);
    if (!phvCheck.ok) {
      excluded.push({ driver, reason: `Vehicle PHV: ${phvCheck.reason}` });
      continue;
    }

    // Full compliance gate (driver PHV, insurance, MOT, etc.)
    const compliance = validateFn(driver, vehicle);
    if (!compliance?.ok) {
      excluded.push({ driver, reason: compliance?.blockers?.join("; ") || "Compliance check failed" });
      continue;
    }

    compliant.push(driver);
  }

  return compliant;
};

/**
 * Same as filterCompliantDrivers but returns the full audit trace including
 * which drivers were excluded and why. Used by Dispatch Diagnostics panel.
 */
export const auditCompliantDrivers = (drivers, vehicles, validateFn) => {
  const compliant = [];
  const excluded = [];

  for (const driver of drivers) {
    if (driver.status !== "active" || !driver.is_online) {
      excluded.push({ driver, reason: `Not online/active (status=${driver.status}, online=${driver.is_online})` });
      continue;
    }
    if (!driver.daily_check_completed_today) {
      excluded.push({ driver, reason: "Daily safety check not completed today" });
      continue;
    }

    const vehicle =
      vehicles.find(v => v.id === driver.assigned_vehicle_id && v.status === "active") ||
      vehicles.find(v => v.status === "active" && validateVehiclePhv(v).ok);

    if (!vehicle) {
      excluded.push({ driver, reason: "No active vehicle with valid PHV licence assigned" });
      continue;
    }

    const phvCheck = validateVehiclePhv(vehicle);
    if (!phvCheck.ok) {
      excluded.push({ driver, reason: `Vehicle PHV: ${phvCheck.reason}` });
      continue;
    }

    const compliance = validateFn(driver, vehicle);
    if (!compliance?.ok) {
      excluded.push({ driver, reason: compliance?.blockers?.join("; ") || "Compliance check failed" });
      continue;
    }

    compliant.push(driver);
  }

  return { compliant, excluded };
};

/**
 * Progressive proximity search — returns all drivers grouped by proximity tier.
 * Includes extended tiers when drivers are beyond 100m.
 */
export const findNearbyDrivers = (
  booking,
  drivers,
  vehicles,
  complianceValidator,
  includeExtended = false
) => {
  if (!booking?.pickup_lat || !booking?.pickup_lng) {
    return { error: "Booking missing pickup coordinates", rings: [], totalCandidates: 0 };
  }

  const compliantDrivers = filterCompliantDrivers(drivers, vehicles, complianceValidator);

  if (compliantDrivers.length === 0) {
    return {
      error: "No online compliant drivers available (check daily safety checks)",
      rings: [],
      totalCandidates: 0,
    };
  }

  // Separate drivers with GPS from those without
  const driversWithGps = compliantDrivers.filter(d => d.current_lat && d.current_lng);
  const driversWithoutGps = compliantDrivers.filter(d => !d.current_lat || !d.current_lng);

  const driversWithDistance = driversWithGps.map(driver => ({
    ...driver,
    distanceMeters: calculateDistance(
      driver.current_lat,
      driver.current_lng,
      booking.pickup_lat,
      booking.pickup_lng
    ),
  }));

  const rings = [];

  for (const tier of ALL_TIERS) {
    // Cumulative: include ALL drivers within this radius (not just those in a specific band)
    const driversInTier = driversWithDistance
      .filter(d => d.distanceMeters <= tier.max)
      .sort((a, b) => {
        const distDiff = a.distanceMeters - b.distanceMeters;
        if (Math.abs(distDiff) < 50) return driverPriorityScore(b) - driverPriorityScore(a);
        return distDiff;
      });

    if (driversInTier.length > 0) {
      rings.push({
        tierId: ALL_TIERS.indexOf(tier),
        tier: tier.label,
        maxDistance: tier.max,
        color: tier.color,
        delayMs: tier.timeMs,
        drivers: driversInTier,
        count: driversInTier.length,
        isExtended: false,
      });
      break; // Found drivers in this radius — no need to expand further
    }
  }

  // If no GPS-located drivers found, include GPS-less drivers as a final fallback ring
  if (rings.length === 0 && driversWithoutGps.length > 0) {
    const ranked = [...driversWithoutGps].sort((a, b) => driverPriorityScore(b) - driverPriorityScore(a));
    rings.push({
      tierId: ALL_TIERS.length,
      tier: "No GPS — Highest Priority",
      maxDistance: null,
      color: "slate",
      delayMs: 0,
      drivers: ranked,
      count: ranked.length,
      isExtended: false,
    });
  }

  return {
    error: null,
    rings,
    totalCandidates: driversWithDistance.filter(d => d.distanceMeters !== Infinity).length + driversWithoutGps.length,
  };
};

/**
 * Resolve the best vehicle for a driver, with PHV expiry hard-check.
 * Prefers the driver's assigned vehicle; falls back to any active vehicle with valid PHV.
 * Returns null if no valid vehicle exists.
 */
const resolveVehicle = (driver, vehicles) => {
  // Prefer assigned vehicle
  const assigned = vehicles.find(v => v.id === driver.assigned_vehicle_id && v.status === "active");
  if (assigned && validateVehiclePhv(assigned).ok) return assigned;

  // Fallback: any active vehicle with a valid PHV licence
  return vehicles.find(v => v.status === "active" && validateVehiclePhv(v).ok) || null;
};

/**
 * runAutoDispatch — core algorithm for automated assignment.
 *
 * Starting at 50m, expands outward tier by tier until a compliant driver is found.
 * Within each tier, drivers are ranked by a priority queue score (rating, experience,
 * recency of check). PHV licence expiry is validated on both driver and vehicle before
 * any assignment is made.
 *
 * Returns { driver, vehicle, tier, distanceMeters, error }
 */
export const runAutoDispatch = (booking, drivers, vehicles, complianceValidator) => {
  const compliantDrivers = filterCompliantDrivers(drivers, vehicles, complianceValidator);

  if (compliantDrivers.length === 0) {
    return {
      driver: null, vehicle: null, tier: null, distanceMeters: null,
      error: "No compliant online drivers available. Ensure drivers have completed their daily safety check and all documents are valid.",
    };
  }

  // Separate GPS-located from GPS-less — GPS-less are still valid candidates
  const driversWithGps = compliantDrivers.filter(d => d.current_lat && d.current_lng);
  const driversWithoutGps = compliantDrivers.filter(d => !d.current_lat || !d.current_lng);

  // No GPS on booking — use priority queue on all compliant drivers
  if (!booking?.pickup_lat || !booking?.pickup_lng) {
    const ranked = [...compliantDrivers].sort((a, b) => driverPriorityScore(b) - driverPriorityScore(a));
    for (const driver of ranked) {
      const vehicle = resolveVehicle(driver, vehicles);
      if (vehicle) {
        return { driver, vehicle, tier: "No GPS — Highest Priority", distanceMeters: null, error: null };
      }
    }
    return { driver: null, vehicle: null, tier: null, distanceMeters: null, error: "No compliant vehicle available" };
  }

  // Compute distance for every GPS-located compliant driver
  const driversWithDist = driversWithGps.map(d => ({
    ...d,
    distanceMeters: calculateDistance(d.current_lat, d.current_lng, booking.pickup_lat, booking.pickup_lng),
  }));

  // Walk tiers outward using cumulative radius (0→500m, 0→2km, 0→5km, 0→any)
  for (const tier of ALL_TIERS) {
    const tierDrivers = driversWithDist
      .filter(d => d.distanceMeters <= tier.max)
      .sort((a, b) => {
        const distDiff = a.distanceMeters - b.distanceMeters;
        if (Math.abs(distDiff) < 50) return driverPriorityScore(b) - driverPriorityScore(a);
        return distDiff;
      });

    for (const candidate of tierDrivers) {
      const vehicle = resolveVehicle(candidate, vehicles);
      if (!vehicle) continue;
      return { driver: candidate, vehicle, tier: tier.label, distanceMeters: candidate.distanceMeters, error: null };
    }
  }

  // GPS-less compliant drivers — offered jobs at highest priority score (Uber "no-location" fallback)
  // These drivers are fully compliant but have no GPS fix yet — still eligible for dispatch
  const noGpsRanked = [...driversWithoutGps].sort((a, b) => driverPriorityScore(b) - driverPriorityScore(a));
  for (const fallback of noGpsRanked) {
    const vehicle = resolveVehicle(fallback, vehicles);
    if (vehicle) {
      return { driver: fallback, vehicle, tier: "No GPS — Dispatched by Priority", distanceMeters: null, error: null };
    }
  }

  return { driver: null, vehicle: null, tier: null, distanceMeters: null, error: "No available driver-vehicle pair found after full search" };
};

/**
 * Get single closest driver from findNearbyDrivers result
 */
export const getClosestDriver = (result) => {
  if (!result?.rings?.length) return null;
  return result.rings[0].drivers[0] || null;
};

/**
 * Progressive offering sequence with staggered delays
 */
export const getProgressiveOfferingSequence = (result) => {
  const sequence = [];
  result.rings.forEach(ring => {
    ring.drivers.forEach((driver, idx) => {
      sequence.push({
        driver,
        tier: ring.tier,
        tierId: ring.tierId,
        delayMs: ring.delayMs + idx * 500,
        distanceMeters: driver.distanceMeters,
      });
    });
  });
  return sequence;
};

/** Format distance for display */
export const formatDistance = (meters) => {
  if (meters === null || meters === undefined || !isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

/** Rough ETA estimate assuming 20 km/h urban average */
export const estimateETA = (meters) => {
  if (!meters || !isFinite(meters)) return "—";
  const minutes = Math.round((meters / 1000 / 20) * 60);
  return minutes < 1 ? "< 1 min" : `~${minutes} min`;
};