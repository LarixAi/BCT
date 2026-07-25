const OPERATIONAL_LABELS = {
  vor: "VOR",
  available: "Available",
  allocated: "Allocated",
  in_service: "In service",
  maintenance: "Maintenance",
  awaiting_check: "Awaiting check",
  in_workshop: "In workshop",
  under_inspection: "Under inspection",
  quarantined: "Quarantined",
};

const CONDITION_LABELS = {
  no_known_issues: "No known issues",
  repair_required: "Repair required",
  safety_critical: "Safety critical",
};

export function operationalStatusLabel(status) {
  const key = String(status ?? "").toLowerCase();
  return OPERATIONAL_LABELS[key] ?? (key ? key.replaceAll("_", " ") : "Unknown");
}

export function conditionStatusLabel(status) {
  const key = String(status ?? "").toLowerCase();
  return CONDITION_LABELS[key] ?? (key ? key.replaceAll("_", " ") : "Unknown");
}

export function operationalStatusTone(status) {
  const key = String(status ?? "").toLowerCase();
  if (key === "vor" || key === "quarantined") return "blocked";
  if (key === "awaiting_check" || key === "maintenance" || key === "in_workshop") return "warning";
  if (key === "available" || key === "in_service" || key === "allocated") return "good";
  return "neutral";
}

export function documentStatusUi(status) {
  switch (String(status ?? "").toLowerCase()) {
    case "valid":
      return { label: "Valid", tone: "good" };
    case "expiring":
      return { label: "Expiring soon", tone: "warning" };
    case "expired":
      return { label: "Expired", tone: "blocked" };
    default:
      return { label: "Not on record", tone: "neutral" };
  }
}

export function resolveAssignedVehicleId(bootstrap, vehicle) {
  if (vehicle?.id) return String(vehicle.id);
  if (vehicle?.vehicleId) return String(vehicle.vehicleId);
  const dutyVehicle = bootstrap?.duties?.[0]?.vehicle;
  if (dutyVehicle?.id) return String(dutyVehicle.id);
  const legacy = bootstrap?.legacy?.homeSummary?.vehicleAssignment?.vehicleId;
  return legacy ? String(legacy) : null;
}
