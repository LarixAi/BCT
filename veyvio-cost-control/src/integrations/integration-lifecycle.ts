import {
  assertSameOrganisation,
  requireOrganisationId,
} from '../domain/tenancy'
import type { OrganisationId } from '../domain/types'

export type IntegrationDestination = 'sage' | 'payroll_provider'
export type IntegrationPayloadKind =
  | 'supplier_cost'
  | 'wage_journal'
  | 'vehicle_purchase'

export type IntegrationExportStatus =
  | 'queued'
  | 'sending'
  | 'accepted'
  | 'failed'
  | 'cancelled'

export type IntegrationExport = {
  id: string
  organisationId: OrganisationId
  destination: IntegrationDestination
  payloadKind: IntegrationPayloadKind
  entityId: string
  idempotencyKey: string
  payloadVersion: string
  payload: Readonly<Record<string, unknown>>
  status: IntegrationExportStatus
  retryCount: number
  lastFailureReason: string | null
  externalTransactionId: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type IntegrationAttempt = {
  id: string
  organisationId: OrganisationId
  exportId: string
  attemptNumber: number
  requestAt: string
  responseAt: string | null
  outcome: 'sending' | 'accepted' | 'failed'
  failureReason: string | null
  externalTransactionId: string | null
}

function requireText(value: string, field: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${field} is required`)
  return trimmed
}

export function createIntegrationExport(input: {
  id: string
  organisationId: OrganisationId
  destination: IntegrationDestination
  payloadKind: IntegrationPayloadKind
  entityId: string
  idempotencyKey: string
  payloadVersion: string
  payload: Readonly<Record<string, unknown>>
  createdBy: string
  nowIso: string
}): IntegrationExport {
  return {
    id: requireText(input.id, 'export id'),
    organisationId: requireOrganisationId(input.organisationId),
    destination: input.destination,
    payloadKind: input.payloadKind,
    entityId: requireText(input.entityId, 'entity id'),
    idempotencyKey: requireText(input.idempotencyKey, 'idempotency key'),
    payloadVersion: requireText(input.payloadVersion, 'payload version'),
    payload: Object.freeze({ ...input.payload }),
    status: 'queued',
    retryCount: 0,
    lastFailureReason: null,
    externalTransactionId: null,
    createdBy: requireText(input.createdBy, 'actor'),
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  }
}

export function assertUniqueIdempotencyKey(
  exports: IntegrationExport[],
  candidate: IntegrationExport,
): void {
  const duplicate = exports.find(
    (item) =>
      item.organisationId === candidate.organisationId &&
      item.destination === candidate.destination &&
      item.idempotencyKey === candidate.idempotencyKey &&
      item.id !== candidate.id,
  )
  if (duplicate) {
    throw new Error(
      `Duplicate integration export blocked for idempotency key ${candidate.idempotencyKey}`,
    )
  }
}

export function startIntegrationAttempt(input: {
  exportItem: IntegrationExport
  organisationId: OrganisationId
  attemptId: string
  nowIso: string
}): { exportItem: IntegrationExport; attempt: IntegrationAttempt } {
  assertSameOrganisation(
    input.organisationId,
    input.exportItem.organisationId,
    'integration export',
  )
  if (input.exportItem.status !== 'queued' && input.exportItem.status !== 'failed') {
    throw new Error(`Cannot send an integration export in ${input.exportItem.status} state`)
  }

  const attemptNumber = input.exportItem.retryCount + 1
  return {
    exportItem: {
      ...input.exportItem,
      status: 'sending',
      lastFailureReason: null,
      updatedAt: input.nowIso,
    },
    attempt: {
      id: requireText(input.attemptId, 'attempt id'),
      organisationId: input.exportItem.organisationId,
      exportId: input.exportItem.id,
      attemptNumber,
      requestAt: input.nowIso,
      responseAt: null,
      outcome: 'sending',
      failureReason: null,
      externalTransactionId: null,
    },
  }
}

export function acceptIntegrationAttempt(input: {
  exportItem: IntegrationExport
  attempt: IntegrationAttempt
  organisationId: OrganisationId
  externalTransactionId: string
  nowIso: string
}): { exportItem: IntegrationExport; attempt: IntegrationAttempt } {
  assertAttemptMatches(input.exportItem, input.attempt, input.organisationId)
  if (input.exportItem.status !== 'sending' || input.attempt.outcome !== 'sending') {
    throw new Error('Only a sending integration attempt can be accepted')
  }
  const externalTransactionId = requireText(
    input.externalTransactionId,
    'external transaction id',
  )
  return {
    exportItem: {
      ...input.exportItem,
      status: 'accepted',
      retryCount: input.attempt.attemptNumber,
      externalTransactionId,
      lastFailureReason: null,
      updatedAt: input.nowIso,
    },
    attempt: {
      ...input.attempt,
      outcome: 'accepted',
      responseAt: input.nowIso,
      externalTransactionId,
    },
  }
}

export function failIntegrationAttempt(input: {
  exportItem: IntegrationExport
  attempt: IntegrationAttempt
  organisationId: OrganisationId
  failureReason: string
  nowIso: string
}): { exportItem: IntegrationExport; attempt: IntegrationAttempt } {
  assertAttemptMatches(input.exportItem, input.attempt, input.organisationId)
  if (input.exportItem.status !== 'sending' || input.attempt.outcome !== 'sending') {
    throw new Error('Only a sending integration attempt can fail')
  }
  const failureReason = requireText(input.failureReason, 'failure reason')
  return {
    exportItem: {
      ...input.exportItem,
      status: 'failed',
      retryCount: input.attempt.attemptNumber,
      lastFailureReason: failureReason,
      updatedAt: input.nowIso,
    },
    attempt: {
      ...input.attempt,
      outcome: 'failed',
      responseAt: input.nowIso,
      failureReason,
    },
  }
}

function assertAttemptMatches(
  exportItem: IntegrationExport,
  attempt: IntegrationAttempt,
  organisationId: OrganisationId,
): void {
  assertSameOrganisation(organisationId, exportItem.organisationId, 'integration export')
  assertSameOrganisation(organisationId, attempt.organisationId, 'integration attempt')
  if (attempt.exportId !== exportItem.id) {
    throw new Error('Integration attempt does not belong to this export')
  }
}

