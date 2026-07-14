import type { BootstrapPayload } from "@/data/mocks/bootstrap";
import type { YardRole } from "@/types/permissions";
import type { OutboxMutation } from "@/types/sync";

export interface PushMutationResult {
  serverId: string;
}

export interface YardApi {
  fetchBootstrap(companyId: string, depotId: string, role: YardRole): Promise<BootstrapPayload>;
  pushMutation(mutation: OutboxMutation): Promise<PushMutationResult>;
  healthCheck(): Promise<{ ok: boolean; mode: string }>;
}
