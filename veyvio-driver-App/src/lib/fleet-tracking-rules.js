export const DEFAULT_FLEET_TRACKING_SETTINGS = {
  speedingWarningMph: 5,
  speedingMinorMph: 6,
  speedingMajorMph: 11,
  speedingCriticalMph: 16,
  harshBrakeMphDrop: 15,
  harshAccelMphGain: 12,
  sharpTurnDegrees: 45,
  longIdleMinutes: 10,
};

export const EVENT_SCORE_DEDUCTIONS = {
  info: 0,
  minor: 3,
  major: 8,
  critical: 15,
};

export function geohashKey(lat, lng, precision = 3) {
  const factor = 10 ** precision;
  return `${Math.round(lat * factor) / factor}:${Math.round(lng * factor) / factor}`;
}

export function speedingSeverity(overLimitMph, settings = DEFAULT_FLEET_TRACKING_SETTINGS) {
  if (overLimitMph <= 0) return null;
  if (overLimitMph >= settings.speedingCriticalMph) return "critical";
  if (overLimitMph >= settings.speedingMajorMph) return "major";
  if (overLimitMph >= settings.speedingMinorMph) return "minor";
  if (overLimitMph >= settings.speedingWarningMph) return "info";
  return null;
}

export function driverSpeedStatus(speedMph, limitMph, accuracyMeters, settings = DEFAULT_FLEET_TRACKING_SETTINGS) {
  if (accuracyMeters != null && accuracyMeters > 25) return "weak_gps";
  if (typeof speedMph !== "number") return "unknown";
  if (typeof limitMph !== "number") return "unknown";
  const over = speedMph - limitMph;
  if (over >= settings.speedingMajorMph) return "danger";
  if (over >= settings.speedingWarningMph) return "warning";
  return "safe";
}

export function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}
