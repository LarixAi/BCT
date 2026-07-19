/** London demand zones — intensity 0 (cold) to 1 (hot). */
export const DEMAND_ZONES = [
  { id: "central", label: "Central London", lat: 51.5074, lng: -0.1278, intensity: 0.95, jobsPerHour: 42, waitMins: "1–3" },
  { id: "city", label: "City of London", lat: 51.5155, lng: -0.0922, intensity: 0.88, jobsPerHour: 36, waitMins: "2–4" },
  { id: "heathrow", label: "Heathrow", lat: 51.4700, lng: -0.4543, intensity: 0.82, jobsPerHour: 28, waitMins: "3–6" },
  { id: "canary", label: "Canary Wharf", lat: 51.5054, lng: -0.0235, intensity: 0.74, jobsPerHour: 24, waitMins: "4–7" },
  { id: "kings-cross", label: "King's Cross", lat: 51.5308, lng: -0.1238, intensity: 0.72, jobsPerHour: 22, waitMins: "3–5" },
  { id: "waterloo", label: "Waterloo", lat: 51.5033, lng: -0.1145, intensity: 0.68, jobsPerHour: 20, waitMins: "4–6" },
  { id: "victoria", label: "Victoria", lat: 51.4952, lng: -0.1441, intensity: 0.65, jobsPerHour: 18, waitMins: "5–8" },
  { id: "stratford", label: "Stratford", lat: 51.5416, lng: -0.0032, intensity: 0.52, jobsPerHour: 12, waitMins: "6–10" },
  { id: "croydon", label: "Croydon", lat: 51.3721, lng: -0.1000, intensity: 0.38, jobsPerHour: 8, waitMins: "10–15" },
  { id: "bromley", label: "Bromley", lat: 51.4039, lng: 0.0140, intensity: 0.28, jobsPerHour: 5, waitMins: "15+" },
  { id: "enfield", label: "Enfield", lat: 51.6523, lng: -0.0810, intensity: 0.25, jobsPerHour: 4, waitMins: "15+" },
  { id: "hounslow", label: "Hounslow", lat: 51.4740, lng: -0.3670, intensity: 0.32, jobsPerHour: 6, waitMins: "12–18" },
];

export function zoneLevel(intensity) {
  if (intensity >= 0.7) return "hot";
  if (intensity >= 0.45) return "warm";
  return "cold";
}

export function zoneLevelLabel(level) {
  return { hot: "Hot", warm: "Warm", cold: "Cold" }[level] || "Cold";
}

export { zoneHeatColor as zoneColor, zoneHeatCircleOptions } from "@/lib/driverMapTheme";

export function zoneRadiusM(intensity) {
  return 800 + intensity * 1200;
}
