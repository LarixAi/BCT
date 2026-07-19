import { getSupabaseClient } from "@/lib/supabase/client";
import { getDriverAssignedVehicle } from "@/services/vehicle-check.service";
import { logDriverAudit } from "@/services/audit.service";
import { notifyDispatcher } from "@/services/notifications.service";

export async function canReportStandaloneDefect(driver) {
  const assigned = await getDriverAssignedVehicle(driver);
  return Boolean(assigned.vehicleId);
}

export async function reportStandaloneDefect(driver, { description, severity = "major", vehicleBlocked = false }) {
  const supabase = getSupabaseClient();
  const trimmed = description?.trim();
  if (!trimmed) {
    return { ok: false, message: "Please describe the defect." };
  }

  const assigned = await getDriverAssignedVehicle(driver);
  if (!assigned.vehicleId) {
    return { ok: false, message: "No vehicle assigned — contact dispatch before reporting a defect." };
  }

  const { data: vehicleRow } = await supabase
    .from("vehicles")
    .select("current_depot_id")
    .eq("id", assigned.vehicleId)
    .maybeSingle();

  if (!vehicleRow?.current_depot_id) {
    return { ok: false, message: "Vehicle depot not found — contact dispatch." };
  }

  const { data: defect, error } = await supabase
    .from("defects")
    .insert({
      organisation_id: driver.organisationId,
      depot_id: vehicleRow.current_depot_id,
      vehicle_id: assigned.vehicleId,
      reported_by_driver_id: driver.id,
      severity,
      status: "open",
      description: trimmed,
      vehicle_blocked: vehicleBlocked,
    })
    .select("id")
    .single();

  if (error || !defect) {
    return { ok: false, message: error?.message ?? "Failed to report defect." };
  }

  await logDriverAudit({
    organisation_id: driver.organisationId,
    depot_id: vehicleRow.current_depot_id,
    entity_table: "defects",
    entity_id: defect.id,
    action: "driver_defect_reported",
    reason: trimmed.slice(0, 200),
    metadata: { source: "driver_mobile", severity, vehicle_id: assigned.vehicleId },
  });

  await notifyDispatcher({
    organisationId: driver.organisationId,
    depotId: vehicleRow.current_depot_id,
    notificationType: "defect_report_received",
    entityType: "defects",
    entityId: defect.id,
    title: "Defect reported by driver",
    message: `${driver.fullName} reported a ${severity} defect on their assigned vehicle.`,
    severity: severity === "critical" ? "critical" : "warning",
  });

  return { ok: true, defectId: defect.id };
}
