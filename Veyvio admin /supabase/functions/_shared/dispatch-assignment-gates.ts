/**
 * Shared driver eligibility + vehicle readiness gates for dispatch assignment and sign-on.
 * Blueprint Part F rule 6 — safety rules are hard gates, not yellow warnings only.
 */
import { admin } from './supabase.ts'
import { projectDriverProfile, projectVehicleProfile } from './projections.ts'

type Row = Record<string, unknown>

export type EligibilityResult = {
  status: 'eligible' | 'eligible_with_warnings' | 'blocked'
  blockers: string[]
  warnings: string[]
}

function messageFromFailure(failure: Row): string {
  return String(failure.message ?? failure.code ?? 'Not eligible')
}

export function finalizeEligibilityResult(blockers: string[], warnings: string[]): EligibilityResult {
  const uniqueBlockers = [...new Set(blockers.filter(Boolean))]
  const uniqueWarnings = [...new Set(warnings.filter(Boolean))]
  if (uniqueBlockers.length) {
    return { status: 'blocked', blockers: uniqueBlockers, warnings: uniqueWarnings }
  }
  if (uniqueWarnings.length) {
    return { status: 'eligible_with_warnings', blockers: uniqueBlockers, warnings: uniqueWarnings }
  }
  return { status: 'eligible', blockers: uniqueBlockers, warnings: uniqueWarnings }
}

export async function appendDriverProfileGates(input: {
  companyId: string
  driverId: string
  blockers: string[]
  warnings: string[]
}): Promise<void> {
  try {
    const profile = (await projectDriverProfile(input.companyId, input.driverId)) as Row | null
    const failures = Array.isArray((profile?.eligibility as Row | undefined)?.failures)
      ? (((profile?.eligibility as Row).failures ?? []) as Row[])
      : []
    for (const failure of failures) {
      const message = messageFromFailure(failure)
      if (String(failure.severity) === 'block') input.blockers.push(message)
      else input.warnings.push(message)
    }
  } catch (error) {
    console.error('dispatch gate driver profile failed', error)
    input.blockers.push('Driver eligibility could not be verified — assignment blocked.')
  }
}

export async function appendVehicleReadinessGates(input: {
  companyId: string
  vehicleId: string
  driverId?: string | null
  blockers: string[]
  warnings: string[]
  requireTodaysCheck?: boolean
  /** When true, skip VOR/defect/release projection (already evaluated during assignment). */
  readinessAlreadyChecked?: boolean
}): Promise<void> {
  if (!input.readinessAlreadyChecked) {
    try {
      const vehicleProfile = (await projectVehicleProfile(input.companyId, input.vehicleId)) as Row | null
      if (!vehicleProfile) {
        input.blockers.push('Vehicle readiness could not be verified — assignment blocked.')
        return
      }

      const op = String(vehicleProfile.operationalStatus ?? '')
      const reg = String(vehicleProfile.registrationNumber ?? '').trim()
      if (op === 'vor') {
        input.blockers.push(
          reg ? `Vehicle ${reg} is VOR — cannot assign or dispatch.` : 'Vehicle is VOR — cannot assign or dispatch.',
        )
      }

      const critical = Number(vehicleProfile.criticalDefectCount ?? 0)
      if (critical > 0) {
        input.blockers.push(
          `Vehicle has ${critical} open critical defect${critical === 1 ? '' : 's'} — cannot assign or dispatch.`,
        )
      }

      const release = (vehicleProfile.release as Row | undefined) ?? {}
      const failures = Array.isArray(release.failures) ? (release.failures as Row[]) : []
      for (const failure of failures) {
        const message = messageFromFailure(failure)
        if (String(failure.severity) === 'block') input.blockers.push(message)
        else input.warnings.push(message)
      }
    } catch (error) {
      console.error('dispatch gate vehicle profile failed', error)
      input.blockers.push('Vehicle readiness could not be verified — assignment blocked.')
    }
  }

  if (!input.requireTodaysCheck || !input.driverId) return

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const { data: check } = await admin
    .from('vehicle_checks')
    .select('result')
    .eq('company_id', input.companyId)
    .eq('vehicle_id', input.vehicleId)
    .eq('driver_id', input.driverId)
    .gte('submitted_at', todayStart.toISOString())
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!check) {
    input.blockers.push("Complete today's vehicle check before signing on.")
    return
  }

  const result = String(check.result ?? '')
  if (result === 'fail' || result === 'failed') {
    input.blockers.push('Vehicle check failed — speak to dispatch before signing on.')
  }
}
