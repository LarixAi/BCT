import { DOCUMENT_REQUIREMENT_OPTIONS } from './constants'
import { DRIVER_TRAINING_CATALOG, buildTrainingRequirements, isMandatoryTrainingKey } from './training'
import type { DriverDocument, DriverProfile, TrainingRequirement } from './types'

export type RequirementType =
  | 'document'
  | 'qualification'
  | 'internal_training'
  | 'external_training'
  | 'acknowledgement'
  | 'account_setup'

export type RequirementStatus =
  | 'missing'
  | 'request_sent'
  | 'opened'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'expiring_soon'
  | 'not_applicable'
  | 'waived'
  | 'training_assigned'
  | 'in_progress'
  | 'completed'

export type RequirementChannel = 'in_app' | 'email' | 'sms'

export interface ActivationRequirement {
  id: string
  driverId: string
  definitionKey: string
  name: string
  type: RequirementType
  mandatory: boolean
  blocksActivation: boolean
  status: RequirementStatus
  responsibleLabel: string
  lastRequestedAt: string | null
  lastRequestedChannels: RequirementChannel[]
  openedAt: string | null
  requestCount: number
  dueAt: string | null
  documentId: string | null
  expiryDate: string | null
  primaryAction: string
  evidenceHint: string
}

export interface ActivationSummaryCounts {
  documentsApproved: number
  documentsUnderReview: number
  documentsMissing: number
  trainingComplete: number
  trainingIncomplete: number
  qualificationsApproved: number
  qualificationsMissing: number
  accountIncomplete: boolean
  criticalBlockers: number
  incompleteRequirements: number
}

export interface ActivationResolutionModel {
  requirements: ActivationRequirement[]
  summary: ActivationSummaryCounts
  accountStatusLabel: string
  onboardingStatusLabel: string
  complianceStatusLabel: string
  dispatchStatusLabel: string
  canActivate: boolean
  activateBlockedReasons: string[]
}

export const REQUIREMENT_STATUS_LABEL: Record<RequirementStatus, string> = {
  missing: 'Missing',
  request_sent: 'Request sent',
  opened: 'Opened by driver',
  submitted: 'Upload received',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
  expiring_soon: 'Expiring soon',
  not_applicable: 'Not applicable',
  waived: 'Waiver approved',
  training_assigned: 'Training assigned',
  in_progress: 'Training in progress',
  completed: 'Completed',
}

const QUALIFICATION_KEYS = new Set([
  'midas_standard',
  'midas_accessible',
  'first_aid_efaw',
  'driver_cpc',
])

type RequestMeta = {
  lastRequestedAt: string | null
  channels: RequirementChannel[]
  openedAt: string | null
  requestCount: number
  dueAt: string | null
  statusOverride?: RequirementStatus | null
}

const requestStore = new Map<string, RequestMeta>()

function storeKey(driverId: string, definitionKey: string) {
  return `${driverId}:${definitionKey}`
}

export function getRequirementRequestMeta(driverId: string, definitionKey: string): RequestMeta {
  return (
    requestStore.get(storeKey(driverId, definitionKey)) ?? {
      lastRequestedAt: null,
      channels: [],
      openedAt: null,
      requestCount: 0,
      dueAt: null,
      statusOverride: null,
    }
  )
}

export function recordRequirementRequest(input: {
  driverId: string
  definitionKeys: string[]
  channels: RequirementChannel[]
  dueAt: string | null
  actorName: string
}) {
  const now = new Date().toISOString()
  for (const key of input.definitionKeys) {
    const prev = getRequirementRequestMeta(input.driverId, key)
    requestStore.set(storeKey(input.driverId, key), {
      lastRequestedAt: now,
      channels: input.channels,
      openedAt: prev.openedAt,
      requestCount: prev.requestCount + 1,
      dueAt: input.dueAt,
      statusOverride: 'request_sent',
    })
  }
  return { sentAt: now, count: input.definitionKeys.length, actorName: input.actorName }
}

export function markRequirementLocalStatus(
  driverId: string,
  definitionKey: string,
  status: RequirementStatus,
) {
  const prev = getRequirementRequestMeta(driverId, definitionKey)
  requestStore.set(storeKey(driverId, definitionKey), {
    ...prev,
    statusOverride: status,
  })
}

/** Hydrate the in-memory request store from persisted API state. */
export function hydrateRequirementStore(
  driverId: string,
  states: Array<{
    definitionKey: string
    statusOverride?: string | null
    lastRequestedAt?: string | null
    lastRequestedChannels?: RequirementChannel[]
    openedAt?: string | null
    requestCount?: number
    dueAt?: string | null
  }>,
) {
  for (const state of states) {
    requestStore.set(storeKey(driverId, state.definitionKey), {
      lastRequestedAt: state.lastRequestedAt ?? null,
      channels: state.lastRequestedChannels ?? [],
      openedAt: state.openedAt ?? null,
      requestCount: state.requestCount ?? 0,
      dueAt: state.dueAt ?? null,
      statusOverride: (state.statusOverride as RequirementStatus | null) ?? null,
    })
  }
}

function primaryActionFor(status: RequirementStatus, type: RequirementType): string {
  switch (status) {
    case 'missing':
      return type === 'internal_training' ? 'Assign' : 'Request'
    case 'request_sent':
      return 'Resend'
    case 'opened':
      return 'Send reminder'
    case 'submitted':
    case 'under_review':
      return 'Review'
    case 'rejected':
      return 'Request replacement'
    case 'training_assigned':
    case 'in_progress':
      return 'View progress'
    case 'expired':
    case 'expiring_soon':
      return 'Request renewal'
    case 'approved':
    case 'completed':
      return 'View'
    case 'waived':
    case 'not_applicable':
      return 'View history'
    default:
      return 'Open'
  }
}

function docStatus(doc: DriverDocument | undefined): RequirementStatus {
  if (!doc) return 'missing'
  switch (doc.verificationStatus) {
    case 'verified':
      return 'approved'
    case 'expiring_soon':
      return 'expiring_soon'
    case 'expired':
      return 'expired'
    case 'rejected':
      return 'rejected'
    case 'awaiting_review':
    case 'uploaded':
      return 'under_review'
    default:
      return 'missing'
  }
}

function trainingStatus(req: TrainingRequirement, meta: RequestMeta): RequirementStatus {
  if (meta.statusOverride && !['approved', 'completed'].includes(req.status)) {
    if (req.status === 'missing') return meta.statusOverride
  }
  switch (req.status) {
    case 'complete':
      return 'completed'
    case 'due_soon':
      return 'expiring_soon'
    case 'expired':
      return 'expired'
    case 'failed':
      return 'rejected'
    default:
      return meta.statusOverride ?? 'missing'
  }
}

function responsibleFor(type: RequirementType, status: RequirementStatus): string {
  if (status === 'under_review' || status === 'submitted') return 'Admin'
  if (type === 'internal_training') return 'Training lead'
  if (type === 'account_setup') return 'Admin'
  return 'Driver'
}

export function buildActivationResolution(driver: DriverProfile): ActivationResolutionModel {
  const requirements: ActivationRequirement[] = []
  const training = driver.trainingRequirements?.length
    ? driver.trainingRequirements
    : buildTrainingRequirements(driver)

  // Account setup
  const accountIncomplete = [
    'draft',
    'invitation_pending',
    'setup_incomplete',
    'invitation_expired',
    'pending_approval',
  ].includes(driver.account.accountStatus)
  const accountMeta = getRequirementRequestMeta(driver.id, 'app_account')
  const accountStatus: RequirementStatus = accountIncomplete
    ? accountMeta.statusOverride === 'request_sent'
      ? 'request_sent'
      : 'missing'
    : driver.account.accountStatus === 'active'
      ? 'approved'
      : 'in_progress'
  requirements.push({
    id: `${driver.id}:app_account`,
    driverId: driver.id,
    definitionKey: 'app_account',
    name: 'Driver app account',
    type: 'account_setup',
    mandatory: true,
    blocksActivation: true,
    status: accountStatus,
    responsibleLabel: 'Admin',
    lastRequestedAt: accountMeta.lastRequestedAt ?? driver.account.invitationSentAt ?? null,
    lastRequestedChannels: accountMeta.channels.length
      ? accountMeta.channels
      : driver.account.invitationChannel
        ? driver.account.invitationChannel === 'both'
          ? ['email', 'sms']
          : driver.account.invitationChannel === 'sms'
            ? ['sms']
            : ['email']
        : [],
    openedAt: accountMeta.openedAt,
    requestCount: accountMeta.requestCount,
    dueAt: accountMeta.dueAt,
    documentId: null,
    expiryDate: null,
    primaryAction: primaryActionFor(accountStatus, 'account_setup'),
    evidenceHint: 'Invite the driver to create their own password. Admins never set it.',
  })

  // Core compliance documents
  for (const def of DOCUMENT_REQUIREMENT_OPTIONS) {
    const doc = driver.documents.find((d) => d.requirementType === def.type)
    const meta = getRequirementRequestMeta(driver.id, def.type)
    let status = docStatus(doc)
    if (status === 'missing' && meta.statusOverride) status = meta.statusOverride
    requirements.push({
      id: `${driver.id}:${def.type}`,
      driverId: driver.id,
      definitionKey: def.type,
      name: def.label,
      type: 'document',
      mandatory: true,
      blocksActivation: status !== 'approved' && status !== 'expiring_soon' && status !== 'waived',
      status,
      responsibleLabel: responsibleFor('document', status),
      lastRequestedAt: meta.lastRequestedAt,
      lastRequestedChannels: meta.channels,
      openedAt: meta.openedAt,
      requestCount: meta.requestCount,
      dueAt: meta.dueAt,
      documentId: doc?.id ?? null,
      expiryDate: doc?.expiryDate ?? null,
      primaryAction: primaryActionFor(status, 'document'),
      evidenceHint: 'Upload or request a clear photo of the document, including expiry date.',
    })
  }

  // Mandatory training / qualifications from catalogue
  for (const req of training) {
    if (!isMandatoryTrainingKey(req.key) && req.status === 'missing') {
      // Still show mandatory catalogue items even if permission-gated missing ones appear
    }
    const catalog = DRIVER_TRAINING_CATALOG.find((c) => c.key === req.key)
    if (!catalog) continue
    if (catalog.category === 'role' && req.status === 'missing' && !catalog.permissions.length) {
      // skip unused
    }
    // Only include mandatory catalogue items, or role items that apply (present in training list)
    if (
      catalog.category === 'role' &&
      !driver.workPermissions.some((p) => p.enabled && catalog.permissions.includes(p.key))
    ) {
      continue
    }

    const meta = getRequirementRequestMeta(driver.id, req.key)
    const isQual = QUALIFICATION_KEYS.has(req.key) || Boolean(catalog.documentTypes?.length)
    const type: RequirementType = isQual ? 'qualification' : 'internal_training'
    let status = trainingStatus(req, meta)
    requirements.push({
      id: `${driver.id}:${req.key}`,
      driverId: driver.id,
      definitionKey: req.key,
      name: catalog.label,
      type,
      mandatory: catalog.category === 'mandatory' || isMandatoryTrainingKey(req.key),
      blocksActivation:
        (catalog.category === 'mandatory' || isMandatoryTrainingKey(req.key)) &&
        !['approved', 'completed', 'waived', 'not_applicable', 'expiring_soon'].includes(status),
      status,
      responsibleLabel: responsibleFor(type, status),
      lastRequestedAt: meta.lastRequestedAt,
      lastRequestedChannels: meta.channels,
      openedAt: meta.openedAt,
      requestCount: meta.requestCount,
      dueAt: meta.dueAt,
      documentId: null,
      expiryDate: req.expiresAt,
      primaryAction: primaryActionFor(status, type),
      evidenceHint: isQual
        ? 'Upload certificate evidence or request company training.'
        : 'Assign internal training or record completion.',
    })
  }

  const documents = requirements.filter((r) => r.type === 'document')
  const trainingRows = requirements.filter((r) => r.type === 'internal_training')
  const quals = requirements.filter((r) => r.type === 'qualification')
  const incomplete = requirements.filter(
    (r) =>
      r.mandatory &&
      !['approved', 'completed', 'waived', 'not_applicable', 'expiring_soon'].includes(r.status),
  )
  const critical = incomplete.filter((r) => r.blocksActivation)

  const summary: ActivationSummaryCounts = {
    documentsApproved: documents.filter((r) => r.status === 'approved' || r.status === 'expiring_soon')
      .length,
    documentsUnderReview: documents.filter((r) => r.status === 'under_review' || r.status === 'submitted')
      .length,
    documentsMissing: documents.filter((r) =>
      ['missing', 'request_sent', 'opened', 'rejected', 'expired'].includes(r.status),
    ).length,
    trainingComplete: trainingRows.filter((r) => r.status === 'completed' || r.status === 'approved')
      .length,
    trainingIncomplete: trainingRows.filter(
      (r) => !['completed', 'approved', 'waived', 'not_applicable'].includes(r.status),
    ).length,
    qualificationsApproved: quals.filter((r) => r.status === 'completed' || r.status === 'approved')
      .length,
    qualificationsMissing: quals.filter(
      (r) => !['completed', 'approved', 'waived', 'not_applicable', 'expiring_soon'].includes(r.status),
    ).length,
    accountIncomplete,
    criticalBlockers: critical.length,
    incompleteRequirements: incomplete.length,
  }

  const activateBlockedReasons: string[] = []
  if (accountIncomplete) activateBlockedReasons.push('Driver app account setup is incomplete')
  if (summary.trainingIncomplete > 0) {
    activateBlockedReasons.push(`${summary.trainingIncomplete} mandatory training requirements are incomplete`)
  }
  if (summary.qualificationsMissing > 0) {
    activateBlockedReasons.push(`${summary.qualificationsMissing} qualifications or certificates are incomplete`)
  }
  if (summary.documentsMissing > 0 || summary.documentsUnderReview > 0) {
    activateBlockedReasons.push(
      `${summary.documentsMissing + summary.documentsUnderReview} document requirements need attention`,
    )
  }

  const canActivate = driver.eligibility.canAssign && incomplete.length === 0

  return {
    requirements,
    summary,
    accountStatusLabel: driver.account.accountStatus.replace(/_/g, ' '),
    onboardingStatusLabel: incomplete.length === 0 ? 'Complete' : accountIncomplete ? 'Awaiting driver' : 'In progress',
    complianceStatusLabel: canActivate
      ? 'Eligible'
      : critical.length > 0
        ? 'Critically blocked'
        : 'Temporarily blocked',
    dispatchStatusLabel: canActivate ? 'Available for assignment' : 'Unavailable',
    canActivate,
    activateBlockedReasons,
  }
}

/** Failures that are only restating missing requirements — hide when the centre is shown. */
export function isAggregateOnboardingFailure(code: string): boolean {
  return code === 'onboarding_incomplete'
}
