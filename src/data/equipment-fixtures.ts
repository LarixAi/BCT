import type {
  AssignedItem,
  ConsumableLine,
  DocumentItem,
  FixedItem,
  Requirement,
  VehicleEquipment,
} from "@/types/equipment";
import type { VehicleType } from "@/types/yard";
import { vehicles } from "@/data/fixtures";

// ---------- Requirement templates by vehicle type ----------

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

export const REQUIREMENTS_BY_TYPE: Record<VehicleType, Requirement[]> = {
  Minibus: BASE_REQS,
  Coach: [...BASE_REQS, ...COACH_ADDS],
  WAV: [...BASE_REQS, ...WAV_ADDS],
  "Low-floor": [...BASE_REQS, ...WAV_ADDS.filter(r => r.key === "wheelchair-lift")],
};

// School template also available but not auto-applied (needs contract config).
export const SCHOOL_REQS: Requirement[] = [...BASE_REQS, ...SCHOOL_ADDS];

// ---------- Per-vehicle seeded equipment state ----------

function iso(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 86400_000).toISOString();
}

interface EquipSeedOverrides {
  fireExtStatus?: "present" | "expired" | "damaged" | "missing";
  firstAidStatus?: "present" | "expiring" | "expired";
  hammersPresent?: number;   // out of 4
  wavIncomplete?: boolean;   // WAV restraint set missing a clamp
  wavLiftFailed?: boolean;
  wipes?: number;
  gloves?: number;
  keysIssuedTo?: string | null; // null means missing
  extraNote?: string;
}

function defaultOverrides(): EquipSeedOverrides {
  return {
    fireExtStatus: "present",
    firstAidStatus: "present",
    hammersPresent: 4,
    wavIncomplete: false,
    wavLiftFailed: false,
    wipes: 2,
    gloves: 20,
    keysIssuedTo: "J. Miller",
  };
}

function buildEquipmentFor(vehicleId: string, type: VehicleType, o: EquipSeedOverrides = {}): VehicleEquipment {
  const s = { ...defaultOverrides(), ...o };
  const shortId = vehicleId.replace(/[^a-z0-9]/gi, "").toUpperCase();

  const fixed: FixedItem[] = [
    {
      id: `FE-${shortId}-1`, defId: "fire-extinguisher", label: "Fire Extinguisher 1",
      status: s.fireExtStatus === "expired" ? "expired" : s.fireExtStatus === "damaged" ? "damaged" : s.fireExtStatus === "missing" ? "missing" : "present",
      expiryDate: iso(s.fireExtStatus === "expired" ? -14 : 420),
    },
    {
      id: `FE-${shortId}-2`, defId: "fire-extinguisher", label: "Fire Extinguisher 2",
      status: "present", expiryDate: iso(560),
    },
    {
      id: `FA-${shortId}`, defId: "first-aid-kit", label: "First Aid Kit",
      status: s.firstAidStatus ?? "present",
      expiryDate: iso(s.firstAidStatus === "expiring" ? 21 : s.firstAidStatus === "expired" ? -3 : 380),
    },
    {
      id: `GH-${shortId}`, defId: "glass-hammers", label: "Emergency Hammers",
      status: (s.hammersPresent ?? 4) < (type === "Coach" ? 4 : 2) ? "incomplete" : "complete",
      count: { present: s.hammersPresent ?? (type === "Coach" ? 4 : 2), required: type === "Coach" ? 4 : 2 },
    },
  ];

  if (type === "WAV" || type === "Low-floor") {
    fixed.push({
      id: `WL-${shortId}`, defId: "wheelchair-lift", label: "Wheelchair Lift",
      status: s.wavLiftFailed ? "damaged" : "present",
      inspectionDueDate: iso(s.wavLiftFailed ? -1 : 90),
      note: s.wavLiftFailed ? "Ram pressure failed on inspection" : undefined,
    });
  }

  const assigned: AssignedItem[] = [
    { id: `HV-${shortId}`, defId: "hi-vis", label: "Hi-vis vest", status: "present", assignedAt: iso(-3), assignedBy: "J. Miller" },
    { id: `WT-${shortId}`, defId: "warning-triangle", label: "Warning triangle", status: "present", assignedAt: iso(-5), assignedBy: "J. Miller" },
    { id: `TR-${shortId}`, defId: "torch", label: "Driver torch", status: "present", assignedAt: iso(-10), assignedBy: "J. Miller" },
    { id: `AP-${shortId}`, defId: "accident-pack", label: "Accident pack", status: "present", assignedAt: iso(-30), assignedBy: "J. Miller" },
  ];

  if (type === "Coach") {
    assigned.push({ id: `BD-${shortId}`, defId: "breakdown-pack", label: "Breakdown pack", status: "present", assignedAt: iso(-20), assignedBy: "J. Miller" });
  }

  if (type === "WAV") {
    const clampsPresent = s.wavIncomplete ? 3 : 4;
    assigned.push({
      id: `WCS-${shortId}`, defId: "wheelchair-set", label: "Wheelchair Restraint Set",
      status: s.wavIncomplete ? "incomplete" : "complete",
      assignedAt: iso(-7),
      assignedBy: "J. Miller",
      components: [
        { id: `WC-C-${shortId}-1`, label: "Clamp 1", present: true },
        { id: `WC-C-${shortId}-2`, label: "Clamp 2", present: true },
        { id: `WC-C-${shortId}-3`, label: "Clamp 3", present: clampsPresent >= 3 },
        { id: `WC-C-${shortId}-4`, label: "Clamp 4", present: clampsPresent >= 4 },
        { id: `WC-B-${shortId}`, label: "Occupant Belt", present: true },
        { id: `WC-R-${shortId}`, label: "Restraint", present: true },
      ],
    });
  }

  const consumables: ConsumableLine[] = [
    { defId: "gloves", label: "Disposable gloves", current: s.gloves ?? 20, target: 20, unit: "pairs" },
    { defId: "wipes", label: "Cleaning wipes", current: s.wipes ?? 2, target: 2, unit: "packs" },
    { defId: "masks", label: "Face masks", current: 10, target: 10, unit: "units" },
    { defId: "sick-bags", label: "Sick bags", current: 5, target: 5, unit: "units" },
  ];

  const documents: DocumentItem[] = [
    { id: `FC-${shortId}`, label: "Fuel card", status: "present", detail: `FC-${shortId.slice(-3)}` },
    { id: `KY-${shortId}`, label: "Vehicle keys", status: s.keysIssuedTo === null ? "missing" : "present", detail: s.keysIssuedTo ? `Issued to ${s.keysIssuedTo}` : "Not signed out" },
    { id: `DB-${shortId}`, label: "Defect book", status: "present" },
    { id: `AC-${shortId}`, label: "Accident pack", status: "present" },
  ];

  return { fixed, assigned, consumables, documents };
}

// Per-vehicle overrides that give the prototype visible variety.
const OVERRIDES: Record<string, EquipSeedOverrides> = {
  v2: { fireExtStatus: "expired", extraNote: "VOR — brake" },   // WP19 KLD — safety failure
  v4: { wipes: 0, gloves: 8 },                                   // LG21 YPT — warnings on departure line
  v7: { wipes: 1, gloves: 12 },
  v11: { hammersPresent: 1 },
  v15: { wavIncomplete: true },                                  // HD23 RFV WAV — restricted
  v16: { firstAidStatus: "expiring" },
  v18: { wavIncomplete: false },
};

export const initialVehicleEquipment: Record<string, VehicleEquipment> = Object.fromEntries(
  vehicles.map(v => [v.id, buildEquipmentFor(v.id, v.type, OVERRIDES[v.id])])
);

// ---------- Depot stock (for restock sheet) ----------

export interface StockLine { defId: string; label: string; onHand: number; unit: string }
export const initialDepotStock: StockLine[] = [
  { defId: "gloves", label: "Disposable gloves", onHand: 480, unit: "pairs" },
  { defId: "wipes", label: "Cleaning wipes", onHand: 42, unit: "packs" },
  { defId: "masks", label: "Face masks", onHand: 260, unit: "units" },
  { defId: "sick-bags", label: "Sick bags", onHand: 180, unit: "units" },
];
