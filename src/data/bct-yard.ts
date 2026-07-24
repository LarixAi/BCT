import type { Bay, Trip, Vehicle } from "@/types/yard";
import { BCT_DEPOT_META } from "@veyvio/yard";

/** Demo fleet for BCT Main Depot Live Yard Map (Phase 1). */
export const BCT_DEPOT = BCT_DEPOT_META;

export const bctBays: Bay[] = Array.from({ length: 26 }, (_, i) => {
  const n = i + 1;
  return {
    id: `BAY-${String(n).padStart(2, "0")}`,
    zone: "Parking",
    bayNumber: n,
    displayName: `Bay ${n}`,
  };
});

export const bctVehicles: Vehicle[] = [
  { id: "bct-v1", reg: "WX21 FYV", type: "Minibus", bayId: "BAY-01", status: "Available", fuelPct: 78, lastCheckAt: "2026-07-23T04:10:00Z", lastCheckPassed: true },
  { id: "bct-v3", reg: "EO71 NTJ", type: "Minibus", bayId: "BAY-03", status: "Awaiting Check", fuelPct: 45, notes: "PMI due" },
  { id: "bct-v4", reg: "YG68 AKF", type: "Minibus", bayId: "BAY-04", status: "Awaiting Check", fuelPct: 62, notes: "Cleaning in progress" },
  { id: "bct-v8", reg: "HV20 PLK", type: "Minibus", bayId: "BAY-08", status: "Available", fuelPct: 71, lastCheckAt: "2026-07-22T18:00:00Z", lastCheckPassed: true },
  { id: "bct-v10", reg: "LM19 BCT", type: "Minibus", bayId: "BAY-10", status: "VOR", fuelPct: 30, notes: "Brake defect" },
  { id: "bct-v15", reg: "NK22 HRP", type: "WAV", bayId: "BAY-15", status: "Available", fuelPct: 88 },
  { id: "bct-v20", reg: "PF70 XTR", type: "Low-floor", bayId: "BAY-20", status: "In Workshop", fuelPct: 55 },
  { id: "bct-v22", reg: "RS21 MNB", type: "Minibus", bayId: "BAY-22", status: "Available", fuelPct: 66 },
];

export const bctTrips: Trip[] = [
  { id: "bct-t1", code: "RUN-24017", service: "Morning school", departAt: "07:15", vehicleId: "bct-v1", driverId: "d1", ready: true, blockers: [] },
  { id: "bct-t2", code: "RUN-24022", service: "Day centre", departAt: "09:30", vehicleId: "bct-v10", driverId: "d2", ready: false, blockers: ["VOR"] },
];

/** Use BCT demo data when depot is BCT-MAIN or live map is forced via env. */
export function shouldUseBctDemoData(depotCode: string | null | undefined): boolean {
  if (depotCode?.toUpperCase() === "BCT-MAIN") return true;
  return import.meta.env.VITE_LIVE_YARD_MAP_DEMO === "true";
}
