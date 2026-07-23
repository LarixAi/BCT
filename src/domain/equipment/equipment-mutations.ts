import type {
  AssignedItem,
  ConsumableLine,
  EquipmentAuditEvent,
  EquipmentCheckRecord,
  VehicleEquipment,
} from "@/types/equipment";

export type EquipmentIssue = "missing" | "damaged" | "expired" | "inspection";
export type EquipmentItemKind = "fixed" | "assigned";
export type EquipmentCheckKind = "fixed" | "assigned" | "document";

export interface DepotStockLine {
  defId: string;
  label: string;
  onHand: number;
  unit: string;
}

export interface EquipmentMutationMeta {
  vehicleId: string;
  at: string;
  by: string;
  nextAuditId: () => string;
}

export interface EquipmentAssignResult {
  equipment: VehicleEquipment;
  audit: EquipmentAuditEvent;
  itemId: string;
  label: string;
}

export interface EquipmentUnassignResult {
  equipment: VehicleEquipment;
  audit: EquipmentAuditEvent;
  itemId: string;
}

export interface EquipmentTransferResult {
  sourceEquipment: VehicleEquipment;
  targetEquipment: VehicleEquipment;
  audit: EquipmentAuditEvent;
  itemId: string;
  label: string;
}

export interface EquipmentRestockResult {
  equipment: VehicleEquipment;
  depotStock: DepotStockLine[];
  audit: EquipmentAuditEvent;
  defId: string;
}

export interface EquipmentIssueResult {
  equipment: VehicleEquipment;
  audit: EquipmentAuditEvent;
}

const ISSUE_STATUS = {
  missing: "missing",
  damaged: "damaged",
  expired: "expired",
  inspection: "inspection-due",
} as const;

function auditKindForIssue(issue: EquipmentIssue): EquipmentAuditEvent["kind"] {
  if (issue === "missing") return "reported-missing";
  if (issue === "damaged") return "reported-damaged";
  if (issue === "expired") return "reported-expired";
  return "sent-for-inspection";
}

export function applyAssignEquipment(
  eq: VehicleEquipment | undefined,
  item: Omit<AssignedItem, "assignedAt" | "assignedBy">,
  meta: EquipmentMutationMeta,
): EquipmentAssignResult | null {
  if (!eq) return null;
  const newItem: AssignedItem = { ...item, assignedAt: meta.at, assignedBy: meta.by };
  return {
    equipment: { ...eq, assigned: [newItem, ...eq.assigned] },
    audit: {
      id: meta.nextAuditId(),
      vehicleId: meta.vehicleId,
      at: meta.at,
      by: meta.by,
      kind: "assigned",
      target: newItem.id,
      detail: `Assigned ${newItem.label} (${newItem.id})`,
    },
    itemId: newItem.id,
    label: newItem.label,
  };
}

export function applyUnassignEquipment(
  eq: VehicleEquipment | undefined,
  itemId: string,
  reason: string,
  destination: string,
  meta: EquipmentMutationMeta,
): EquipmentUnassignResult | null {
  if (!eq) return null;
  const item = eq.assigned.find(a => a.id === itemId);
  if (!item) return null;
  return {
    equipment: { ...eq, assigned: eq.assigned.filter(a => a.id !== itemId) },
    audit: {
      id: meta.nextAuditId(),
      vehicleId: meta.vehicleId,
      at: meta.at,
      by: meta.by,
      kind: "unassigned",
      target: itemId,
      detail: `Unassigned ${item.label} → ${destination} (${reason})`,
    },
    itemId,
  };
}

export function applyTransferEquipment(
  sourceEq: VehicleEquipment | undefined,
  targetEq: VehicleEquipment | undefined,
  itemId: string,
  toVehicleReg: string,
  meta: EquipmentMutationMeta,
): EquipmentTransferResult | null {
  if (!sourceEq || !targetEq) return null;
  const item = sourceEq.assigned.find(a => a.id === itemId);
  if (!item) return null;
  if (targetEq.assigned.some(a => a.id === itemId)) return null;

  const transferred: AssignedItem = {
    ...item,
    assignedAt: meta.at,
    assignedBy: meta.by,
    lastCheck: undefined,
    status: item.status === "missing" || item.status === "incomplete" ? "present" : item.status,
  };

  return {
    sourceEquipment: {
      ...sourceEq,
      assigned: sourceEq.assigned.filter(a => a.id !== itemId),
    },
    targetEquipment: {
      ...targetEq,
      assigned: [transferred, ...targetEq.assigned],
    },
    audit: {
      id: meta.nextAuditId(),
      vehicleId: meta.vehicleId,
      at: meta.at,
      by: meta.by,
      kind: "transferred",
      target: itemId,
      detail: `${item.label} (${item.qrCode ?? item.id}) transferred to ${toVehicleReg}`,
    },
    itemId,
    label: item.label,
  };
}

export function applyRestockConsumable(
  eq: VehicleEquipment | undefined,
  depotStock: DepotStockLine[],
  defId: string,
  addQty: number,
  meta: EquipmentMutationMeta,
): EquipmentRestockResult | null {
  if (!eq) return null;
  const line = eq.consumables.find(c => c.defId === defId);
  if (!line) return null;
  const consumables: ConsumableLine[] = eq.consumables.map(c =>
    c.defId === defId ? { ...c, current: Math.min(c.target, c.current + addQty) } : c,
  );
  return {
    equipment: { ...eq, consumables },
    depotStock: depotStock.map(s =>
      s.defId === defId ? { ...s, onHand: Math.max(0, s.onHand - addQty) } : s,
    ),
    audit: {
      id: meta.nextAuditId(),
      vehicleId: meta.vehicleId,
      at: meta.at,
      by: meta.by,
      kind: "restocked",
      target: defId,
      detail: `Restocked ${line.label} +${addQty} ${line.unit}`,
    },
    defId,
  };
}

export function applyReportEquipmentIssue(
  eq: VehicleEquipment | undefined,
  kind: EquipmentItemKind,
  itemId: string,
  issue: EquipmentIssue,
  note: string | undefined,
  meta: EquipmentMutationMeta,
): EquipmentIssueResult | null {
  if (!eq) return null;
  const target = kind === "fixed" ? eq.fixed.find(i => i.id === itemId) : eq.assigned.find(i => i.id === itemId);
  if (!target) return null;
  const status = ISSUE_STATUS[issue];
  const label = target.label;
  let nextEq: VehicleEquipment;
  if (kind === "fixed") {
    nextEq = {
      ...eq,
      fixed: eq.fixed.map(i =>
        i.id === itemId ? { ...i, status, note: note ?? i.note } : i,
      ),
    };
  } else {
    nextEq = {
      ...eq,
      assigned: eq.assigned.map(i =>
        i.id === itemId ? { ...i, status } : i,
      ),
    };
  }
  return {
    equipment: nextEq,
    audit: {
      id: meta.nextAuditId(),
      vehicleId: meta.vehicleId,
      at: meta.at,
      by: meta.by,
      kind: auditKindForIssue(issue),
      target: itemId,
      detail: `${label} — ${issue}${note ? `: ${note}` : ""}`,
    },
  };
}

export function applyClearEquipmentIssue(
  eq: VehicleEquipment | undefined,
  kind: EquipmentItemKind,
  itemId: string,
  note: string | undefined,
  meta: EquipmentMutationMeta,
): EquipmentIssueResult | null {
  if (!eq) return null;
  const target = kind === "fixed" ? eq.fixed.find(i => i.id === itemId) : eq.assigned.find(i => i.id === itemId);
  if (!target) return null;
  const label = target.label;
  let nextEq: VehicleEquipment;
  if (kind === "fixed") {
    nextEq = {
      ...eq,
      fixed: eq.fixed.map(i =>
        i.id === itemId
          ? {
              ...i,
              status: (i.count && i.count.present === i.count.required ? "complete" : "present") as VehicleEquipment["fixed"][number]["status"],
            }
          : i,
      ),
    };
  } else {
    nextEq = {
      ...eq,
      assigned: eq.assigned.map(i =>
        i.id === itemId ? { ...i, status: "present" as const } : i,
      ),
    };
  }
  return {
    equipment: nextEq,
    audit: {
      id: meta.nextAuditId(),
      vehicleId: meta.vehicleId,
      at: meta.at,
      by: meta.by,
      kind: "cleared",
      target: itemId,
      detail: `${label} cleared${note ? `: ${note}` : ""}`,
    },
  };
}

function presenceStatusForFixed(
  item: VehicleEquipment["fixed"][number],
  present: boolean,
): VehicleEquipment["fixed"][number]["status"] {
  if (!present) {
    if (item.count) return "incomplete";
    return "missing";
  }
  if (item.count) {
    return item.count.present >= item.count.required ? "complete" : "present";
  }
  if (item.status === "damaged" || item.status === "expired" || item.status === "expiring" || item.status === "inspection-due") {
    return item.status;
  }
  return "present";
}

function presenceStatusForAssigned(
  item: AssignedItem,
  present: boolean,
): AssignedItem["status"] {
  if (!present) {
    if (item.components) return "incomplete";
    return "missing";
  }
  if (item.components) {
    const allPresent = item.components.every(c => c.present);
    return allPresent ? "complete" : "incomplete";
  }
  if (item.status === "damaged") return "damaged";
  return "present";
}

export function applyRecordEquipmentPresence(
  eq: VehicleEquipment | undefined,
  kind: EquipmentCheckKind,
  itemId: string,
  present: boolean,
  meta: EquipmentMutationMeta,
): EquipmentIssueResult | null {
  if (!eq) return null;
  const check: EquipmentCheckRecord = { checkedAt: meta.at, checkedBy: meta.by, present };

  if (kind === "fixed") {
    const item = eq.fixed.find(i => i.id === itemId);
    if (!item) return null;
    const status = presenceStatusForFixed(item, present);
    return {
      equipment: {
        ...eq,
        fixed: eq.fixed.map(i =>
          i.id === itemId ? { ...i, status, lastCheck: check } : i,
        ),
      },
      audit: {
        id: meta.nextAuditId(),
        vehicleId: meta.vehicleId,
        at: meta.at,
        by: meta.by,
        kind: present ? "presence-confirmed" : "presence-denied",
        target: itemId,
        detail: `${item.label} — ${present ? "confirmed on vehicle" : "not on vehicle"}`,
      },
    };
  }

  if (kind === "assigned") {
    const item = eq.assigned.find(i => i.id === itemId);
    if (!item) return null;
    const status = presenceStatusForAssigned(item, present);
    return {
      equipment: {
        ...eq,
        assigned: eq.assigned.map(i =>
          i.id === itemId ? { ...i, status, lastCheck: check } : i,
        ),
      },
      audit: {
        id: meta.nextAuditId(),
        vehicleId: meta.vehicleId,
        at: meta.at,
        by: meta.by,
        kind: present ? "presence-confirmed" : "presence-denied",
        target: itemId,
        detail: `${item.label} — ${present ? "confirmed on vehicle" : "not on vehicle"}`,
      },
    };
  }

  const item = eq.documents.find(i => i.id === itemId);
  if (!item) return null;
  return {
    equipment: {
      ...eq,
      documents: eq.documents.map(i =>
        i.id === itemId
          ? { ...i, status: present ? "present" : "missing", lastCheck: check }
          : i,
      ),
    },
    audit: {
      id: meta.nextAuditId(),
      vehicleId: meta.vehicleId,
      at: meta.at,
      by: meta.by,
      kind: present ? "presence-confirmed" : "presence-denied",
      target: itemId,
      detail: `${item.label} — ${present ? "confirmed on vehicle" : "not on vehicle"}`,
    },
  };
}

export function patchVehicleEquipment(
  equipment: Record<string, VehicleEquipment>,
  vehicleId: string,
  next: VehicleEquipment,
): Record<string, VehicleEquipment> {
  return { ...equipment, [vehicleId]: next };
}
