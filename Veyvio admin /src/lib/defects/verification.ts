import type { VehicleDefectEntry } from '@/lib/vehicles/types'
import type { VerificationLevel } from './types'

const ROAD_TEST_CATEGORIES = new Set(['brakes', 'steering', 'suspension', 'engine', 'drivetrain', 'lights'])

export function requiredVerificationLevel(defect: Pick<VehicleDefectEntry, 'severity' | 'category' | 'component'>): VerificationLevel {
  if (defect.severity === 'advisory' || defect.severity === 'minor') return 1
  if (ROAD_TEST_CATEGORIES.has(defect.category.toLowerCase())) return 4
  if (defect.severity === 'dangerous' || defect.severity === 'major') return 3
  return 2
}

export const VERIFICATION_LEVEL_LABELS: Record<VerificationLevel, string> = {
  1: 'Level 1 — Administrative',
  2: 'Level 2 — Yard verification',
  3: 'Level 3 — Engineering verification',
  4: 'Level 4 — Road-test verification',
}

export const CLOSURE_REASON_LABELS: Record<string, string> = {
  permanently_repaired: 'Permanently repaired',
  component_replaced: 'Component replaced',
  no_defect_found: 'No defect found after assessment',
  duplicate: 'Duplicate',
  vehicle_decommissioned: 'Vehicle decommissioned',
  included_in_larger_repair: 'Included in larger repair',
  monitoring_plan: 'Accepted monitoring plan',
}
