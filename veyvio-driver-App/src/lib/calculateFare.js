/**
 * Shared fare calculation — matches admin FareExplainer formula.
 */

export function pickFareRule(fareRules, vehicleType) {
  if (!fareRules?.length) return null;
  return (
    fareRules.find((r) => r.vehicle_type === vehicleType) ||
    fareRules.find((r) => r.vehicle_type === "any") ||
    fareRules[0]
  );
}

function parseHhmm(timeStr) {
  if (!timeStr) return null;
  const [h, m] = String(timeStr).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 100 + m;
}

export function isPeakTime(rule, when = new Date()) {
  if (!rule) return false;
  const hhmm = when.getHours() * 100 + when.getMinutes();
  const amStart = parseHhmm(rule.peak_hours_start || "07:00");
  const amEnd = parseHhmm(rule.peak_hours_end || "09:30");
  const pmStart = parseHhmm(rule.evening_peak_start || "17:00");
  const pmEnd = parseHhmm(rule.evening_peak_end || "19:30");
  return (
    (amStart != null && amEnd != null && hhmm >= amStart && hhmm <= amEnd) ||
    (pmStart != null && pmEnd != null && hhmm >= pmStart && hhmm <= pmEnd)
  );
}

export function calculateFareFromRule(rule, { miles, minutes, promoDiscount = 0, when = new Date() }) {
  const m = Math.max(0, Number(miles) || 0);
  const t = Math.max(0, Number(minutes) || 0);
  const disc = Math.max(0, Number(promoDiscount) || 0);

  const mileCharge = m * (rule.per_mile_rate || 0);
  const minCharge = t * (rule.per_minute_rate || 0);
  const bookingFee = rule.booking_fee || 0;
  const subtotal = (rule.base_fare || 0) + mileCharge + minCharge + bookingFee;
  const peak = isPeakTime(rule, when);
  const peakMultiplier = peak ? rule.peak_multiplier || 1 : 1;
  const withPeak = subtotal * peakMultiplier;
  const beforeMin = Math.max(rule.minimum_fare || 0, withPeak);
  const final = parseFloat(Math.max(0, beforeMin - disc).toFixed(2));

  return {
    final,
    peak,
    peakMultiplier,
    breakdown: {
      rule_name: rule.name,
      vehicle_type: rule.vehicle_type,
      base_fare: rule.base_fare || 0,
      per_mile_rate: rule.per_mile_rate || 0,
      per_minute_rate: rule.per_minute_rate || 0,
      est_miles: parseFloat(m.toFixed(2)),
      est_minutes: parseFloat(t.toFixed(1)),
      mile_charge: parseFloat(mileCharge.toFixed(2)),
      minute_charge: parseFloat(minCharge.toFixed(2)),
      booking_fee: bookingFee,
      peak_applied: peak,
      peak_multiplier: peakMultiplier,
      subtotal: parseFloat(subtotal.toFixed(2)),
      with_peak: parseFloat(withPeak.toFixed(2)),
      discount: disc,
      final_fare: final,
    },
  };
}

export function haversineMiles(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v == null)) return null;
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Estimate minutes from road miles when OSRM duration unavailable. */
export function estimateMinutesFromMiles(miles) {
  const m = Number(miles) || 0;
  if (m <= 0) return 0;
  // ~22 mph average across London traffic
  return Math.max(5, Math.round((m / 22) * 60));
}
