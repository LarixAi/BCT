/** Accent for active journey map UI — matches reference mock orange CTAs. */
export const JOURNEY_ACCENT = "#FF5722";
export const JOURNEY_ACCENT_HOVER = "#E64A19";

export function formatJourneyArrivalTime(durationSeconds) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return "";
  const arrival = new Date(Date.now() + durationSeconds * 1000);
  return arrival.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function parseRouteDurationSeconds(duration) {
  if (duration == null) return null;
  const match = String(duration).match(/(\d+)s/);
  return match ? Number(match[1]) : null;
}

export function formatThenStep(nextStep) {
  if (!nextStep) return null;
  const maneuver = nextStep?.navigationInstruction?.maneuver;
  const text = nextStep?.navigationInstruction?.instructions;
  switch (maneuver) {
    case "TURN_LEFT":
    case "TURN_SLIGHT_LEFT":
    case "TURN_SHARP_LEFT":
      return "Then turn left";
    case "TURN_RIGHT":
    case "TURN_SLIGHT_RIGHT":
    case "TURN_SHARP_RIGHT":
      return "Then turn right";
    case "UTURN_LEFT":
    case "UTURN_RIGHT":
      return "Then U-turn";
    case "ROUNDABOUT_LEFT":
    case "ROUNDABOUT_RIGHT":
      return "Then take roundabout";
    case "MERGE":
      return "Then merge";
    default:
      if (text) {
        const short = text.length > 28 ? `${text.slice(0, 26)}…` : text;
        return `Then ${short.charAt(0).toLowerCase()}${short.slice(1)}`;
      }
      return null;
  }
}
