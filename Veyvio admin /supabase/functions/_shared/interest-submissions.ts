/**
 * Register Interest intake + Command Incoming Interests staff routes.
 *
 * Wave 3F UserScopedDb/RLS cutover 37: membership JWT reads/writes
 * `interest_submissions` through RLS (SELECT/INSERT/UPDATE). Website intake
 * (integration API key, no membership JWT) and support-grant stay on
 * company-scoped service-role. Conversion side effects (customers, passengers,
 * bookings, trips, users, memberships, audit, integration keys, reference RPC)
 * stay service-role.
 */
import { companyScopedServiceDb, companyScopedServiceDbForCompany, resolveTenantDb, userScopedDb } from './db-authority.ts'
import { type RequestContext } from './supabase.ts'
import { apiError, HttpError, json, readJson, toCamelCase } from './http.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { recordSecurityEvent } from './tenant-auth.ts'
import { notifyCompanyAdmins } from './notifications.ts'
import { sendResendEmail } from './resend.ts'
import {
  authenticateIntegrationKey,
  type IntegrationKeyContext,
} from './integration-keys.ts'
import {
  INTEREST_CREATE_SCOPE,
  INTEREST_STATUS_LABELS,
  isInterestStatus,
  makeRequestId,
  planInterestJourney,
  plannedPickupIso,
  splitInterestContactName,
  summariseInterestStatuses,
  validateInterestSubmission,
  type InterestStatus,
  type InterestSubmissionInput,
} from './interest-submissions.mapping.ts'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 30
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000
const COLOOP_WEBSITE_SOURCE = 'coloop-website'
const DEFAULT_COLOOP_NOTIFY_EMAIL = 'hello@coloop.org.uk'
const DEFAULT_COMMAND_APP_URL = 'https://veyvio-admin.pages.dev'

function interestsDb(context: RequestContext) {
  if (context.workspaceAuthority === 'support') {
    return companyScopedServiceDb(context, 'interest_submissions_support_grant')
  }
  return userScopedDb(context, 'interest_submissions')
}

function interestsIntakeDb(companyId: string) {
  return companyScopedServiceDbForCompany(companyId, 'interest_submissions_intake')
}

function interestsSideEffectsDb(context: RequestContext) {
  return companyScopedServiceDb(context, 'interest_submissions_side_effects')
}

function interestsSideEffectsForCompany(companyId: string) {
  return resolveTenantDb(companyId, 'interest_submissions_side_effects')
}

type StaffNote = {
  id: string
  body: string
  createdAt: string
  createdBy: string
  createdByName: string
}

function clientMeta(request: Request) {
  return {
    ipAddress:
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      null,
    userAgent: request.headers.get('user-agent'),
  }
}

function displayName(user: { first_name?: string | null; last_name?: string | null; email?: string | null }) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return name || user.email || 'Staff'
}

async function assertIntakeRateLimit(key: IntegrationKeyContext, request: Request) {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count, error } = await interestsIntakeDb(key.companyId)
    .from('interest_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', key.companyId)
    .eq('integration_api_key_id', key.keyId)
    .gte('created_at', since)

  if (error) throw new HttpError(500, error.message)
  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    const meta = clientMeta(request)
    await recordSecurityEvent({
      companyId: key.companyId,
      eventType: 'integration.rate_limited',
      severity: 'attention',
      message: 'Interest intake rate limit exceeded',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { keyId: key.keyId, windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX },
      evaluateAlerts: false,
    }).catch(() => undefined)
    throw new HttpError(429, 'Too many interest submissions. Try again shortly.', 'rate_limited')
  }
}

async function findRecentDuplicate(companyId: string, email: string | null, source: string) {
  if (!email) return null
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString()
  const { data } = await interestsIntakeDb(companyId)
    .from('interest_submissions')
    .select('id, reference, status, created_at')
    .eq('company_id', companyId)
    .eq('source', source)
    .ilike('contact_email', email)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

function acceptedResponse(row: {
  id: string
  reference: string
  status: string
  request_id: string
}, status = 201) {
  return json(
    {
      accepted: true,
      interestId: row.id,
      reference: row.reference,
      status: row.status,
      requestId: row.request_id,
    },
    status,
  )
}

async function sendCoLoopInterestNotification(row: {
  id: string
  reference: string
  request_id: string
  source: string
}) {
  if (row.source !== COLOOP_WEBSITE_SOURCE) return

  const to =
    Deno.env.get('COLOOP_INTEREST_NOTIFY_EMAIL')?.trim() ||
    DEFAULT_COLOOP_NOTIFY_EMAIL
  if (!to) return

  const commandOrigin = (
    Deno.env.get('VEYVIO_ADMIN_APP_URL')?.trim() || DEFAULT_COMMAND_APP_URL
  ).replace(/\/+$/, '')
  const interestUrl = `${commandOrigin}/interests/${encodeURIComponent(String(row.id))}`

  await sendResendEmail({
    to,
    subject: `New CoLoop transport-need registration — ${row.reference}`,
    text: [
      'A new transport need has been registered through the CoLoop Community Transport website.',
      '',
      `Reference: ${row.reference}`,
      `Request ID: ${row.request_id}`,
      '',
      `Open this registration securely in Veyvio Command: ${interestUrl}`,
      '',
      'Applicant contact, mobility and journey details are intentionally not included in this email.',
    ].join('\n'),
  })
}

export async function createInterestSubmission(request: Request): Promise<Response> {
  const meta = clientMeta(request)
  let key: IntegrationKeyContext
  try {
    key = await authenticateIntegrationKey(request, INTEREST_CREATE_SCOPE)
  } catch (error) {
    if (error instanceof HttpError) return apiError(error.status, error.message, error.code)
    throw error
  }

  let input: InterestSubmissionInput
  try {
    input = await readJson<InterestSubmissionInput>(request)
  } catch {
    await recordSecurityEvent({
      companyId: key.companyId,
      eventType: 'integration.malformed_request',
      severity: 'info',
      message: 'Interest intake received invalid JSON',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { keyId: key.keyId },
      evaluateAlerts: false,
    }).catch(() => undefined)
    return apiError(400, 'Request body must be valid JSON', 'invalid_json')
  }

  const validated = validateInterestSubmission(input)
  if (!validated.ok) {
    await recordSecurityEvent({
      companyId: key.companyId,
      eventType: 'integration.malformed_request',
      severity: 'info',
      message: `Interest intake validation failed: ${validated.message}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { keyId: key.keyId, code: validated.code },
      evaluateAlerts: false,
    }).catch(() => undefined)
    return apiError(400, validated.message, validated.code)
  }

  try {
    await assertIntakeRateLimit(key, request)
  } catch (error) {
    if (error instanceof HttpError) return apiError(error.status, error.message, error.code)
    throw error
  }

  const idempotencyKey =
    request.headers.get('idempotency-key')?.trim().slice(0, 120) ||
    request.headers.get('x-idempotency-key')?.trim().slice(0, 120) ||
    null

  if (idempotencyKey) {
    const { data: existing } = await interestsIntakeDb(key.companyId)
      .from('interest_submissions')
      .select('id, reference, status, request_id')
      .eq('company_id', key.companyId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    if (existing) return acceptedResponse(existing, 200)
  }

  if (validated.value.externalSubmissionId) {
    const { data: existingExt } = await interestsIntakeDb(key.companyId)
      .from('interest_submissions')
      .select('id, reference, status, request_id')
      .eq('company_id', key.companyId)
      .eq('source', validated.value.source)
      .eq('external_submission_id', validated.value.externalSubmissionId)
      .maybeSingle()
    if (existingExt) return acceptedResponse(existingExt, 200)
  }

  const duplicate = await findRecentDuplicate(
    key.companyId,
    validated.value.contactEmail,
    validated.value.source,
  )

  const { data: reference, error: refError } = await interestsSideEffectsForCompany(key.companyId).rpc('next_interest_reference', {
    p_company_id: key.companyId,
  })
  if (refError || !reference) {
    return apiError(500, refError?.message ?? 'Could not allocate interest reference')
  }

  const requestId = makeRequestId()
  const now = new Date().toISOString()
  const parsed = validated.value

  const insertRow = {
    company_id: key.companyId,
    reference: String(reference),
    status: 'new',
    source: parsed.source,
    source_label: parsed.sourceLabel,
    external_submission_id: parsed.externalSubmissionId,
    idempotency_key: idempotencyKey,
    integration_api_key_id: key.keyId,
    request_id: requestId,
    contact_name: parsed.contactName,
    contact_email: parsed.contactEmail,
    contact_phone: parsed.contactPhone,
    preferred_contact_method: parsed.preferredContactMethod,
    postcode: parsed.postcode,
    borough: parsed.borough,
    service: parsed.service,
    journey_types: parsed.journeyTypes,
    wheelchair_accessible_vehicle_required: parsed.wheelchairAccessibleVehicleRequired,
    passenger_count: parsed.passengerCount,
    message: parsed.message,
    privacy_accepted: parsed.privacyAccepted,
    marketing_accepted: parsed.marketingAccepted,
    privacy_notice_version: parsed.privacyNoticeVersion,
    consent_accepted_at: parsed.consentAcceptedAt,
    possible_duplicate: Boolean(duplicate),
    duplicate_of_id: duplicate ? String(duplicate.id) : null,
    raw_payload: input,
    last_activity_at: now,
  }

  const { data: row, error } = await interestsIntakeDb(key.companyId)
    .from('interest_submissions')
    .insert(insertRow)
    .select('id, reference, status, request_id, source, source_label, contact_name')
    .single()

  if (error || !row) {
    // Race on unique idempotency / external id — return the winner.
    if (idempotencyKey && String(error?.code) === '23505') {
      const { data: raced } = await interestsIntakeDb(key.companyId)
        .from('interest_submissions')
        .select('id, reference, status, request_id')
        .eq('company_id', key.companyId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (raced) return acceptedResponse(raced, 200)
    }
    return apiError(500, error?.message ?? 'Interest submission could not be saved')
  }

  await writeImmutableAudit({
    companyId: key.companyId,
    actorType: 'integration',
    actorUserId: null,
    action: 'interest.received',
    entityType: 'interest_submission',
    entityId: String(row.id),
    sourceApp: 'INTEGRATION',
    correlationId: requestId,
    afterSnapshot: {
      reference: row.reference,
      source: row.source,
      sourceLabel: row.source_label,
      integrationKeyId: key.keyId,
      integrationKeyName: key.name,
      possibleDuplicate: Boolean(duplicate),
      duplicateOfId: duplicate ? String(duplicate.id) : null,
    },
  }).catch(() => undefined)

  const name = String(row.contact_name)
  const sourceLabel = String(row.source_label ?? row.source)
  await notifyCompanyAdmins({
    companyId: key.companyId,
    type: 'interest.received',
    title: 'New register-interest submission',
    body: `${name} registered interest via ${sourceLabel}. Reference ${row.reference}.`,
    severity: 'attention',
    actionUrl: `/interests/${row.id}`,
    sourceEntityType: 'interest_submission',
    sourceEntityId: String(row.id),
  }).catch(() => undefined)

  await sendCoLoopInterestNotification(row).catch((mailError) => {
    console.error('CoLoop interest notification email failed', {
      reference: row.reference,
      error: mailError instanceof Error ? mailError.message : String(mailError),
    })
  })

  return acceptedResponse(row, 201)
}

function listFilters(url: URL) {
  return {
    status: url.searchParams.get('status'),
    source: url.searchParams.get('source'),
    assignedTo: url.searchParams.get('assignedTo'),
    service: url.searchParams.get('service'),
    borough: url.searchParams.get('borough'),
    postcode: url.searchParams.get('postcode'),
    accessibility: url.searchParams.get('accessibility'),
    marketing: url.searchParams.get('marketing'),
    from: url.searchParams.get('from'),
    to: url.searchParams.get('to'),
    q: url.searchParams.get('q'),
  }
}

export async function listInterestSubmissions(context: RequestContext, request: Request) {
  const url = new URL(request.url)
  const filters = listFilters(url)

  let query = interestsDb(context)
    .from('interest_submissions')
    .select(
      'id, reference, status, source, source_label, contact_name, contact_email, contact_phone, postcode, borough, service, journey_types, wheelchair_accessible_vehicle_required, passenger_count, marketing_accepted, assigned_to_user_id, assigned_to_name, possible_duplicate, last_activity_at, created_at, updated_at',
    )
    .eq('company_id', context.companyId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.source) query = query.eq('source', filters.source)
  if (filters.assignedTo) query = query.eq('assigned_to_user_id', filters.assignedTo)
  if (filters.service) query = query.eq('service', filters.service)
  if (filters.borough) query = query.ilike('borough', filters.borough)
  if (filters.postcode) query = query.ilike('postcode', `%${filters.postcode}%`)
  if (filters.accessibility === 'true') query = query.eq('wheelchair_accessible_vehicle_required', true)
  if (filters.accessibility === 'false') query = query.eq('wheelchair_accessible_vehicle_required', false)
  if (filters.marketing === 'true') query = query.eq('marketing_accepted', true)
  if (filters.marketing === 'false') query = query.eq('marketing_accepted', false)
  if (filters.from) query = query.gte('created_at', filters.from)
  if (filters.to) query = query.lte('created_at', filters.to)
  if (filters.q) {
    const q = `%${filters.q}%`
    query = query.or(
      `contact_name.ilike.${q},contact_email.ilike.${q},reference.ilike.${q},postcode.ilike.${q}`,
    )
  }

  const { data, error } = await query
  if (error) return apiError(500, error.message)

  const items = (data ?? []).map((row) => toCamelCase(row))
  const summary = summariseInterestStatuses(
    (data ?? []).map((row) => ({
      status: String(row.status),
      createdAt: String(row.created_at),
    })),
  )

  return json({ summary, items })
}

export async function getInterestSubmission(context: RequestContext, interestId: string) {
  const { data, error } = await interestsDb(context)
    .from('interest_submissions')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('id', interestId)
    .maybeSingle()

  if (error) return apiError(500, error.message)
  if (!data) return apiError(404, 'Interest submission not found', 'not_found')

  const { data: audit } = await interestsSideEffectsDb(context)
    .from('audit_events')
    .select('id, action, actor_type, actor_id, occurred_at, reason, after_snapshot, before_snapshot, correlation_id')
    .eq('company_id', context.companyId)
    .eq('entity_type', 'interest_submission')
    .eq('entity_id', interestId)
    .order('occurred_at', { ascending: true })
    .limit(200)

  // Record view once staff open the detail (best-effort).
  await writeImmutableAudit({
    companyId: context.companyId,
    actorUserId: context.user.id,
    action: 'interest.viewed',
    entityType: 'interest_submission',
    entityId: interestId,
    afterSnapshot: { reference: data.reference },
  }).catch(() => undefined)

  let integrationName: string | null = null
  if (data.integration_api_key_id) {
    const { data: key } = await interestsSideEffectsDb(context)
      .from('integration_api_keys')
      .select('name, key_prefix')
      .eq('company_id', context.companyId)
      .eq('id', data.integration_api_key_id)
      .maybeSingle()
    if (key) integrationName = `${key.name} (${key.key_prefix}…)`
  }

  return json({
    ...toCamelCase(data),
    integrationLabel: integrationName,
    activity: (audit ?? []).map((row) => toCamelCase(row)),
  })
}

export async function patchInterestSubmission(
  context: RequestContext,
  request: Request,
  interestId: string,
) {
  const input = await readJson<{
    status?: string
    assignedToUserId?: string | null
    note?: string
    closedReason?: string
  }>(request)

  const { data: existing, error: loadError } = await interestsDb(context)
    .from('interest_submissions')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('id', interestId)
    .maybeSingle()

  if (loadError) return apiError(500, loadError.message)
  if (!existing) return apiError(404, 'Interest submission not found', 'not_found')

  const { data: actor } = await interestsSideEffectsDb(context)
    .from('users')
    .select('id, first_name, last_name, email')
    .eq('id', context.user.id)
    .maybeSingle()

  const actorName = actor ? displayName(actor) : context.user.email ?? 'Staff'
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    updated_at: now,
    last_activity_at: now,
  }
  const audits: Array<{ action: string; before?: Record<string, unknown>; after?: Record<string, unknown>; reason?: string }> =
    []

  if (input.status != null) {
    if (!isInterestStatus(input.status)) {
      return apiError(400, 'Invalid status', 'invalid_status')
    }
    if (input.status !== existing.status) {
      patch.status = input.status
      if (input.status === 'closed' || input.status === 'spam' || input.status === 'converted') {
        patch.closed_at = now
        patch.closed_reason = input.closedReason?.trim() || null
      }
      audits.push({
        action: 'interest.status_changed',
        before: { status: existing.status },
        after: {
          status: input.status,
          label: INTEREST_STATUS_LABELS[input.status as InterestStatus],
        },
        reason: input.closedReason?.trim() || undefined,
      })
      if (input.status === 'converted') {
        audits.push({ action: 'interest.converted', after: { reference: existing.reference } })
      }
      if (input.status === 'contact_attempted') {
        audits.push({ action: 'interest.contact_attempted', after: { reference: existing.reference } })
      }
    }
  }

  if (input.assignedToUserId !== undefined) {
    if (input.assignedToUserId === null || input.assignedToUserId === '') {
      patch.assigned_to_user_id = null
      patch.assigned_to_name = null
      if (existing.status === 'new' || existing.status === 'under_review') {
        // leave status unless explicitly set
      }
      audits.push({
        action: 'interest.assigned',
        before: { assignedToUserId: existing.assigned_to_user_id },
        after: { assignedToUserId: null },
      })
    } else {
      const { data: assignee } = await interestsSideEffectsDb(context)
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', input.assignedToUserId)
        .maybeSingle()
      if (!assignee) return apiError(400, 'Assigned user not found', 'invalid_assignee')

      const { data: membership } = await interestsSideEffectsDb(context)
        .from('company_memberships')
        .select('user_id')
        .eq('company_id', context.companyId)
        .eq('user_id', input.assignedToUserId)
        .in('status', ['active', 'invited'])
        .maybeSingle()
      if (!membership) return apiError(400, 'Assigned user is not in this company', 'invalid_assignee')

      const assigneeName = displayName(assignee)
      patch.assigned_to_user_id = assignee.id
      patch.assigned_to_name = assigneeName
      if (!input.status && (existing.status === 'new' || existing.status === 'under_review')) {
        patch.status = 'assigned'
        audits.push({
          action: 'interest.status_changed',
          before: { status: existing.status },
          after: { status: 'assigned' },
        })
      }
      audits.push({
        action: 'interest.assigned',
        before: { assignedToUserId: existing.assigned_to_user_id, assignedToName: existing.assigned_to_name },
        after: { assignedToUserId: assignee.id, assignedToName: assigneeName },
      })
    }
  }

  if (input.note != null) {
    const body = String(input.note).trim().slice(0, 4000)
    if (!body) return apiError(400, 'note cannot be empty', 'invalid_note')
    const notes = Array.isArray(existing.staff_notes) ? [...existing.staff_notes] : []
    const note: StaffNote = {
      id: crypto.randomUUID(),
      body,
      createdAt: now,
      createdBy: context.user.id,
      createdByName: actorName,
    }
    notes.push(note)
    patch.staff_notes = notes
    audits.push({ action: 'interest.note_added', after: { noteId: note.id, body } })
  }

  if (Object.keys(patch).length <= 2 && audits.length === 0) {
    return apiError(400, 'No changes provided', 'invalid_input')
  }

  const { data: updated, error } = await interestsDb(context)
    .from('interest_submissions')
    .update(patch)
    .eq('company_id', context.companyId)
    .eq('id', interestId)
    .select('*')
    .single()

  if (error || !updated) return apiError(500, error?.message ?? 'Update failed')

  for (const entry of audits) {
    await writeImmutableAudit({
      companyId: context.companyId,
      actorUserId: context.user.id,
      action: entry.action,
      entityType: 'interest_submission',
      entityId: interestId,
      reason: entry.reason ?? null,
      beforeSnapshot: entry.before ?? null,
      afterSnapshot: entry.after ?? null,
    }).catch(() => undefined)
  }

  return json(toCamelCase(updated))
}

function nextOperationalReference(prefix: 'BK' | 'TR', interestReference: string): string {
  const stamp = Date.now().toString(36).toUpperCase()
  const tail = interestReference.replace(/[^A-Z0-9]/gi, '').slice(-6) || 'INT'
  return `${prefix}-${tail}-${stamp}`
}

async function loadInterestOr404(context: RequestContext, interestId: string) {
  const { data, error } = await interestsDb(context)
    .from('interest_submissions')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('id', interestId)
    .maybeSingle()
  if (error) throw new HttpError(500, error.message)
  if (!data) throw new HttpError(404, 'Interest submission not found', 'not_found')
  return data
}

/**
 * Accept a journey request: create passenger + booking + trip so it appears on Jobs.
 */
export async function acceptInterestSubmission(
  context: RequestContext,
  interestId: string,
): Promise<Response> {
  let existing
  try {
    existing = await loadInterestOr404(context, interestId)
  } catch (error) {
    if (error instanceof HttpError) return apiError(error.status, error.message, error.code)
    throw error
  }

  if (existing.status === 'converted' && existing.converted_trip_id) {
    return json({
      accepted: true,
      alreadyConverted: true,
      interestId: existing.id,
      reference: existing.reference,
      bookingId: existing.converted_booking_id,
      tripId: existing.converted_trip_id,
      serviceDate: null,
      jobsPath: `/jobs?serviceDate=`,
    })
  }
  if (existing.status === 'closed' || existing.status === 'spam') {
    return apiError(409, 'This request was already closed and cannot be accepted.', 'already_closed')
  }

  const plan = planInterestJourney(existing)
  if (!plan) {
    return apiError(
      400,
      'This interest is not a journey request with pickup and destination details.',
      'not_journey_request',
    )
  }

  const { firstName, lastName } = splitInterestContactName(String(existing.contact_name))
  const now = new Date().toISOString()
  const actorId = context.user.id

  const { data: customer, error: customerError } = await interestsSideEffectsDb(context)
    .from('customers')
    .insert({
      company_id: context.companyId,
      customer_type: 'individual',
      legal_name: String(existing.contact_name),
      trading_name: String(existing.contact_name),
      billing_address: {
        line1: plan.pickup,
        postcode: plan.pickupPostcode,
        email: existing.contact_email,
        phone: existing.contact_phone,
      },
      status: 'active',
      purchase_order_required: false,
      external_reference: `interest:${existing.reference}`,
      created_by: actorId,
      updated_by: actorId,
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (customerError || !customer) {
    return apiError(500, customerError?.message ?? 'Could not create customer for this journey')
  }

  const { data: passenger, error: passengerError } = await interestsSideEffectsDb(context)
    .from('passengers')
    .insert({
      company_id: context.companyId,
      customer_id: customer.id,
      first_name: firstName,
      last_name: lastName,
      preferred_name: firstName,
      status: 'active',
      external_reference: `interest:${existing.reference}`,
      created_by: actorId,
      updated_by: actorId,
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (passengerError || !passenger) {
    return apiError(500, passengerError?.message ?? 'Could not create passenger for this journey')
  }

  const bookingReference = nextOperationalReference('BK', String(existing.reference))
  const bookingType = /return/i.test(plan.journeyType ?? '') ? 'return' : 'single'
  const { data: booking, error: bookingError } = await interestsSideEffectsDb(context)
    .from('bookings')
    .insert({
      company_id: context.companyId,
      customer_id: customer.id,
      booking_reference: bookingReference,
      booking_type: bookingType,
      priority: 'normal',
      passenger_ids: [passenger.id],
      requested_date: plan.travelDate,
      status: 'confirmed',
      source: 'interest',
      external_reference: String(existing.reference),
      notes: [
        `Accepted from Incoming Interest ${existing.reference}.`,
        plan.service ? `Service: ${plan.service}.` : null,
        plan.notes,
      ]
        .filter(Boolean)
        .join('\n')
        .slice(0, 4000),
      created_by: actorId,
      updated_by: actorId,
      source_app: 'COMMAND',
    })
    .select('id, booking_reference')
    .single()
  if (bookingError || !booking) {
    return apiError(500, bookingError?.message ?? 'Could not create booking for this journey')
  }

  const tripReference = nextOperationalReference('TR', String(existing.reference))
  const plannedPickupAt = plannedPickupIso(plan.travelDate, plan.preferredPickupTime)
  const plannedArrivalAt = plan.returnTime
    ? plannedPickupIso(plan.travelDate, plan.returnTime)
    : null

  const { data: trip, error: tripError } = await interestsSideEffectsDb(context)
    .from('trips')
    .insert({
      company_id: context.companyId,
      booking_id: booking.id,
      trip_reference: tripReference,
      service_date: plan.travelDate,
      planned_pickup_at: plannedPickupAt,
      planned_arrival_at: plannedArrivalAt,
      pickup_location: {
        name: plan.pickup,
        address: plan.pickup,
        postcode: plan.pickupPostcode,
      },
      destination_location: {
        name: plan.destination,
        address: plan.destination,
      },
      passenger_ids: [passenger.id],
      status: 'planned',
      priority: 'normal',
      created_by: actorId,
      updated_by: actorId,
      source_app: 'COMMAND',
    })
    .select('id, trip_reference, service_date')
    .single()
  if (tripError || !trip) {
    return apiError(500, tripError?.message ?? 'Could not create trip/job for this journey')
  }

  const { data: updated, error: updateError } = await interestsDb(context)
    .from('interest_submissions')
    .update({
      status: 'converted',
      converted_booking_id: booking.id,
      converted_trip_id: trip.id,
      closed_at: now,
      closed_reason: `Accepted as job ${trip.trip_reference}`,
      assigned_to_user_id: existing.assigned_to_user_id ?? actorId,
      last_activity_at: now,
      updated_at: now,
    })
    .eq('company_id', context.companyId)
    .eq('id', interestId)
    .select('*')
    .single()
  if (updateError || !updated) {
    return apiError(500, updateError?.message ?? 'Journey was created but interest could not be marked converted')
  }

  await writeImmutableAudit({
    companyId: context.companyId,
    actorUserId: actorId,
    action: 'interest.accepted_as_job',
    entityType: 'interest_submission',
    entityId: interestId,
    afterSnapshot: {
      reference: existing.reference,
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
      tripId: trip.id,
      tripReference: trip.trip_reference,
      serviceDate: trip.service_date,
    },
  }).catch(() => undefined)

  const serviceDate = String(trip.service_date).slice(0, 10)
  return json({
    accepted: true,
    alreadyConverted: false,
    interest: toCamelCase(updated),
    interestId: updated.id,
    reference: updated.reference,
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
    tripId: trip.id,
    tripReference: trip.trip_reference,
    serviceDate,
    jobId: `${trip.id}-pax-1`,
    jobsPath: `/jobs?serviceDate=${encodeURIComponent(serviceDate)}`,
  })
}

/**
 * Reject a journey/interest request and email the customer when an address is available.
 */
export async function rejectInterestSubmission(
  context: RequestContext,
  request: Request,
  interestId: string,
): Promise<Response> {
  let existing
  try {
    existing = await loadInterestOr404(context, interestId)
  } catch (error) {
    if (error instanceof HttpError) return apiError(error.status, error.message, error.code)
    throw error
  }

  if (existing.status === 'converted') {
    return apiError(409, 'This request was already accepted as a job.', 'already_converted')
  }
  if (existing.status === 'closed' || existing.status === 'spam') {
    return apiError(409, 'This request was already rejected or closed.', 'already_closed')
  }

  const body = await readJson<{ reason?: string; notifyCustomer?: boolean }>(request).catch(() => ({}))
  const reason =
    typeof body.reason === 'string' && body.reason.trim()
      ? body.reason.trim().slice(0, 500)
      : 'We are unable to fulfil this journey request at this time.'
  const notifyCustomer = body.notifyCustomer !== false
  const now = new Date().toISOString()

  let notifiedAt: string | null = null
  let notifyError: string | null = null
  const customerEmail = existing.contact_email ? String(existing.contact_email).trim() : ''

  if (notifyCustomer && customerEmail) {
    try {
      await sendResendEmail({
        to: customerEmail,
        subject: `Update on your journey request (${existing.reference})`,
        text: [
          `Hello ${existing.contact_name},`,
          '',
          `Thank you for your journey request (${existing.reference}).`,
          '',
          reason,
          '',
          'If you still need transport, please reply to this email or submit another request.',
          '',
          'Veyvio Command',
        ].join('\n'),
      })
      notifiedAt = now
    } catch (error) {
      notifyError = error instanceof Error ? error.message : String(error)
    }
  } else if (notifyCustomer && !customerEmail) {
    notifyError = 'No customer email on this submission'
  }

  const { data: updated, error: updateError } = await interestsDb(context)
    .from('interest_submissions')
    .update({
      status: 'closed',
      closed_at: now,
      closed_reason: reason,
      rejection_notified_at: notifiedAt,
      last_activity_at: now,
      updated_at: now,
    })
    .eq('company_id', context.companyId)
    .eq('id', interestId)
    .select('*')
    .single()
  if (updateError || !updated) {
    return apiError(500, updateError?.message ?? 'Could not reject this interest')
  }

  await writeImmutableAudit({
    companyId: context.companyId,
    actorUserId: context.user.id,
    action: 'interest.rejected',
    entityType: 'interest_submission',
    entityId: interestId,
    reason,
    afterSnapshot: {
      reference: existing.reference,
      notified: Boolean(notifiedAt),
      notifyError,
    },
  }).catch(() => undefined)

  return json({
    rejected: true,
    interest: toCamelCase(updated),
    customerNotified: Boolean(notifiedAt),
    notifyError,
  })
}

