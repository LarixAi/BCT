import type { DefectAnalytics, DefectRegisterRow } from './types'

export function buildDefectAnalytics(register: DefectRegisterRow[]): DefectAnalytics {
  const open = register.filter((r) => r.defectStatus !== 'closed')
  const closed = register.filter((r) => r.defectStatus === 'closed')
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  const depotMap = new Map<string, { openCount: number; criticalCount: number }>()
  for (const row of open) {
    const current = depotMap.get(row.depotName) ?? { openCount: 0, criticalCount: 0 }
    current.openCount += 1
    if (row.severity === 'dangerous') current.criticalCount += 1
    depotMap.set(row.depotName, current)
  }

  const categoryMap = new Map<string, number>()
  for (const row of open) {
    categoryMap.set(row.category, (categoryMap.get(row.category) ?? 0) + 1)
  }

  const sourceMap = new Map<string, number>()
  for (const row of open) {
    const key = row.source.split(' ')[0] ?? row.source
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1)
  }

  const avgAgeHours =
    open.length > 0 ? Math.round(open.reduce((sum, r) => sum + r.ageMinutes, 0) / open.length / 60) : 0

  return {
    byDepot: [...depotMap.entries()]
      .map(([depotName, counts]) => ({ depotName, ...counts }))
      .sort((a, b) => b.openCount - a.openCount),
    byCategory: [...categoryMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    bySource: [...sourceMap.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    slaBreaches: open.filter((r) => r.isSlaBreached).length,
    avgAgeHours,
    reopenedCount: open.filter((r) => r.workflowStatus === 'reopened').length,
    closedThisWeek: closed.filter((r) => r.closedAt && new Date(r.closedAt).getTime() >= weekAgo).length,
  }
}
