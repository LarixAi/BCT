import type { Bay, Vehicle } from "@/types/yard";
import {
  buildSpatialBayStates as buildShared,
  isLiveYardMapDepot,
  layoutCapacitySummary,
  resolveYardLayout,
  type SpatialBayState,
} from "@veyvio/yard";

export { isLiveYardMapDepot, layoutCapacitySummary, resolveYardLayout };
export type { SpatialBayState };

export function buildSpatialBayStates(
  layout: Parameters<typeof buildShared>[0],
  bays: Bay[],
  vehicles: Vehicle[],
): SpatialBayState[] {
  return buildShared(layout, bays, vehicles);
}
