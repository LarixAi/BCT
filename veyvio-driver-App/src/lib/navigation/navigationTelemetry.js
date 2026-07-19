import { logDriverAudit } from "@/services/audit.service";

/**
 * Write navigation telemetry to fleet_audit_logs.
 * @param {{ driver?: object, job?: object, action: string, metadata?: object }} payload
 */
export async function logNavigationTelemetry({ driver, job, action, metadata = {} }) {
  if (!job?.id) return;

  await logDriverAudit({
    organisation_id: job.organisation_id ?? job.organisationId ?? null,
    depot_id: job.depot_id ?? job.depotId ?? null,
    entity_table: "jobs",
    entity_id: job.id,
    action,
    reason: job.routeName ?? job.route_name ?? null,
    metadata: {
      driver_id: driver?.id ?? null,
      ...metadata,
    },
  });
}
