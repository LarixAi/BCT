// Veyvio Yard — Equipment & Stock domain (frontend prototype).

export type EqCategory = "fixed" | "reusable" | "consumable" | "document";

export type Criticality = "safety-critical" | "service-critical" | "warning" | "info";

export type DepartureRule = "block" | "restrict" | "warn" | "info";

export type EqStatus =
  | "present"
  | "complete"
  | "missing"
  | "damaged"
  | "expired"
  | "expiring"
  | "inspection-due"
  | "incomplete"
  | "low";

export interface FixedItem {
  id: string;               // asset id, e.g. FE-00491
  defId: string;            // slug, e.g. fire-extinguisher
  label: string;            // "Fire Extinguisher 1"
  status: EqStatus;
  expiryDate?: string;      // ISO
  inspectionDueDate?: string;
  count?: { present: number; required: number };
  note?: string;
}

export interface KitComponent {
  id: string;
  label: string;
  present: boolean;
}

export interface AssignedItem {
  id: string;               // asset id, e.g. WCS-014
  defId: string;
  label: string;
  status: EqStatus;
  components?: KitComponent[]; // when kit
  assignedAt: string;
  assignedBy: string;
}

export interface ConsumableLine {
  defId: string;
  label: string;
  current: number;
  target: number;
  unit: string;             // "pairs", "packs", "units"
}

export interface DocumentItem {
  id: string;
  label: string;
  status: EqStatus;         // present | missing
  detail?: string;
}

export interface VehicleEquipment {
  fixed: FixedItem[];
  assigned: AssignedItem[];
  consumables: ConsumableLine[];
  documents: DocumentItem[];
}

export interface Requirement {
  key: string;
  label: string;
  category: EqCategory;
  criticality: Criticality;
  departureRule: DepartureRule;
  minQty?: number;
  serviceRestriction?: string; // e.g. "wheelchair"
}

export type ReadinessState = "ready" | "warnings" | "restricted" | "blocked" | "vor" | "unknown";

export interface EquipmentAuditEvent {
  id: string;
  vehicleId: string;
  at: string;
  by: string;
  kind:
    | "assigned"
    | "unassigned"
    | "restocked"
    | "reported-missing"
    | "reported-damaged"
    | "reported-expired"
    | "sent-for-inspection"
    | "replaced"
    | "cleared";
  target: string;
  detail: string;
}

export interface ReadinessResult {
  state: ReadinessState;
  totals: { complete: number; total: number };
  blockers: string[];        // safety-critical failures
  restrictions: string[];    // service-critical failures ("no wheelchair journeys")
  warnings: string[];        // low / expiring / minor
  summary: string;           // one-line for the vehicle card
}
