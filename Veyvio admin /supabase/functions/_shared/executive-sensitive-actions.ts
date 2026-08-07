import { decideExecutiveAuthorisation, type ExecutiveAction } from './executive-authorisation.ts'
import {
  AnnualBudgetValidationError,
  validateAnnualBudgetProposal,
} from './executive-annual-budget-policy.ts'
import { HttpError } from './http.ts'
import { admin, type RequestContext } from './supabase.ts'
import { recordSecurityEvent, validateExecutiveUserSession } from './tenant-auth.ts'

export const SENSITIVE_ACTION_TYPES = [
  'executive_administrator_change',
  'director_or_officer_change',
  'annual_budget_approval',
  'company_policy_publication',
  'restricted_export',
  'bank_authority_change',
  'support_access_change',
  'security_settings_change',
  'company_closure_or_deletion',
  'retention_purge',
] as const

export type SensitiveActionType = (typeof SENSITIVE_ACTION_TYPES)[number]

type SensitiveActionRule = {
  label: string
  proposeAction: ExecutiveAction
  approveAction: ExecutiveAction
}

export const SENSITIVE_ACTION_RULES: Record<SensitiveActionType, SensitiveActionRule> = {
  executive_administrator_change: {
    label: 'Executive administrator change',
    proposeAction: 'executive.accounts.manage',
    approveAction: 'executive.board_reserved.approve',
  },
  director_or_officer_change: {
    label: 'Director or accountable officer change',
    proposeAction: 'executive.directors.propose',
    approveAction: 'executive.board_reserved.approve',
  },
  annual_budget_approval: {
    label: 'Annual budget approval or revision',
    proposeAction: 'executive.budget.propose',
    approveAction: 'executive.budget.approve',
  },
  company_policy_publication: {
    label: 'Company policy publication',
    proposeAction: 'executive.policy.propose',
    approveAction: 'executive.policy.approve',
  },
  restricted_export: {
    label: 'Restricted information export',
    proposeAction: 'executive.export.propose',
    approveAction: 'executive.board_reserved.approve',
  },
  bank_authority_change: {
    label: 'Bank mandate or payment-authority change',
    proposeAction: 'executive.bank_authority.propose',
    approveAction: 'executive.board_reserved.approve',
  },
  support_access_change: {
    label: 'Support-access change',
    proposeAction: 'executive.support_access.propose',
    approveAction: 'executive.board_reserved.approve',
  },
  security_settings_change: {
    label: 'Security-setting change',
    proposeAction: 'executive.security_settings.propose',
    approveAction: 'executive.board_reserved.approve',
  },
  company_closure_or_deletion: {
    label: 'Company closure or destructive deletion',
    proposeAction: 'executive.company_close.propose',
    approveAction: 'executive.board_reserved.approve',
  },
  retention_purge: {
    label: 'Destructive retention purge',
    proposeAction: 'executive.export.propose',
    approveAction: 'executive.board_reserved.approve',
  },
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CORRELATION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/
const TARGET_TYPE_PATTERN = /^[a-z][a-z0-9_]{2,79}$/

function isSensitiveActionType(value: string): value is SensitiveActionType {
  return (SENSITIVE_ACTION_TYPES as readonly string[]).includes(value)
}

function safeCorrelationId(value: string | null): string {
  return value && CORRELATION_PATTERN.test(value) ? value : crypto.randomUUID()
}

function assertSnapshot(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, `${label} must be an object`, 'invalid_sensitive_action')
  }
  if (JSON.stringify(value).length > 24_000) {
    throw new HttpError(413, `${label} is too large`, 'sensitive_action_too_large')
  }
  return value as Record<string, unknown>
}

function evidenceReferences(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new HttpError(
      400,
      'At least one supporting evidence reference is required',
      'sensitive_action_evidence_required',
    )
  }
  const references = value
    .map((entry) => String(entry ?? '').trim())
    .filter(Boolean)
  if (
    references.length < 1 ||
    references.length > 10 ||
    references.some((entry) => entry.length > 500)
  ) {
    throw new HttpError(
      400,
      'Provide between one and ten valid evidence references',
      'sensitive_action_evidence_required',
    )
  }
  return references
}

function reasonText(value: unknown, minimum = 10): string {
  const reason = String(value ?? '').trim()
  if (reason.length < minimum || reason.length > 2_000) {
    throw new HttpError(
      400,
      `A reason of at least ${minimum} characters is required`,
      'sensitive_action_reason_required',
    )
  }
  return reason
}

async function requireExecutiveSession(
  context: RequestContext,
  request: Request,
  requireFreshStepUp: boolean,
) {
  const sessionId = request.headers.get('x-veyvio-session-id') ?? ''
  if (!UUID_PATTERN.test(sessionId)) {
    throw new HttpError(
      403,
      'Confirm your Executive session with multi-factor authentication',
      'executive_step_up_required',
    )
  }
  const session = await validateExecutiveUserSession({
    sessionId,
    userId: context.user.id,
    companyId: context.companyId,
    membershipId: context.membershipId,
  })
  if (requireFreshStepUp && !session.stepUpFresh) {
    throw new HttpError(
      403,
      'Sign in with multi-factor authentication again to continue',
      'executive_step_up_required',
    )
  }
  return session
}

function assertAuthorised(input: {
  context: RequestContext
  action: ExecutiveAction
  proposerUserId?: string | null
}) {
  const decision = decideExecutiveAuthorisation({
    actorUserId: input.context.user.id,
    roleKeys: input.context.roleKeys,
    action: input.action,
    companyId: input.context.companyId,
    resourceCompanyId: input.context.companyId,
    proposerUserId: input.proposerUserId,
  })
  if (!decision.allowed) {
    throw new HttpError(403, decision.message, decision.code)
  }
}

async function independentReviewerUserIds(input: {
  companyId: string
  proposerUserId: string
  approveAction: ExecutiveAction
}) {
  const [{ data: memberships }, { data: accessRows }] = await Promise.all([
    admin
      .from('company_memberships')
      .select('id, user_id, role_ids')
      .eq('company_id', input.companyId)
      .eq('status', 'active'),
    admin
      .from('membership_application_access')
      .select('membership_id')
      .eq('company_id', input.companyId)
      .eq('app_type', 'EXECUTIVE')
      .eq('status', 'active'),
  ])
  const allowedMemberships = new Set((accessRows ?? []).map((row) => String(row.membership_id)))
  const roleIds = [
    ...new Set(
      (memberships ?? []).flatMap((membership) =>
        ((membership.role_ids as string[] | null) ?? []).map(String)
      ),
    ),
  ]
  const { data: roles } = roleIds.length
    ? await admin.from('roles').select('id, name').eq('company_id', input.companyId).in('id', roleIds)
    : { data: [] as Array<{ id: string; name: string }> }
  const roleById = new Map((roles ?? []).map((role) => [String(role.id), String(role.name)]))

  return (memberships ?? []).flatMap((membership) => {
    const userId = String(membership.user_id)
    if (
      userId === input.proposerUserId ||
      !allowedMemberships.has(String(membership.id))
    ) {
      return []
    }
    const roleKeys = ((membership.role_ids as string[] | null) ?? [])
      .map((id) => roleById.get(String(id)))
      .filter((role): role is string => Boolean(role))
    const decision = decideExecutiveAuthorisation({
      actorUserId: userId,
      roleKeys,
      action: input.approveAction,
      companyId: input.companyId,
      resourceCompanyId: input.companyId,
      proposerUserId: input.proposerUserId,
    })
    return decision.allowed ? [userId] : []
  })
}

async function insertNotifications(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return
  await admin.from('notifications').insert(rows)
}

async function assertTypedProposalTarget(
  actionType: SensitiveActionType,
  context: RequestContext,
  input: {
    targetType: string
    targetId: string | null
    beforeSnapshot: Record<string, unknown>
    proposedSnapshot: Record<string, unknown>
  },
) {
  if (actionType === 'company_policy_publication') {
    if (input.targetType !== 'executive_policy' || !input.targetId || !UUID_PATTERN.test(input.targetId)) {
      throw new HttpError(400, 'Policy publication requires an executive_policy target', 'invalid_sensitive_action')
    }
    const { data, error } = await admin
      .from('executive_policies')
      .select('id, company_id, status, title, version_label')
      .eq('id', input.targetId)
      .eq('company_id', context.companyId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data || !['draft', 'in_review'].includes(String(data.status))) {
      throw new HttpError(409, 'Only draft or in-review policies can be proposed for publication', 'sensitive_action_conflict')
    }
    return
  }

  if (actionType === 'executive_administrator_change') {
    const membershipId = String(input.proposedSnapshot.membershipId ?? '').trim()
    if (!UUID_PATTERN.test(membershipId)) {
      throw new HttpError(400, 'Administrator change requires membershipId', 'invalid_sensitive_action')
    }
    const accessLevel = String(input.proposedSnapshot.accessLevel ?? 'admin').trim()
    if (!['member', 'manager', 'admin', 'oversight'].includes(accessLevel)) {
      throw new HttpError(400, 'Administrator accessLevel is invalid', 'invalid_sensitive_action')
    }
    const { data, error } = await admin
      .from('company_memberships')
      .select('id')
      .eq('id', membershipId)
      .eq('company_id', context.companyId)
      .eq('status', 'active')
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) {
      throw new HttpError(404, 'Administrator membership was not found in this company', 'sensitive_action_not_found')
    }
    return
  }

  if (actionType === 'director_or_officer_change') {
    const membershipId = String(input.proposedSnapshot.membershipId ?? '').trim()
    const roleNames = Array.isArray(input.proposedSnapshot.roleNames)
      ? input.proposedSnapshot.roleNames.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean)
      : []
    if (!UUID_PATTERN.test(membershipId) || roleNames.length < 1) {
      throw new HttpError(400, 'Director change requires membershipId and roleNames', 'invalid_sensitive_action')
    }
    return
  }

  if (actionType === 'support_access_change') {
    const granteeUserId = String(input.proposedSnapshot.granteeUserId ?? '').trim()
    if (!UUID_PATTERN.test(granteeUserId)) {
      throw new HttpError(400, 'Support access requires granteeUserId', 'invalid_sensitive_action')
    }
    return
  }

  if (actionType === 'security_settings_change') {
    const settings = input.proposedSnapshot.settings ?? input.proposedSnapshot
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw new HttpError(400, 'Security settings require an object snapshot', 'invalid_sensitive_action')
    }
    return
  }

  if (actionType === 'company_closure_or_deletion') {
    if (String(input.proposedSnapshot.destructiveDeletion ?? '').toLowerCase() === 'true') {
      throw new HttpError(
        400,
        'Hard deletion is not executed through Executive. Propose soft closure only.',
        'invalid_sensitive_action',
      )
    }
  }

  if (actionType === 'retention_purge') {
    const category = String(input.proposedSnapshot.retentionCategory ?? '').trim()
    const ids = Array.isArray(input.proposedSnapshot.documentFileIds)
      ? input.proposedSnapshot.documentFileIds.map((entry) => String(entry).trim())
      : []
    if (!category || ids.length < 1 || ids.some((id) => !UUID_PATTERN.test(id))) {
      throw new HttpError(
        400,
        'Retention purge requires retentionCategory and documentFileIds',
        'invalid_sensitive_action',
      )
    }
    if (ids.length > 100) {
      throw new HttpError(400, 'Retention purge is limited to 100 documents per job', 'invalid_sensitive_action')
    }
    const { data: docs, error } = await admin
      .from('executive_document_files')
      .select('id, legal_hold')
      .eq('company_id', context.companyId)
      .in('id', ids)
    if (error) throw new Error(error.message)
    if ((docs ?? []).length !== ids.length) {
      throw new HttpError(404, 'One or more purge targets were not found', 'sensitive_action_not_found')
    }
  }
}

export async function createSensitiveActionRequest(
  context: RequestContext,
  request: Request,
  input: Record<string, unknown>,
) {
  const session = await requireExecutiveSession(context, request, true)
  const actionType = String(input.actionType ?? '').trim()
  if (!isSensitiveActionType(actionType)) {
    throw new HttpError(400, 'Sensitive action type is not recognised', 'invalid_sensitive_action')
  }
  if (actionType === 'annual_budget_approval') {
    throw new HttpError(
      400,
      'Annual budgets must use the authoritative annual-budget proposal route',
      'annual_budget_route_required',
    )
  }
  const rule = SENSITIVE_ACTION_RULES[actionType]
  assertAuthorised({ context, action: rule.proposeAction })

  const targetType = String(input.targetType ?? '').trim()
  if (!TARGET_TYPE_PATTERN.test(targetType)) {
    throw new HttpError(400, 'A valid target type is required', 'invalid_sensitive_action')
  }
  const targetId = input.targetId == null ? null : String(input.targetId).trim()
  if (targetId && targetId.length > 200) {
    throw new HttpError(400, 'Target reference is too long', 'invalid_sensitive_action')
  }

  const reason = reasonText(input.reason)
  const evidence = evidenceReferences(input.evidenceReferences)
  const beforeSnapshot = assertSnapshot(input.beforeSnapshot, 'Before snapshot')
  const proposedSnapshot = assertSnapshot(input.proposedSnapshot, 'Proposed snapshot')
  await assertTypedProposalTarget(actionType, context, {
    targetType,
    targetId,
    beforeSnapshot,
    proposedSnapshot,
  })
  const correlationId = safeCorrelationId(request.headers.get('x-veyvio-request-id'))
  const reviewers = await independentReviewerUserIds({
    companyId: context.companyId,
    proposerUserId: context.user.id,
    approveAction: rule.approveAction,
  })
  if (!reviewers.length) {
    throw new HttpError(
      409,
      'An independent authorised reviewer must be assigned before this request can be created',
      'independent_reviewer_required',
    )
  }

  const { data, error } = await admin
    .from('executive_sensitive_action_requests')
    .insert({
      company_id: context.companyId,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId || null,
      reason,
      evidence_references: evidence,
      before_snapshot: beforeSnapshot,
      proposed_snapshot: proposedSnapshot,
      proposer_user_id: context.user.id,
      proposer_membership_id: context.membershipId,
      proposer_roles: context.roleKeys,
      proposer_session_id: session.id,
      request_correlation_id: correlationId,
      required_independent_approvals: 1,
    })
    .select('id, action_type, target_type, target_id, status, created_at')
    .single()
  if (error || !data) {
    throw new Error(error?.message ?? 'Sensitive action request could not be recorded')
  }

  await insertNotifications(
    reviewers.map((userId) => ({
      company_id: context.companyId,
      recipient_user_id: userId,
      notification_type: 'executive.sensitive_action.review_required',
      title: `${rule.label} requires independent review`,
      body: reason,
      severity: 'attention',
      source_entity_type: 'executive_sensitive_action_request',
      source_entity_id: data.id,
      action_url: '/?view=decisions',
      status: 'unread',
    })),
  )

  return {
    request: data,
    reviewerCount: reviewers.length,
    executionState: 'not_executed',
  }
}

export async function decideSensitiveActionRequest(
  context: RequestContext,
  request: Request,
  requestId: string,
  input: Record<string, unknown>,
  expectedActionType?: SensitiveActionType,
) {
  if (!UUID_PATTERN.test(requestId)) {
    throw new HttpError(404, 'Sensitive action request not found', 'sensitive_action_not_found')
  }
  const session = await requireExecutiveSession(context, request, true)
  const { data: actionRequest, error } = await admin
    .from('executive_sensitive_action_requests')
    .select('*')
    .eq('id', requestId)
    .eq('company_id', context.companyId)
    .maybeSingle()
  if (error || !actionRequest) {
    throw new HttpError(404, 'Sensitive action request not found', 'sensitive_action_not_found')
  }
  if (actionRequest.status !== 'pending_approval') {
    throw new HttpError(409, 'This request is no longer awaiting approval', 'sensitive_action_closed')
  }

  const actionType = String(actionRequest.action_type)
  if (!isSensitiveActionType(actionType)) {
    throw new HttpError(409, 'This request has an invalid action type', 'invalid_sensitive_action')
  }
  if (expectedActionType && actionType !== expectedActionType) {
    throw new HttpError(404, 'Sensitive action request not found', 'sensitive_action_not_found')
  }
  const rule = SENSITIVE_ACTION_RULES[actionType]
  assertAuthorised({
    context,
    action: rule.approveAction,
    proposerUserId: String(actionRequest.proposer_user_id),
  })

  const decision = String(input.decision ?? '').trim()
  if (!['approved', 'rejected'].includes(decision)) {
    throw new HttpError(400, 'Decision must be approved or rejected', 'invalid_sensitive_action_decision')
  }
  const reason = reasonText(input.reason, 5)
  const correlationId = safeCorrelationId(request.headers.get('x-veyvio-request-id'))

  const { error: approvalError } = await admin
    .from('executive_sensitive_action_approvals')
    .insert({
      company_id: context.companyId,
      request_id: requestId,
      approver_user_id: context.user.id,
      approver_membership_id: context.membershipId,
      approver_roles: context.roleKeys,
      approver_session_id: session.id,
      decision,
      reason,
      request_correlation_id: correlationId,
    })
  if (approvalError) {
    const conflict = ['23505', '23514', 'P0001'].includes(String(approvalError.code))
    throw new HttpError(
      conflict ? 409 : 500,
      approvalError.code === '23505'
        ? 'This reviewer has already decided this request'
        : conflict
          ? 'The request could not be decided because its approval conditions changed'
          : 'The approval evidence could not be recorded',
      approvalError.code === '23505'
        ? 'sensitive_action_already_decided'
        : conflict
          ? 'sensitive_action_conflict'
          : 'sensitive_action_failed',
    )
  }

  const nextStatus = decision === 'approved' ? 'approved' : 'rejected'
  const { data: updated, error: readError } = await admin
    .from('executive_sensitive_action_requests')
    .select('id, action_type, status, approved_at, rejected_at, executed_at')
    .eq('id', requestId)
    .eq('company_id', context.companyId)
    .maybeSingle()
  if (readError || !updated || updated.status !== nextStatus) {
    throw new Error('The committed sensitive-action decision could not be read back')
  }

  await insertNotifications([
    {
      company_id: context.companyId,
      recipient_user_id: actionRequest.proposer_user_id,
      notification_type: `executive.sensitive_action.${nextStatus}`,
      title: `${rule.label} ${nextStatus}`,
      body: reason,
      severity: decision === 'approved' ? 'info' : 'attention',
      source_entity_type: 'executive_sensitive_action_request',
      source_entity_id: requestId,
      action_url: '/?view=decisions',
      status: 'unread',
    },
  ])

  if (decision === 'approved') {
    await recordSecurityEvent({
      companyId: context.companyId,
      actorUserId: context.user.id,
      eventType: 'executive.sensitive_action_approved',
      message: `${rule.label} approved`,
      severity: 'attention',
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
      metadata: {
        requestId,
        actionType,
        correlationId,
      },
    })
    if (
      actionType === 'executive_administrator_change' ||
      actionType === 'director_or_officer_change'
    ) {
      await recordSecurityEvent({
        companyId: context.companyId,
        actorUserId: context.user.id,
        eventType: 'access.role_changed',
        message: `${rule.label} approved — role change pending execution`,
        severity: 'attention',
        metadata: { requestId, actionType, via: 'sensitive_action' },
      })
    }
    if (actionType === 'support_access_change') {
      await recordSecurityEvent({
        companyId: context.companyId,
        actorUserId: context.user.id,
        eventType: 'access.application_grant_changed',
        message: 'Support access change approved',
        severity: 'attention',
        metadata: { requestId, actionType, via: 'sensitive_action' },
      })
    }
  }

  return {
    request: updated,
    executionState: updated.executed_at ? 'executed' : 'not_executed',
  }
}

export async function createAnnualBudgetProposal(
  context: RequestContext,
  request: Request,
  input: Record<string, unknown>,
) {
  const session = await requireExecutiveSession(context, request, true)
  assertAuthorised({ context, action: 'executive.budget.propose' })

  let proposal
  try {
    proposal = validateAnnualBudgetProposal(input)
  } catch (error) {
    if (error instanceof AnnualBudgetValidationError) {
      throw new HttpError(400, error.message, error.code)
    }
    throw error
  }

  const reason = reasonText(input.reason)
  const evidence = evidenceReferences(input.evidenceReferences)
  const correlationId = safeCorrelationId(request.headers.get('x-veyvio-request-id'))
  const reviewers = await independentReviewerUserIds({
    companyId: context.companyId,
    proposerUserId: context.user.id,
    approveAction: 'executive.budget.approve',
  })
  if (!reviewers.length) {
    throw new HttpError(
      409,
      'An independent Director or Board Member must be assigned before the annual budget can be proposed',
      'independent_reviewer_required',
    )
  }

  const { data, error } = await admin.rpc(
    'create_executive_annual_budget_proposal',
    {
      p_company_id: context.companyId,
      p_financial_year: proposal.financialYear,
      p_title: proposal.title,
      p_budget_code: proposal.budgetCode,
      p_finance_budget_reference: proposal.financeBudgetReference,
      p_currency: proposal.currency,
      p_total_income_minor: proposal.totalIncomeMinor,
      p_contingency_minor: proposal.contingencyMinor,
      p_line_items: proposal.lineItems,
      p_reason: reason,
      p_evidence_references: evidence,
      p_proposer_user_id: context.user.id,
      p_proposer_membership_id: context.membershipId,
      p_proposer_session_id: session.id,
      p_request_correlation_id: correlationId,
    },
  )
  if (error || !data) {
    const conflict = ['23505', '23514', 'P0001'].includes(String(error?.code))
    throw new HttpError(
      conflict ? 409 : 500,
      conflict
        ? 'The annual budget proposal could not be recorded because its approval conditions changed'
        : 'The annual budget proposal could not be recorded',
      conflict ? 'annual_budget_conflict' : 'annual_budget_failed',
    )
  }

  const result = data as Record<string, unknown>
  await insertNotifications(
    reviewers.map((userId) => ({
      company_id: context.companyId,
      recipient_user_id: userId,
      notification_type: 'executive.annual_budget.review_required',
      title: `${proposal.title} requires independent approval`,
      body: reason,
      severity: 'attention',
      source_entity_type: 'executive_sensitive_action_request',
      source_entity_id: result.requestId,
      action_url: '/?view=budget',
      status: 'unread',
    })),
  )

  return {
    proposal: result,
    reviewerCount: reviewers.length,
    executionState: 'not_executed',
  }
}

export async function listSensitiveActionRequests(
  context: RequestContext,
  request: Request,
) {
  await requireExecutiveSession(context, request, false)
  assertAuthorised({ context, action: 'executive.audit.read' })
  const { data: requests, error } = await admin
    .from('executive_sensitive_action_requests')
    .select('id, action_type, target_type, target_id, status, reason, evidence_references, before_snapshot, proposed_snapshot, proposer_user_id, proposer_roles, required_independent_approvals, approved_at, rejected_at, executed_at, created_at, updated_at')
    .eq('company_id', context.companyId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)

  const requestIds = (requests ?? []).map((row) => String(row.id))
  const { data: approvals } = requestIds.length
    ? await admin
      .from('executive_sensitive_action_approvals')
      .select('id, request_id, approver_user_id, approver_roles, decision, reason, created_at')
      .eq('company_id', context.companyId)
      .in('request_id', requestIds)
      .order('created_at', { ascending: true })
    : { data: [] as Array<Record<string, unknown>> }

  const approvalsByRequest = new Map<string, Array<Record<string, unknown>>>()
  for (const approval of approvals ?? []) {
    const key = String(approval.request_id)
    approvalsByRequest.set(key, [
      ...(approvalsByRequest.get(key) ?? []),
      approval as Record<string, unknown>,
    ])
  }

  return {
    requests: (requests ?? []).map((row) => ({
      ...row,
      approvals: approvalsByRequest.get(String(row.id)) ?? [],
    })),
  }
}
