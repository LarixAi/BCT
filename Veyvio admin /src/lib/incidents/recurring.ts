import type { IncidentRegisterRow, RecurringIncidentAlert } from './types'

export function detectRecurringIncidents(register: IncidentRegisterRow[]): RecurringIncidentAlert[] {
  const open = register.filter((r) => r.status !== 'closed' && r.status !== 'cancelled_duplicate')
  const byCategoryDepot = new Map<string, IncidentRegisterRow[]>()

  for (const row of open) {
    const key = `${row.category}::${row.depotId}`
    const list = byCategoryDepot.get(key) ?? []
    list.push(row)
    byCategoryDepot.set(key, list)
  }

  const alerts: RecurringIncidentAlert[] = []
  for (const [key, rows] of byCategoryDepot) {
    if (rows.length < 2) continue
    const [category, depotId] = key.split('::')
    const depotName = rows[0]?.depotName ?? depotId
    alerts.push({
      id: `rec-${category}-${depotId}`,
      category: category as IncidentRegisterRow['category'],
      depotName,
      count: rows.length,
      incidentRefs: rows.slice(0, 3).map((r) => r.incidentRef),
      summary: `${rows.length} open ${category.replace(/_/g, ' ')} incidents at ${depotName}`,
    })
  }

  return alerts.sort((a, b) => b.count - a.count)
}
