/** Vehicle handback / end-of-duty custody close-down checklist. */

export interface VehicleHandbackRecord {
  id: string;
  dutyId: string;
  vehicleId: string;
  assignmentId: string;
  locationOrBay: string;
  keysSecured: boolean;
  fuelOrChargeStatus: string;
  postUseConditionOk: boolean;
  newBodyDamage: boolean;
  damageNotes?: string;
  cleanlinessAccepted: boolean;
  lostPropertyChecked: boolean;
  lostPropertyNotes?: string;
  restraintsAndEquipmentOk: boolean;
  equipmentExceptions?: string;
  custodyAction: "retained" | "handed_over" | "returned_to_yard";
  outstandingIncidentFollowUp: boolean;
  criticalSyncClear: boolean;
  completedAt?: string;
  completedBy?: string;
}

export function createHandbackDraft(input: {
  dutyId: string;
  vehicleId: string;
  assignmentId: string;
}): VehicleHandbackRecord {
  return {
    id: `hb_${crypto.randomUUID?.() ?? Date.now()}`,
    dutyId: input.dutyId,
    vehicleId: input.vehicleId,
    assignmentId: input.assignmentId,
    locationOrBay: "",
    keysSecured: false,
    fuelOrChargeStatus: "",
    postUseConditionOk: false,
    newBodyDamage: false,
    cleanlinessAccepted: false,
    lostPropertyChecked: false,
    restraintsAndEquipmentOk: false,
    custodyAction: "returned_to_yard",
    outstandingIncidentFollowUp: false,
    criticalSyncClear: false,
  };
}

export function handbackIsComplete(record: VehicleHandbackRecord): boolean {
  return handbackBlockingReasons(record).length === 0;
}

/** Human-readable blockers for the end-journey handback form. */
export function handbackBlockingReasons(record: VehicleHandbackRecord): string[] {
  const reasons: string[] = [];
  if (!record.locationOrBay.trim()) reasons.push("Enter the return bay or location");
  if (!record.fuelOrChargeStatus.trim()) reasons.push("Confirm fuel or charge status");
  if (!record.keysSecured) reasons.push("Confirm keys are secured");
  if (!record.postUseConditionOk) reasons.push("Confirm post-use condition");
  if (!record.cleanlinessAccepted) reasons.push("Confirm cleanliness");
  if (!record.lostPropertyChecked) reasons.push("Confirm lost property checked");
  if (!record.restraintsAndEquipmentOk) reasons.push("Confirm restraints and equipment");
  if (!record.criticalSyncClear) reasons.push("Confirm no critical sync is outstanding");
  if (record.newBodyDamage && !record.damageNotes?.trim()) {
    reasons.push("Describe the new body damage");
  }
  return reasons;
}
