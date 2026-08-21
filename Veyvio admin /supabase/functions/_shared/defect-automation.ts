/**
 * Server-side defect automation rules (ported from Admin client defaults).
 *
 * PROD-1 Batch 03 — authority declaration / bare-admin removal.
 * Not UserScopedDb / RLS cutover. Reads still use company-scoped service-role
 * via companyScopedServiceDbForCompany; company_id filters remain defence-in-depth.
 *
 * Exception creation stays on raiseOperationalException (operational-exceptions
 * remains a transitional importer until its own batch).
 */
import { resolveTenantDb } from './db-authority.ts'
import { raiseOperationalException } from './operational-exceptions.ts'
import {
  defectCreatesOperationalException,
} from './defect-automation.mapping.ts'

export type { DefectAutomationRule } from './defect-automation.mapping.ts'
export {
  DEFAULT_DEFECT_AUTOMATION_RULES,
  defectCreatesOperationalException,
  rulesTriggeredByDefect,
} from './defect-automation.mapping.ts'

function defectAutomationDb(companyId: string) {
  return resolveTenantDb(companyId, 'defect_automation')
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
  if (
    !defectCreatesOperationalException({
      severity: input.severity,
      category: input.category,
      component: input.component,
    })
  ) {
    return null
  }

  const { data: existing } = await defectAutomationDb(input.companyId)
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
