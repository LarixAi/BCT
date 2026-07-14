import type { CheckDetailRecord, SuspiciousFlag } from './types'

export function detectSuspiciousFlags(check: CheckDetailRecord): SuspiciousFlag[] {
  const flags: SuspiciousFlag[] = []

  if (check.startedAt && check.submittedAt) {
    const durationMs = new Date(check.submittedAt).getTime() - new Date(check.startedAt).getTime()
    if (durationMs < 3 * 60 * 1000) {
      flags.push({
        id: 'flag-fast',
        code: 'completed_too_quickly',
        label: 'Check completed unusually quickly',
        severity: 'warning',
        detail: `Full check submitted in ${Math.round(durationMs / 1000)} seconds`,
        recommendedAction: 'Review evidence and section answers before approval',
      })
    }
  }

  if (check.evidenceMissing) {
    flags.push({
      id: 'flag-evidence',
      code: 'evidence_missing',
      label: 'Required evidence missing',
      severity: 'critical',
      detail: 'Mandatory photographs or signatures not attached',
      recommendedAction: 'Request check redo with evidence requirements',
    })
  }

  if (check.syncStatus === 'offline') {
    flags.push({
      id: 'flag-offline',
      code: 'offline_submission',
      label: 'Offline submission pending sync',
      severity: 'info',
      detail: 'Check completed without live connectivity',
      recommendedAction: 'Verify sync completed and timestamps align',
    })
  }

  const photoEvidence = check.evidence.filter((e) => e.kind === 'photo')
  if (photoEvidence.length >= 2) {
    const times = photoEvidence.map((e) => new Date(e.capturedAt).getTime())
    if (Math.max(...times) - Math.min(...times) < 5000 && check.sections.length > 4) {
      flags.push({
        id: 'flag-photos',
        code: 'evidence_batch_capture',
        label: 'Multiple photos captured in rapid succession',
        severity: 'warning',
        detail: 'Evidence may not reflect separate inspection steps',
        recommendedAction: 'Compare images for reuse across sections',
      })
    }
  }

  if (check.result === 'pass' && check.defectCount > 0) {
    flags.push({
      id: 'flag-conflict',
      code: 'result_defect_conflict',
      label: 'Pass result with open defects',
      severity: 'warning',
      detail: 'Check marked pass but defects were recorded',
      recommendedAction: 'Reclassify result or close defects before release',
    })
  }

  return flags
}
