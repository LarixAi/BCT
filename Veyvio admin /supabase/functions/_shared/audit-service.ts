/**
 * F-10 — immutable audit service (append-only).
 * Material writes should prefer this helper so audit rows share one shape.
 */
import { admin } from './supabase.ts'

export type ImmutableAuditInput = {
  companyId: string
  actorUserId?: string | null
  actorType?: string
  action: string
  entityType: string
  entityId: string
  reason?: string | null
  correlationId?: string | null
  sourceApp?: string
  beforeSnapshot?: Record<string, unknown> | null
  afterSnapshot?: Record<string, unknown> | null
}

export async function writeImmutableAudit(input: ImmutableAuditInput): Promise<{ id: string }> {
  const { data, error } = await admin
    .from('audit_events')
    .insert({
      company_id: input.companyId,
      actor_type: input.actorType ?? 'user',
      actor_id: input.actorUserId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      reason: input.reason ?? null,
      correlation_id: input.correlationId ?? null,
      source_app: input.sourceApp ?? 'COMMAND',
      before_snapshot: input.beforeSnapshot ?? null,
      after_snapshot: input.afterSnapshot ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Audit event could not be recorded')
  }
  return { id: String(data.id) }
}
