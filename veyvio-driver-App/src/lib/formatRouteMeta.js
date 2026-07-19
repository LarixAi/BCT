/** Human-readable ETA and distance from OSRM route meta. */
export function formatRouteEta(durationSec) {
  if (durationSec == null || Number.isNaN(durationSec)) return null;
  const min = Math.max(1, Math.round(durationSec / 60));
  return `${min} min`;
}

export function formatRouteDistance(distanceMi) {
  if (distanceMi == null || Number.isNaN(distanceMi)) return null;
  if (distanceMi < 0.1) return "< 0.1 mi";
  if (distanceMi < 10) return `${distanceMi.toFixed(1)} mi`;
  return `${Math.round(distanceMi)} mi`;
}

export function formatRouteSummary({ durationSec, distanceMi }) {
  const eta = formatRouteEta(durationSec);
  const dist = formatRouteDistance(distanceMi);
  if (eta && dist) return `${eta} · ${dist}`;
  return eta || dist || null;
}
