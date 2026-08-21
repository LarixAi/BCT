import type { YardRole } from "@/types/permissions";
import type { OutboxMutation } from "@/types/sync";

export function buildYardHealthBody(options: {
  prod: boolean;
  deploymentSha?: string | null;
}): { ok: true; mode: "live" | "dev-stub"; deploymentSha: string | null; at: string } {
  return {
    ok: true,
    mode: options.prod ? "live" : "dev-stub",
    deploymentSha: options.deploymentSha ?? null,
    at: new Date().toISOString(),
  };
}

export function handleHealthRequest(): Response {
  const deploymentSha =
    import.meta.env.VITE_GIT_SHA ||
    import.meta.env.VITE_DEPLOYMENT_SHA ||
    null;
  return Response.json(
    buildYardHealthBody({
      prod: Boolean(import.meta.env.PROD),
      deploymentSha,
    }),
  );
}

export async function handleBootstrapRequest(request: Request): Promise<Response> {
  if (import.meta.env.PROD) {
    return Response.json(
      {
        message:
          "Local yard bootstrap stub is disabled in production. Configure Command API (VITE_COMMAND_API_BASE_URL).",
        code: "bootstrap_unavailable",
      },
      { status: 503 },
    );
  }

  const { buildBootstrapPayload } = await import("@/data/mocks/bootstrap");
  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId") ?? "co_demo";
  const depotId = url.searchParams.get("depotId") ?? "depot_b3";
  const role = (url.searchParams.get("role") ?? "yard_manager") as YardRole;
  const payload = buildBootstrapPayload(companyId, depotId, role);
  return Response.json(payload);
}

export async function handleMutationsRequest(request: Request): Promise<Response> {
  if (import.meta.env.PROD) {
    return Response.json(
      {
        message: "Local yard mutation stub is disabled in production. Use Command API.",
        code: "mutation_unavailable",
      },
      { status: 503 },
    );
  }

  const mutation = await request.json() as OutboxMutation;
  const supported = [
    "inspection.start", "inspection.media", "inspection.complete", "inspection.approve",
    "damage.report", "damage.review", "repair.request", "vehicle.mark_vor",
    "vehicle.move", "check.complete", "task.create", "task.update",
  ];
  if (supported.includes(mutation.type)) {
    return Response.json({ ok: true, serverId: `srv_${mutation.localOperationId}` });
  }
  return Response.json({ serverId: `srv_${mutation.localOperationId}` });
}
