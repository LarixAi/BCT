/**
 * Server-side defect automation rules (ported from Admin client defaults).
 */
import { admin } from './supabase.ts'
import { raiseOperationalException } from './operational-exceptions.ts'

export type DefectAutomationRule = {
  id: string
  name: string
  trigger: string
  enabled: boolean
  actions: string[]
  description: string
}

export const DEFAULT_DEFECT_AUTOMATION_RULES: DefectAutomationRule[] = [
  {
    id: 'rule-critical-check',
    name: 'Critical vehicle-check response',
    trigger: 'critical_defect_reported',
    enabled: true,
    actions: ['mark_vor', 'block_dispatch', 'notify_operations', 'create_exception'],
    description: 'Brake/steering critical defects automatically VOR the vehicle and block dispatch',
  },
  {
    id: 'rule-accessibility',
    name: 'Accessibility equipment defect',
    trigger: 'accessibility_defect',
    enabled: true,
    actions: ['apply_wheelchair_restriction', 'notify_dispatch', 'create_maintenance_job'],
    description: 'Wheelchair lift/ramp defects restrict accessible assignments',
  },
  {
    id: 'rule-temp-repair-expiry',
    name: 'Temporary repair expiry',
    trigger: 'temporary_repair_expired',
    enabled: true,
    actions: ['reassess_availability', 'notify_maintenance', 'block_dispatch'],
    description: 'Expired temporary repairs return defect to action required',
  },
  {
    id: 'rule-repeated-component',
    name: 'Repeated component failure',
    trigger: 'recurring_component',
    enabled: true,
    actions: ['flag_recurring', 'notify_maintenance_manager', 'require_root_cause'],
    description: 'Same component failing repeatedly triggers engineering review',
  },
]

export function rulesTriggeredByDefect(input: {
  severity?: string | null
  category?: string | null
  component?: string | null
}): DefectAutomationRule[] {
  const triggered: DefectAutomationRule[] = []
  const severity = String(input.severity ?? '').toLowerCase()
  const category = String(input.category ?? '').toLowerCase()
  const component = String(input.component ?? '').toLowerCase()

  if (
    severity === 'dangerous' ||
    severity === 'critical' ||
    severity === 'safety_critical'
  ) {
    const rule = DEFAULT_DEFECT_AUTOMATION_RULES.find((r) => r.id === 'rule-critical-check')
    if (rule) triggered.push(rule)
  }

  if (
    category === 'accessibility' ||
    component.includes('wheelchair') ||
    component.includes('ramp')
  ) {
    const rule = DEFAULT_DEFECT_AUTOMATION_RULES.find((r) => r.id === 'rule-accessibility')
    if (rule) triggered.push(rule)
  }

  return triggered.filter((r) => r.enabled)
}

/** F-18: critical defects create one durable Command exception case (idempotent). */
export async function maybeCreateExceptionForDefect(input: {
  companyId: string
  actorUserId: string
  actorName: string
  defectId: string
  vehicleId: string
  severity?: string | null
  category?: string | null
  component?: string | null
  description: string
  registration?: string | null
}) {
  const rules = rulesTriggeredByDefect({
    severity: input.severity,
    category: input.category,
    component: input.component,
  })
  if (!rules.some((rule) => rule.actions.includes('create_exception'))) return null

  const { data: existing } = await admin
    .from('operational_exceptions')
    .select('id')
    .eq('company_id', input.companyId)
    .eq('source_entity_type', 'defect')
    .eq('source_entity_id', input.defectId)
    .not('status', 'in', '(resolved,dismissed)')
    .maybeSingle()
  if (existing?.id) return String(existing.id)

  const title = input.registration
    ? `Critical defect on ${input.registration}`
    : 'Critical vehicle defect'

  const raised = await raiseOperationalException({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    title,
    description: input.description,
    severity: 'critical',
    category: 'vehicle',
    typeCode: 'vehicle_defect_reported',
    sourceEntityType: 'defect',
    sourceEntityId: input.defectId,
    relatedRecord: input.registration ?? input.defectId,
    relatedHref: `/defects/${input.defectId}`,
    slaMinutes: 15,
  })
  return raised?.id ?? null
}
