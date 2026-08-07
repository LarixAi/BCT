/**
 * Gate 2 — document-expiry notification hook (in-app).
 * Scans driver compliance dates and emits `document.expiring` notifications.
 */
import { admin } from './supabase.ts'
import { notifyDriverAppUser } from './notifications.ts'
import { resolveNotificationTemplate } from './notification-rules.ts'

const EXPIRY_WINDOW_DAYS = 30

function daysUntil(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const t = new Date(String(raw)).getTime()
  if (Number.isNaN(t)) return null
  return Math.ceil((t - Date.now()) / (24 * 60 * 60 * 1000))
}

export async function notifyExpiringDriverDocuments(companyId: string): Promise<{
  scanned: number
  notified: number
}> {
  const template = resolveNotificationTemplate('document.expiring')
  const { data: drivers, error } = await admin
    .from('drivers')
    .select('id, licence_expiry_date, cpc_expiry_date, dbs_expiry_date, medical_expiry_date')
    .eq('company_id', companyId)
    .limit(500)

  if (error) throw new Error(error.message)

  let notified = 0
  for (const row of drivers ?? []) {
    const checks: Array<{ label: string; days: number }> = []
    for (const [field, label] of [
      ['licence_expiry_date', 'Driving licence'],
      ['cpc_expiry_date', 'CPC'],
      ['dbs_expiry_date', 'DBS'],
      ['medical_expiry_date', 'Medical'],
    ] as const) {
      const days = daysUntil(row[field])
      if (days == null) continue
      if (days < 0 || days > EXPIRY_WINDOW_DAYS) continue
      checks.push({ label, days })
    }
    if (!checks.length) continue

    const soonest = checks.sort((a, b) => a.days - b.days)[0]
    const title = template?.title ?? 'Document expiring'
    const body =
      soonest.days < 0
        ? `${soonest.label} has expired. Update it before your next shift.`
        : `${soonest.label} expires in ${soonest.days} day${soonest.days === 1 ? '' : 's'}. Update it before your next shift.`

    const result = await notifyDriverAppUser({
      companyId,
      driverId: String(row.id),
      type: 'document.expiring',
      title,
      body,
      severity: soonest.days <= 7 ? 'warning' : 'attention',
      actionUrl: '/documents',
      sourceEntityType: 'driver',
      sourceEntityId: String(row.id),
    }).catch(() => ({ inserted: 0 }))

    if (result && result.inserted > 0) notified += 1
  }

  return { scanned: (drivers ?? []).length, notified }
}
