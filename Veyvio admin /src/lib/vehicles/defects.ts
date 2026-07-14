import type { DefectSeverity, VehicleDefectEntry, VehicleProfile } from './types'

export const DEFECT_SEVERITY_LABELS: Record<DefectSeverity, string> = {
  advisory: 'Advisory',
  minor: 'Minor',
  major: 'Major',
  dangerous: 'Dangerous',
}

export function defectSeverityRank(severity: DefectSeverity): number {
  switch (severity) {
    case 'dangerous':
      return 4
    case 'major':
      return 3
    case 'minor':
      return 2
    default:
      return 1
  }
}

export function shouldAutoVor(severity: DefectSeverity): boolean {
  return severity === 'dangerous'
}

export function syncDefectCounts(profile: VehicleProfile): Pick<VehicleProfile, 'openDefectCount' | 'criticalDefectCount'> {
  const open = profile.defects.filter((d) => d.status !== 'closed')
  return {
    openDefectCount: open.length,
    criticalDefectCount: open.filter((d) => d.severity === 'dangerous').length,
  }
}

export function applyDefectToProfile(profile: VehicleProfile, defect: VehicleDefectEntry): VehicleProfile {
  const defects = [...profile.defects, defect]
  const counts = syncDefectCounts({ ...profile, defects })
  const patch: Partial<VehicleProfile> = { defects, ...counts }
  if (shouldAutoVor(defect.severity)) {
    patch.operationalStatus = 'vor'
    patch.yardStatus = 'workshop'
  }
  return { ...profile, ...patch }
}

export function closeDefectOnProfile(
  profile: VehicleProfile,
  defectId: string,
  closedBy: string,
  reason: string,
): VehicleProfile {
  const defects = profile.defects.map((d) =>
    d.id === defectId
      ? { ...d, status: 'closed' as const, closedAt: new Date().toISOString(), closedBy, closureReason: reason }
      : d,
  )
  const counts = syncDefectCounts({ ...profile, defects })
  return { ...profile, defects, ...counts }
}

export function completeRepairOnDefect(
  profile: VehicleProfile,
  defectId: string,
  completedBy: string,
  summary: string,
): VehicleProfile {
  const defects = profile.defects.map((d) =>
    d.id === defectId
      ? {
          ...d,
          status: 'awaiting_verification' as const,
          repairSummary: summary,
          repairCompletedAt: new Date().toISOString(),
          repairCompletedBy: completedBy,
          verificationResult: null,
        }
      : d,
  )
  return { ...profile, defects }
}

export function verifyDefectOnProfile(
  profile: VehicleProfile,
  defectId: string,
  verifiedBy: string,
  result: 'pass' | 'fail',
  level: 1 | 2 | 3 | 4,
  notes: string | null,
): VehicleProfile {
  const defects = profile.defects.map((d) =>
    d.id === defectId
      ? {
          ...d,
          verificationLevel: level,
          verifiedAt: new Date().toISOString(),
          verifiedBy,
          verificationResult: result,
          verificationNotes: notes,
          status: result === 'fail' ? ('in_repair' as const) : d.status,
        }
      : d,
  )
  return { ...profile, defects }
}

export function reopenDefectOnProfile(
  profile: VehicleProfile,
  defectId: string,
  reason: string,
): VehicleProfile {
  const defects = profile.defects.map((d) =>
    d.id === defectId
      ? {
          ...d,
          status: d.vorApplied ? ('vor' as const) : ('awaiting_repair' as const),
          repairCompletedAt: null,
          repairCompletedBy: null,
          verificationResult: null,
          verifiedAt: null,
          verifiedBy: null,
          closureReason: null,
          closedAt: null,
          closedBy: null,
        }
      : d,
  )
  const counts = syncDefectCounts({ ...profile, defects })
  void reason
  return { ...profile, defects, ...counts }
}
