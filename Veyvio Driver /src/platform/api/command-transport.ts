import type { CommandTransport } from "@veyvio/ops";
import { isMockApi } from "@/platform/api/config";
import { MockCommandTransport } from "@/platform/api/command-transport.mock";
import { HttpCommandTransport } from "@/platform/api/command-transport.http";

let singleton: CommandTransport | null = null;

/** Shared transport for mock and HTTP — outbox must not hard-code mockSyncMutation. */
export function getCommandTransport(): CommandTransport {
  if (!singleton) {
    singleton = isMockApi() ? new MockCommandTransport() : new HttpCommandTransport();
  }
  return singleton;
}

/** Test helper — reset after mutating env / switching transport. */
export function resetCommandTransportForTests(): void {
  singleton = null;
}
