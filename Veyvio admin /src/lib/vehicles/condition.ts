import type { ConditionStatus, VehicleDamageRecord, VehicleDefectEntry, VehicleProfile, VehicleVorRecord } from './types'

const OPEN_DEFECT_STATUSES = new Set([
  'open',
  'vor',
  'awaiting_repair',
  'in_repair',
  'awaiting_verification',
])

function openDefects(defects: VehicleDefectEntry[]): VehicleDefectEntry[] {
  return defects.filter((d) => OPEN_DEFECT_STATUSES.has(d.status))
}

function openVor(records: VehicleVorRecord[], operationalStatus: string): boolean {
  if (operationalStatus === 'vor') return true
  return records.some((r) => !r.resolvedAt)
}

function severeOpenDamage(records: VehicleDamageRecord[]): boolean {
  return records.some((d) => !d.baseline && (d.severity === 'severe' || d.severity === 'moderate'))
}

/** Derive condition from open defects, damage, and VOR — never merge into operational status. */
export function deriveConditionStatus(
  profile: Pick<
    VehicleProfile,
    'defects' | 'damageRecords' | 'vorRecords' | 'operationalStatus' | 'criticalDefectCount' | 'openDefectCount' | 'lifecycleStatus'
  >,
): ConditionStatus {
  if (profile.lifecycleStatus === 'awaiting_onboarding' || profile.lifecycleStatus === 'draft') {
    const defects = openDefects(profile.defects ?? [])
    if (defects.length === 0 && !(profile.damageRecords ?? []).length) {
      return 'awaiting_assessment'
    }
  }

  if (openVor(profile.vorRecords ?? [], profile.operationalStatus)) {
    return 'safety_critical'
  }

  const defects = openDefects(profile.defects ?? [])
  if (defects.some((d) => d.severity === 'dangerous') || (profile.criticalDefectCount ?? 0) > 0) {
    return 'safety_critical'
  }

  if (
    defects.some(
      (d) =>
        d.severity === 'major' ||
        d.status === 'awaiting_repair' ||
        d.status === 'in_repair' ||
        d.status === 'vor',
    ) ||
    severeOpenDamage(profile.damageRecords ?? [])
  ) {
    return 'repair_required'
  }

  if (defects.some((d) => d.severity === 'advisory' || d.severity === 'minor')) {
    return 'advisory'
  }

  if ((profile.openDefectCount ?? 0) > 0 && defects.length === 0) {
    return 'awaiting_assessment'
  }

  return 'no_known_issues'
}
