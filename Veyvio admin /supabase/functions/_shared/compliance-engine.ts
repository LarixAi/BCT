/**
 * F-05 — company-configurable compliance rules (Gate 2 §4.3).
 */
import { admin } from './supabase.ts'
import {
  appendDriverProfileGates,
  appendVehicleReadinessGates,
  finalizeEligibilityResult,
  type EligibilityResult,
} from './dispatch-assignment-gates.ts'

export type ComplianceAutomationSettings = {
  blockExpiredLicence: boolean
  blockExpiredCpc: boolean
  blockExpiredDbs: boolean
  blockExpiredMedical: boolean
  blockExpiredMot: boolean
  blockExpiredInsurance: boolean
  blockExpiredTax: boolean
  blockExpiredPmi: boolean
  blockOverdueService: boolean
  blockOverdueTyreRetorque: boolean
  blockCriticalDefects: boolean
  blockVorVehicles: boolean
  requireTodaysCheckOnSignOn: boolean
  defectAutomationEnabled: boolean
}

export const DEFAULT_COMPLIANCE_SETTINGS: ComplianceAutomationSettings = {
  blockExpiredLicence: true,
  blockExpiredCpc: true,
  blockExpiredDbs: true,
  blockExpiredMedical: true,
  blockExpiredMot: true,
  blockExpiredInsurance: true,
  blockExpiredTax: true,
  blockExpiredPmi: true,
  blockOverdueService: true,
  blockOverdueTyreRetorque: true,
  blockCriticalDefects: true,
  blockVorVehicles: true,
  requireTodaysCheckOnSignOn: true,
  defectAutomationEnabled: true,
}

export async function getComplianceSettings(companyId: string): Promise<ComplianceAutomationSettings> {
  const { data } = await admin
    .from('company_compliance_settings')
    .select('settings')
    .eq('company_id', companyId)
    .maybeSingle()

  const raw = (data?.settings ?? {}) as Partial<ComplianceAutomationSettings>
  return { ...DEFAULT_COMPLIANCE_SETTINGS, ...raw }
}

export async function upsertComplianceSettings(
  companyId: string,
  patch: Partial<ComplianceAutomationSettings>,
  actorUserId: string | null,
): Promise<ComplianceAutomationSettings> {
  const current = await getComplianceSettings(companyId)
  const next = { ...current, ...patch }
  const { error } = await admin.from('company_compliance_settings').upsert({
    company_id: companyId,
    settings: next,
    updated_at: new Date().toISOString(),
    updated_by: actorUserId,
  })
  if (error) throw new Error(error.message)
  return next
}

/**
 * Evaluate assignment/sign-on with company compliance settings applied.
 * Extends F-05 rules-engine entry with configurable CPC/doc/vehicle blocks.
 */
export async function evaluateComplianceRules(input: {
  companyId: string
  driverId: string
  vehicleId?: string | null
  requireTodaysCheck?: boolean
  readinessAlreadyChecked?: boolean
}): Promise<EligibilityResult & { settings: ComplianceAutomationSettings }> {
  const settings = await getComplianceSettings(input.companyId)
  const blockers: string[] = []
  const warnings: string[] = []

  // Base profile / vehicle gates (always collect, then filter by settings).
  const profileBlockers: string[] = []
  const profileWarnings: string[] = []
  await appendDriverProfileGates({
    companyId: input.companyId,
    driverId: input.driverId,
    blockers: profileBlockers,
    warnings: profileWarnings,
  })

  for (const b of profileBlockers) {
    const lower = b.toLowerCase()
    if (lower.includes('cpc') && !settings.blockExpiredCpc) {
      warnings.push(b)
      continue
    }
    if ((lower.includes('licence') || lower.includes('license')) && !settings.blockExpiredLicence) {
      warnings.push(b)
      continue
    }
    if (lower.includes('dbs') && !settings.blockExpiredDbs) {
      warnings.push(b)
      continue
    }
    if (lower.includes('medical') && !settings.blockExpiredMedical) {
      warnings.push(b)
      continue
    }
    blockers.push(b)
  }
  warnings.push(...profileWarnings)

  if (input.vehicleId) {
    const vehicleBlockers: string[] = []
    const vehicleWarnings: string[] = []
    await appendVehicleReadinessGates({
      companyId: input.companyId,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      blockers: vehicleBlockers,
      warnings: vehicleWarnings,
      requireTodaysCheck: input.requireTodaysCheck ?? settings.requireTodaysCheckOnSignOn,
      readinessAlreadyChecked: input.readinessAlreadyChecked,
    })

    for (const b of vehicleBlockers) {
      const lower = b.toLowerCase()
      if (lower.includes('mot') && !settings.blockExpiredMot) {
        warnings.push(b)
        continue
      }
      if (lower.includes('insurance') && !settings.blockExpiredInsurance) {
        warnings.push(b)
        continue
      }
      if (lower.includes('tax') && !settings.blockExpiredTax) {
        warnings.push(b)
        continue
      }
      if (lower.includes('pmi') && !settings.blockExpiredPmi) {
        warnings.push(b)
        continue
      }
      if (lower.includes('service') && !settings.blockOverdueService) {
        warnings.push(b)
        continue
      }
      if (
        (lower.includes('tyre') || lower.includes('re-torque') || lower.includes('retorque')) &&
        !settings.blockOverdueTyreRetorque
      ) {
        warnings.push(b)
        continue
      }
      if ((lower.includes('vor') || lower.includes('quarantine')) && !settings.blockVorVehicles) {
        warnings.push(b)
        continue
      }
      if ((lower.includes('critical') || lower.includes('defect')) && !settings.blockCriticalDefects) {
        warnings.push(b)
        continue
      }
      blockers.push(b)
    }
    warnings.push(...vehicleWarnings)
  }

  return { ...finalizeEligibilityResult(blockers, warnings), settings }
}
