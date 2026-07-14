import { buildBootstrapPayload } from "@/data/mocks/bootstrap";
import type { YardRole } from "@/types/permissions";
import type { OutboxMutation } from "@/types/sync";
import type { PushMutationResult, YardApi } from "./yard-api";

const BOOTSTRAP_LATENCY_MS = 800;
const MUTATION_LATENCY_MS = 100;

export const mockYardApi: YardApi = {
  async fetchBootstrap(companyId, depotId, role: YardRole = "yard_manager") {
    await new Promise(r => setTimeout(r, BOOTSTRAP_LATENCY_MS));
    return buildBootstrapPayload(companyId, depotId, role);
  },

  async pushMutation(mutation: OutboxMutation): Promise<PushMutationResult> {
    await new Promise(r => setTimeout(r, MUTATION_LATENCY_MS));
    return { serverId: `srv_${mutation.localOperationId}` };
  },

  async healthCheck() {
    return { ok: true, mode: "mock" };
  },
};
