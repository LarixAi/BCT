import type { CommandResult, CommandTransport, OfflineCommand } from "@veyvio/ops";
import { getApiBaseUrl } from "@/platform/api/config";

/**
 * HTTP command transport — same CommandResult contract as mock.
 * Used when VITE_USE_MOCK_API=false.
 */
export class HttpCommandTransport implements CommandTransport {
  async send(command: OfflineCommand): Promise<CommandResult> {
    const base = getApiBaseUrl().replace(/\/$/, "");
    const response = await fetch(`${base}/ops/commands`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(command),
      credentials: "include",
    });

    if (response.status === 409) {
      const body = (await response.json().catch(() => ({}))) as {
        reasonCode?: string;
        currentVersion?: number;
        serverProjection?: unknown;
      };
      return {
        status: "rejected",
        commandId: command.commandId,
        reasonCode: body.reasonCode ?? "VERSION_CONFLICT",
        currentVersion: body.currentVersion,
        serverProjection: body.serverProjection,
      };
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { reasonCode?: string };
      return {
        status: "rejected",
        commandId: command.commandId,
        reasonCode: body.reasonCode ?? `HTTP_${response.status}`,
      };
    }

    const body = (await response.json()) as {
      commandId: string;
      aggregateId: string;
      serverVersion: number;
      events?: CommandResult extends { events: infer E } ? E : never;
    };

    return {
      status: "accepted",
      commandId: body.commandId ?? command.commandId,
      aggregateId: body.aggregateId ?? command.aggregateId,
      serverVersion: body.serverVersion,
      events: body.events ?? [],
    };
  }
}
