import {
  COMPANY_PMI_TEMPLATE,
  getTemplateItem,
  validateBrakeEvidence,
} from '@/lib/maintenance/pmi-checklist'
import type { InspectionRecord } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null
  return Math.ceil((new Date(date).getTime() - Date.now()) / DAY_MS)
}

export function isOverdueDate(date: string | null | undefined): boolean {
  const d = daysUntil(date)
  return d != null && d < 0
}

export function isDueToday(date: string | null | undefined): boolean {
  return daysUntil(date) === 0
}

export function isDueWithin(date: string | null | undefined, days: number): boolean {
  const d = daysUntil(date)
  return d != null && d >= 0 && d <= days
}

export function daysRemainingLabel(date: string): string {
  const d = daysUntil(date)
  if (d == null) return '—'
  if (d < 0) return `${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} overdue`
  if (d === 0) return 'Due today'
  return `Due in ${d} day${d === 1 ? '' : 's'}`
}

export function hasMissingBrakeEvidence(row: InspectionRecord): boolean {
  if (row.status === 'signed_off') return false
  if (!row.checklist) return row.inspectionType === 'safety_pmi'
  return COMPANY_PMI_TEMPLATE.items.some((tmpl) => {
    if (!tmpl.requiresBrakeEvidence) return false
    const item = row.checklist!.items.find((i) => i.templateItemId === tmpl.id)
    return Boolean(validateBrakeEvidence(item, getTemplateItem(tmpl.id) ?? tmpl))
  })
}
