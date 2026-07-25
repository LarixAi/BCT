/**
 * F-07 — Overrides never silent.
 * Every safety/eligibility override must leave an append-only audit row.
 */
import { admin } from './supabase.ts'
import { emitDomainEvent } from './domain-events.ts'
import { writeImmutableAudit } from './audit-service.ts'

export type OverrideRecordInput = {
  companyId: string
  actorUserId: string | null
  ruleCode: string
  reason: string
  entityType: string
  entityId: string
  blockers?: string[]
  warnings?: string[]
  payload?: Record<string, unknown>
}

export async function recordOverride(input: OverrideRecordInput): Promise<{ id: string }> {
  const reason = String(input.reason ?? '').trim()
  if (!reason) {
    throw new Error('Override reason is required')
  }
  const ruleCode = String(input.ruleCode ?? '').trim() || 'unspecified'
  const blockers = input.blockers ?? []
  const warnings = input.warnings ?? []

  const { data, error } = await admin
    .from('override_audit_events')
    .insert({
      company_id: input.companyId,
      actor_user_id: input.actorUserId,
      rule_code: ruleCode,
      reason,
      entity_type: input.entityType,
      entity_id: input.entityId,
      blockers,
      warnings,
      payload: input.payload ?? {},
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Override audit could not be recorded')
  }

  const id = String(data.id)

  await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: 'override.recorded',
    entityType: input.entityType,
    entityId: input.entityId,
    reason,
    afterSnapshot: {
      overrideId: id,
      ruleCode,
      blockers,
      warnings,
      ...(input.payload ?? {}),
    },
  }).catch(() => undefined)

  await emitDomainEvent({
    companyId: input.companyId,
    eventType: 'override.recorded',
    entityType: input.entityType,
    entityId: input.entityId,
    actorUserId: input.actorUserId,
    payload: { overrideId: id, ruleCode, reason, blockers },
  }).catch(() => undefined)

  return { id }
}

export function requireOverrideReason(
  blockers: string[],
  overrideReason: string | null | undefined,
): { ok: true; reason: string } | { ok: false; message: string } {
  if (!blockers.length) return { ok: true, reason: '' }
  const reason = String(overrideReason ?? '').trim()
  if (!reason) {
    return {
      ok: false,
      message:
        blockers[0] ??
        'Assignment is blocked. Enter an override reason to continue, or pick another driver/vehicle.',
    }
  }
  return { ok: true, reason }
}
