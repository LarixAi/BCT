import type { DutyDetail } from "@/types/duty";
import { MOCK_DUTIES, getMockDutyDetail } from "@/data/mocks/duties";

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function mockFetchDutyDetail(dutyId: string): Promise<DutyDetail> {
  await delay(250);
  const duty = getMockDutyDetail(dutyId);
  if (!duty) throw new Error("Duty not found");
  return duty;
}

export async function mockFetchTodayDuties(_driverId: string) {
  await delay(200);
  return MOCK_DUTIES;
}
