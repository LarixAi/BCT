import type { DefectSeverity, VehicleProfile } from '@/lib/vehicles/types'
import type { DefectRecurringInsight, DefectSlaSettings } from './types'
import { DEFAULT_DEFECT_SLA } from './sla'
import { defectRef } from './status'

const MS_DAY = 24 * 60 * 60 * 1000
const SEVERITY_RANK: Record<DefectSeverity, number> = { advisory: 1, minor: 2, major: 3, dangerous: 4 }

function maxSeverity(defects: { severity: DefectSeverity }[]): DefectSeverity {
  return defects.reduce<DefectSeverity>(
    (max, d) => (SEVERITY_RANK[d.severity] > SEVERITY_RANK[max] ? d.severity : max),
    'advisory',
  )
}

export function buildRecurringInsights(
  vehicles: VehicleProfile[],
  settings: DefectSlaSettings = DEFAULT_DEFECT_SLA,
): DefectRecurringInsight[] {
  const insights: DefectRecurringInsight[] = []
  const windowMs = settings.recurringWindowDays * MS_DAY
  const now = Date.now()

  for (const profile of vehicles) {
    const byComponent = new Map<string, typeof profile.defects>()
    for (const d of profile.defects) {
      const key = d.component.toLowerCase()
      const list = byComponent.get(key) ?? []
      list.push(d)
      byComponent.set(key, list)
    }

    for (const [component, defects] of byComponent) {
      const recent = defects.filter((d) => now - new Date(d.reportedAt).getTime() <= windowMs)
      if (recent.length < settings.recurringComponentThreshold) continue

      const open = recent.filter((d) => d.status !== 'closed')
      const postRepairReturn = recent.some(
        (d) => d.verificationResult === 'fail' || (d.repairCompletedAt && d.status !== 'closed'),
      )

      insights.push({
        id: `rec-${profile.id}-${component.replace(/\s+/g, '-')}`,
        vehicleId: profile.id,
        registrationNumber: profile.registrationNumber,
        component,
        occurrenceCount: recent.length,
        windowDays: settings.recurringWindowDays,
        openDefectIds: open.map((d) => d.id),
        latestDefectRef: defectRef(recent[0]!.id),
        depotName: profile.currentDepotName,
        makeModel: `${profile.make} ${profile.model}`,
        severity: maxSeverity(recent),
        recommendation: postRepairReturn
          ? 'Defect returned after repair — require root-cause analysis before another isolated fix'
          : `Consider engineering investigation — ${recent.length} ${component} defects in ${settings.recurringWindowDays} days`,
      })
    }
  }

  return insights.sort((a, b) => b.occurrenceCount - a.occurrenceCount)
}

export function isComponentRecurring(
  profile: VehicleProfile,
  component: string,
  settings: DefectSlaSettings = DEFAULT_DEFECT_SLA,
): boolean {
  const windowMs = settings.recurringWindowDays * MS_DAY
  const now = Date.now()
  const count = profile.defects.filter(
    (d) => d.component.toLowerCase() === component.toLowerCase() && now - new Date(d.reportedAt).getTime() <= windowMs,
  ).length
  return count >= settings.recurringComponentThreshold
}
