import { buildBootstrapPayload } from "@/data/mocks/bootstrap";
import type { YardRole } from "@/types/permissions";
import type { OutboxMutation } from "@/types/sync";

export function handleHealthRequest(): Response {
  return Response.json({ ok: true, mode: "dev-stub", at: new Date().toISOString() });
}

export function handleBootstrapRequest(request: Request): Response {
  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId") ?? "co_demo";
  const depotId = url.searchParams.get("depotId") ?? "depot_b3";
  const role = (url.searchParams.get("role") ?? "yard_manager") as YardRole;
  const payload = buildBootstrapPayload(companyId, depotId, role);
  return Response.json(payload);
}

export async function handleMutationsRequest(request: Request): Promise<Response> {
  const mutation = await request.json() as OutboxMutation;
  const supported = [
    "inspection.start", "inspection.media", "inspection.complete", "inspection.approve",
    "damage.report", "damage.review", "repair.request", "vehicle.mark_vor",
    "vehicle.move", "check.complete", "task.update",
  ];
  if (supported.includes(mutation.type)) {
    return Response.json({ ok: true, serverId: `srv_${mutation.localOperationId}` });
  }
  return Response.json({ serverId: `srv_${mutation.localOperationId}` });
}
