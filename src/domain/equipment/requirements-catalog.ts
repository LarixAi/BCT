import type { Requirement } from "@/types/equipment";
import type { VehicleType } from "@/types/yard";

const BASE_REQS: Requirement[] = [
  { key: "fire-extinguisher", label: "Fire extinguishers", category: "fixed", criticality: "safety-critical", departureRule: "block" },
  { key: "first-aid-kit", label: "First aid kit", category: "fixed", criticality: "safety-critical", departureRule: "block" },
  { key: "hi-vis", label: "Hi-vis vest", category: "reusable", criticality: "warning", departureRule: "warn" },
  { key: "warning-triangle", label: "Warning triangle", category: "reusable", criticality: "service-critical", departureRule: "warn" },
  { key: "torch", label: "Torch", category: "reusable", criticality: "warning", departureRule: "warn" },
  { key: "accident-pack", label: "Accident pack", category: "reusable", criticality: "service-critical", departureRule: "warn" },
  { key: "glass-hammers", label: "Emergency hammers", category: "fixed", criticality: "safety-critical", departureRule: "block" },
  { key: "gloves", label: "Disposable gloves", category: "consumable", criticality: "warning", departureRule: "warn", minQty: 20 },
  { key: "wipes", label: "Cleaning wipes", category: "consumable", criticality: "warning", departureRule: "warn", minQty: 2 },
  { key: "masks", label: "Face masks", category: "consumable", criticality: "info", departureRule: "info", minQty: 10 },
  { key: "sick-bags", label: "Sick bags", category: "consumable", criticality: "warning", departureRule: "warn", minQty: 5 },
  { key: "fuel-card", label: "Fuel card", category: "document", criticality: "service-critical", departureRule: "warn" },
  { key: "vehicle-keys", label: "Vehicle keys", category: "document", criticality: "safety-critical", departureRule: "block" },
  { key: "defect-book", label: "Defect book", category: "document", criticality: "service-critical", departureRule: "warn" },
];

const WAV_ADDS: Requirement[] = [
  { key: "wheelchair-lift", label: "Wheelchair lift", category: "fixed", criticality: "safety-critical", departureRule: "restrict", serviceRestriction: "wheelchair" },
  { key: "wheelchair-set", label: "Wheelchair restraint set", category: "reusable", criticality: "service-critical", departureRule: "restrict", serviceRestriction: "wheelchair" },
];

const COACH_ADDS: Requirement[] = [
  { key: "breakdown-pack", label: "Breakdown pack", category: "reusable", criticality: "warning", departureRule: "warn" },
];

const SCHOOL_ADDS: Requirement[] = [
  { key: "booster-seat", label: "Booster seats", category: "reusable", criticality: "service-critical", departureRule: "restrict", serviceRestriction: "school" },
];

/** Equipment requirement templates by vehicle type (catalog, not inventory). */
export const REQUIREMENTS_BY_TYPE: Record<VehicleType, Requirement[]> = {
  Minibus: BASE_REQS,
  Coach: [...BASE_REQS, ...COACH_ADDS],
  WAV: [...BASE_REQS, ...WAV_ADDS],
  "Low-floor": [...BASE_REQS, ...WAV_ADDS.filter(r => r.key === "wheelchair-lift")],
};

/** School template — not auto-applied (needs contract config). */
export const SCHOOL_REQS: Requirement[] = [...BASE_REQS, ...SCHOOL_ADDS];
