import type {
  CustodyEvent,
  DamageObservation,
  DamageRecord,
  DamageReview,
  InspectionMedia,
  RepairWorkOrder,
  VehicleConditionProfile,
  VehicleConditionSnapshot,
  VehicleInspection,
} from "@/types/condition";

const now = "2026-07-11T04:00:00Z";

export const conditionProfiles: Record<string, VehicleConditionProfile> = {
  v1: { vehicleId: "v1", baselineStatus: "approved", conditionRating: "good", latestSnapshotId: "snap_v1", latestApprovedInspectionId: "insp_v1_base" },
  v3: { vehicleId: "v3", baselineStatus: "approved", conditionRating: "fair", latestSnapshotId: "snap_v3", latestApprovedInspectionId: "insp_v3_base" },
  v7: { vehicleId: "v7", baselineStatus: "not_started", conditionRating: "unknown" },
  v9: { vehicleId: "v9", baselineStatus: "not_started", conditionRating: "unknown" },
  v10: { vehicleId: "v10", baselineStatus: "approved", conditionRating: "good", latestSnapshotId: "snap_v10", latestApprovedInspectionId: "insp_v10_base" },
};

export const inspections: VehicleInspection[] = [
  {
    id: "insp_v1_base",
    vehicleId: "v1",
    inspectionType: "onboarding-baseline",
    sourceApp: "yard",
    status: "approved",
    startedBy: "T. Manager",
    startedAt: "2026-03-15T09:00:00Z",
    completedAt: "2026-03-15T10:12:00Z",
    approvedBy: "T. Manager",
    approvedAt: "2026-03-15T10:30:00Z",
    mileage: 42100,
    location: "B3",
  },
  {
    id: "insp_v3_base",
    vehicleId: "v3",
    inspectionType: "onboarding-baseline",
    sourceApp: "yard",
    status: "approved",
    startedBy: "J. Miller",
    startedAt: "2026-01-20T08:00:00Z",
    completedAt: "2026-01-20T09:45:00Z",
    approvedBy: "T. Manager",
    approvedAt: "2026-01-20T11:00:00Z",
    mileage: 18400,
    location: "B3",
  },
  {
    id: "insp_v3_recent",
    vehicleId: "v3",
    inspectionType: "yard-check",
    sourceApp: "yard",
    status: "approved",
    startedBy: "J. Miller",
    startedAt: "2026-07-11T04:15:00Z",
    completedAt: "2026-07-11T04:20:00Z",
    approvedBy: "J. Miller",
    approvedAt: "2026-07-11T04:20:00Z",
    mileage: 22180,
    checkId: "c_sample",
  },
];

export const inspectionMedia: InspectionMedia[] = [
  {
    id: "med_v3_base_ns",
    inspectionId: "insp_v3_base",
    vehicleZoneId: "ns-rear-quarter",
    captureSlotId: "ns-rear",
    mediaType: "photo",
    dataUrl: evidencePlaceholder("Baseline · NS rear", 210),
    capturedAt: "2026-01-20T09:30:00Z",
    capturedBy: "J. Miller",
    qualityStatus: "accepted",
    offlineCapture: false,
    evidenceRole: "context",
  },
  {
    id: "med_v3_recent_ns",
    inspectionId: "insp_v3_recent",
    vehicleZoneId: "ns-rear-quarter",
    captureSlotId: "ns-rear",
    mediaType: "photo",
    dataUrl: evidencePlaceholder("Latest · NS rear", 25),
    capturedAt: "2026-07-11T04:18:00Z",
    capturedBy: "J. Miller",
    qualityStatus: "accepted",
    offlineCapture: false,
    evidenceRole: "context",
  },
];

function evidencePlaceholder(label: string, hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect fill="hsl(${hue},40%,42%)" width="640" height="480"/><text x="320" y="240" text-anchor="middle" fill="white" font-family="sans-serif" font-size="18">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const damageRecords: DamageRecord[] = [
  {
    id: "dmg184",
    vehicleId: "v3",
    zoneId: "ns-rear-quarter",
    damageType: "scratch",
    severity: "cosmetic",
    status: "awaiting_verification",
    origin: "existing_at_onboarding",
    title: "Nearside rear quarter scratch",
    description: "Light scratch — documented at onboarding, unchanged since.",
    firstObservedAt: "2026-01-20T09:30:00Z",
    firstObservationId: "obs_v3_1",
    lastConfirmedAt: "2026-07-11T04:18:00Z",
  },
  {
    id: "dmg201",
    vehicleId: "v10",
    zoneId: "rear-bumper",
    damageType: "scuff",
    severity: "cosmetic",
    status: "awaiting_review",
    origin: "discovered_yard_check",
    title: "Rear bumper scuff",
    description: "White paint transfer on rear bumper — driver report pending review.",
    firstObservedAt: "2026-07-11T03:50:00Z",
    firstObservationId: "obs_v10_1",
    lastConfirmedAt: "2026-07-11T03:50:00Z",
  },
];

export const damageObservations: DamageObservation[] = [
  {
    id: "obs_v3_1",
    damageId: "dmg184",
    inspectionId: "insp_v3_base",
    vehicleId: "v3",
    zoneId: "ns-rear-quarter",
    reportSource: "yard_inspection",
    reportedBy: "J. Miller",
    observedAt: "2026-01-20T09:30:00Z",
    classification: "new_not_reported",
    damageType: "scratch",
    description: "Light scratch on nearside rear quarter panel.",
    severity: "cosmetic",
    safeToOperate: true,
    mediaIds: [],
  },
  {
    id: "obs_v10_1",
    inspectionId: "insp_pending",
    vehicleId: "v10",
    zoneId: "rear-bumper",
    reportSource: "driver_report",
    reportedBy: "Davies, M.",
    observedAt: "2026-07-11T03:48:00Z",
    classification: "new_not_reported",
    damageType: "scuff",
    description: "Reversing into bollard — paint transfer on rear bumper.",
    severity: "cosmetic",
    safeToOperate: true,
    tripId: "t2",
    mediaIds: [],
  },
  {
    id: "obs_review_1",
    inspectionId: "insp_v7_draft",
    vehicleId: "v7",
    zoneId: "os-front-wing",
    reportSource: "driver_report",
    reportedBy: "Thompson, R.",
    observedAt: now,
    classification: "possible_new_review",
    damageType: "dent",
    description: "Small dent on offside front wing — may be existing mark.",
    severity: "operational",
    safeToOperate: true,
    mediaIds: [],
  },
];

export const damageReviews: DamageReview[] = [];

export const conditionSnapshots: VehicleConditionSnapshot[] = [
  {
    id: "snap_v1",
    vehicleId: "v1",
    inspectionId: "insp_v1_base",
    approvedAt: "2026-03-15T10:30:00Z",
    approvedBy: "T. Manager",
    conditionRating: "good",
    openDamageCount: 0,
    summary: "Clean baseline — no pre-existing damage recorded.",
  },
  {
    id: "snap_v3",
    vehicleId: "v3",
    inspectionId: "insp_v3_base",
    approvedAt: "2026-01-20T11:00:00Z",
    approvedBy: "T. Manager",
    conditionRating: "fair",
    openDamageCount: 1,
    summary: "One cosmetic scratch documented at onboarding.",
  },
];

export const custodyTimeline: CustodyEvent[] = [
  { id: "cust_1", vehicleId: "v10", at: "2026-07-11T04:02:00Z", kind: "yard_inspection", label: "Yard inspection completed — no damage", actor: "J. Miller" },
  { id: "cust_2", vehicleId: "v10", at: "2026-07-11T05:00:00Z", kind: "driver_assignment", label: "Assigned to Davies, M.", actor: "Dispatch", referenceId: "d2" },
  { id: "cust_3", vehicleId: "v10", at: "2026-07-11T05:15:00Z", kind: "duty_start", label: "Duty started — R115 Airport X", referenceId: "t2" },
  { id: "cust_4", vehicleId: "v10", at: "2026-07-11T03:48:00Z", kind: "return_to_depot", label: "Driver damage report filed", actor: "Davies, M." },
];

export const repairWorkOrders: RepairWorkOrder[] = [
  {
    id: "rwo1",
    vehicleId: "v6",
    defectId: "df2",
    status: "in_progress",
    description: "Rear brake line replacement",
    assignedTo: "Workshop S02",
    requestedAt: "2026-07-09T14:30:00Z",
    requestedBy: "T. Manager",
  },
  {
    id: "rwo2",
    vehicleId: "v3",
    damageId: "dmg184",
    status: "awaiting_verification",
    description: "Touch-up paint — nearside rear quarter",
    assignedTo: "Workshop S01",
    requestedAt: "2026-07-10T10:00:00Z",
    requestedBy: "J. Miller",
    completedAt: "2026-07-11T02:00:00Z",
  },
];

export function buildInitialConditionProfiles(vehicleIds: string[]): Record<string, VehicleConditionProfile> {
  const out = { ...conditionProfiles };
  for (const id of vehicleIds) {
    if (!out[id]) {
      out[id] = { vehicleId: id, baselineStatus: "not_started", conditionRating: "unknown" };
    }
  }
  return out;
}
