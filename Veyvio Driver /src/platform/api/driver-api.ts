import type { BootstrapPayload } from "@/data/mocks/bootstrap";
import type { DutyDetail } from "@/types/duty";
import { MOCK_DUTIES, getMockDutyDetail } from "@/data/mocks/duties";

export async function fetchTodayDuties(driverId: string) {
  const { isMockApi } = await import("@/platform/api/config");
  if (isMockApi()) {
    const { mockFetchTodayDuties } = await import("@/platform/api/driver-api.mock");
    return mockFetchTodayDuties(driverId);
  }
  const base = import.meta.env.VITE_API_BASE_URL;
  const res = await fetch(`${base}/driver/duties/today`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("veyvio-driver-token")}` },
  });
  if (!res.ok) throw new Error("Failed to load duties");
  return res.json();
}

export async function fetchDutyDetail(dutyId: string): Promise<DutyDetail> {
  const { isMockApi } = await import("@/platform/api/config");
  if (isMockApi()) {
    const { mockFetchDutyDetail } = await import("@/platform/api/driver-api.mock");
    return mockFetchDutyDetail(dutyId);
  }
  const base = import.meta.env.VITE_API_BASE_URL;
  const res = await fetch(`${base}/driver/duties/${dutyId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("veyvio-driver-token")}` },
  });
  if (!res.ok) throw new Error("Failed to load duty");
  return res.json();
}

export async function hydrateFromBootstrap(driverId: string): Promise<BootstrapPayload | null> {
  const { loadBootstrapCache } = await import("@/platform/storage/local-db");
  return loadBootstrapCache(driverId);
}

export function getCachedDutyFromBootstrap(payload: BootstrapPayload, dutyId: string): DutyDetail | null {
  if (payload.duties.find((d) => d.id === dutyId)) {
    return getMockDutyDetail(dutyId);
  }
  return null;
}
