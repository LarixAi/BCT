import { buildMockOtherDeviceSessions } from "@/data/mocks/security";
import type { DeviceSession } from "@/types/security";

const revokedDeviceIds = new Set<string>();

export async function listDeviceSessions(currentDeviceId: string): Promise<DeviceSession[]> {
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  return buildMockOtherDeviceSessions(currentDeviceId).filter((session) => !revokedDeviceIds.has(session.id));
}

export async function signOutDeviceSession(deviceId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  await new Promise((resolve) => window.setTimeout(resolve, 500));
  if (!deviceId) {
    return { ok: false, reason: "No device selected." };
  }
  revokedDeviceIds.add(deviceId);
  return { ok: true };
}

export async function signOutAllOtherDeviceSessions(
  currentDeviceId: string,
): Promise<{ ok: true; count: number } | { ok: false; reason: string }> {
  await new Promise((resolve) => window.setTimeout(resolve, 700));
  const others = buildMockOtherDeviceSessions(currentDeviceId).filter(
    (session) => !session.isCurrent && !revokedDeviceIds.has(session.id),
  );
  for (const session of others) {
    revokedDeviceIds.add(session.id);
  }
  return { ok: true, count: others.length };
}

export function resetRevokedDeviceSessionsForTests(): void {
  revokedDeviceIds.clear();
}
