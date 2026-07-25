/**
 * F-09 — material writes produce domain events.
 */
import { admin } from './supabase.ts'

export type DomainEventInput = {
  companyId: string
  eventType: string
  entityType: string
  entityId: string
  actorUserId?: string | null
  payload?: Record<string, unknown>
}

export async function emitDomainEvent(input: DomainEventInput): Promise<{ id: string }> {
  const { data, error } = await admin
    .from('domain_events')
    .insert({
      company_id: input.companyId,
      event_type: input.eventType,
      entity_type: input.entityType,
      entity_id: input.entityId,
      actor_user_id: input.actorUserId ?? null,
      payload: input.payload ?? {},
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Domain event could not be recorded')
  }
  return { id: String(data.id) }
}
