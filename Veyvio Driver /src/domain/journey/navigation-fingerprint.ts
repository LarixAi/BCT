import type { DutyDetail } from "@/types/duty";
import { buildJourneyMapStops } from "@/domain/journey/journey-map";

export function buildStopFingerprint(duty: DutyDetail): string {
  return buildJourneyMapStops(duty)
    .map((stop) => `${stop.id}:${stop.status}`)
    .join("|");
}
