/**
 * Cost Control Finance API — JWT auth, workspace load, Open Banking sandbox proxy.
 * Hosted beside command-api on the shared Supabase project.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/http.ts'
import {
  applySimpleReviewDecision,
  parseSimpleReviewDecision,
} from '../_shared/finance-review-decision.ts'
import { importCostCsvForPersist } from '../_shared/finance-csv-import.ts'
import { importPayrollSummaryForPersist } from '../_shared/finance-payroll-summary-import.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'cost_control' },
})

async function cc<T extends { error: { message: string } | null }>(
  label: string,
  result: PromiseLike<T> | T,
): Promise<T> {
  const resolved = await result
  if (resolved.error) {
    throw new Error(`${label}: ${resolved.error.message}`)
  }
  return resolved
}

const publicAuth = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const FINANCE_ROLES = [
  'finance_director',
  'finance_admin',
  'finance_manager',
  'finance_officer',
  'cost_approver',
  'payroll_cost_reviewer',
  'auditor',
  'board_reader',
] as const

type FinanceRole = (typeof FINANCE_ROLES)[number]

type FinanceMembership = {
  organisationId: string
  userSubject: string
  role: FinanceRole
  active: boolean
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(request.url)
    // Paths may be /finance/workspace or /functions/v1/finance-api/finance/workspace
    let path = url.pathname
    for (const marker of ['/functions/v1/finance-api', '/finance-api']) {
      const idx = path.indexOf(marker)
      if (idx >= 0) {
        path = path.slice(idx + marker.length) || '/'
        break
      }
    }
    if (!path.startsWith('/')) path = `/${path}`

    if (path === '/finance/workspace' && request.method === 'GET') {
      return await handleWorkspace(request)
    }
    {
      const reviewMatch = /^\/finance\/reviews\/([^/]+)\/decision$/.exec(path)
      if (reviewMatch && request.method === 'POST') {
        return await handleReviewDecision(request, decodeURIComponent(reviewMatch[1]!))
      }
    }
    if (path === '/finance/imports/costs' && request.method === 'POST') {
      return await handleCostCsvImport(request)
    }
    if (path === '/finance/imports/payroll-summary' && request.method === 'POST') {
      return await handlePayrollSummaryImport(request)
    }
    if (path === '/bank/consent/start' && request.method === 'GET') {
      return await handleBankConsentStart(request, url)
    }
    if (path === '/bank/consent/complete' && request.method === 'POST') {
      return await handleBankConsentComplete(request)
    }
    if (path === '/bank/accounts' && request.method === 'GET') {
      return await handleBankAccounts(request, url)
    }
    if (path.startsWith('/bank/accounts/') && path.endsWith('/transactions') && request.method === 'GET') {
      const accountId = decodeURIComponent(path.split('/')[3] ?? '')
      return await handleBankTransactions(request, url, accountId)
    }
    if (path === '/bank/consent/revoke' && request.method === 'POST') {
      return await handleBankRevoke(request)
    }

    return json({ error: 'not_found' }, 404)
  } catch (error) {
    console.error('finance-api error', error)
    return json({ error: 'finance_api_unavailable' }, 500)
  }
})

async function verifyBearer(request: Request): Promise<{ userId: string } | Response> {
  const header = request.headers.get('Authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  const token = match?.[1]?.trim()
  if (!token) return json({ error: 'authentication_required' }, 401)
  const { data, error } = await publicAuth.auth.getUser(token)
  if (error || !data.user?.id) return json({ error: 'invalid_or_expired_token' }, 401)
  return { userId: data.user.id }
}

function financeRoleForCommandRoles(roleNames: string[]): FinanceRole | null {
  const normalized = roleNames.map((name) => name.trim().toLowerCase())
  for (const role of FINANCE_ROLES) {
    if (normalized.includes(role)) return role
  }
  if (
    normalized.some((role) =>
      ['company_owner', 'company_admin', 'company_administrator'].includes(role),
    )
  ) {
    return 'finance_admin'
  }
  return null
}

async function findFinanceMembership(
  userSubject: string,
  organisationId: string,
): Promise<FinanceMembership | null> {
  // Prefer mirrored Cost Control membership when present.
  const { data: mirrored } = await admin
    .from('organisation_memberships')
    .select('organisation_id, user_subject, role, active')
    .eq('organisation_id', organisationId)
    .eq('user_subject', userSubject)
    .eq('active', true)
    .maybeSingle()

  if (mirrored?.role && FINANCE_ROLES.includes(mirrored.role as FinanceRole)) {
    return {
      organisationId: String(mirrored.organisation_id),
      userSubject: String(mirrored.user_subject),
      role: mirrored.role as FinanceRole,
      active: Boolean(mirrored.active),
    }
  }

  // Fall back to Command FINANCE application access (same rules as auth/finance-memberships).
  const publicAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: membership } = await publicAdmin
    .from('company_memberships')
    .select('id, company_id, status, role_ids')
    .eq('company_id', organisationId)
    .eq('user_id', userSubject)
    .eq('status', 'active')
    .maybeSingle()
  if (!membership) return null

  const { data: access } = await publicAdmin
    .from('membership_application_access')
    .select('membership_id')
    .eq('membership_id', membership.id)
    .eq('app_type', 'FINANCE')
    .eq('status', 'active')
    .maybeSingle()
  if (!access) return null

  const roleIds = (membership.role_ids as string[] | null) ?? []
  let roleNames: string[] = []
  if (roleIds.length) {
    const { data: roles } = await publicAdmin.from('roles').select('id, name').in('id', roleIds)
    roleNames = (roles ?? []).map((r) => String(r.name))
  }
  const role = financeRoleForCommandRoles(roleNames)
  if (!role) return null
  return { organisationId, userSubject, role, active: true }
}

function roleAllowsWorkspaceRead(role: FinanceRole): boolean {
  return FINANCE_ROLES.includes(role)
}

async function ensureOrganisationShell(organisationId: string, tradingName?: string) {
  const publicAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: company } = await publicAdmin
    .from('companies')
    .select('id, trading_name, legal_name')
    .eq('id', organisationId)
    .maybeSingle()

  const name =
    tradingName ||
    company?.trading_name ||
    company?.legal_name ||
    'Company'
  const legal = company?.legal_name || name

  await cc('organisations.upsert', admin.from('organisations').upsert(
    {
      id: organisationId,
      name: legal,
      trading_name: name,
      currency: 'GBP',
      timezone: 'Europe/London',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  ))

  const year = new Date().getUTCFullYear()
  const financialYear = `${year}/${String(year + 1).slice(-2)}`
  const budgetId = `bud_${organisationId}_current`
  const { data: existing } = await admin
    .from('budgets')
    .select('id')
    .eq('organisation_id', organisationId)
    .eq('code', 'PENDING')
    .eq('version', 1)
    .maybeSingle()
  if (!existing) {
    await cc('budgets.insert', admin.from('budgets').insert({
      id: budgetId,
      organisation_id: organisationId,
      name: 'Company cost budget',
      code: 'PENDING',
      financial_year: financialYear,
      version: 1,
      currency: 'GBP',
      contingency_minor: 0,
      status: 'approved',
    }))
  }
}

async function handleWorkspace(request: Request): Promise<Response> {
  const auth = await verifyBearer(request)
  if (auth instanceof Response) return auth

  const organisationId = request.headers.get('X-Veyvio-Organisation-ID')?.trim()
  if (!organisationId) return json({ error: 'active_organisation_required' }, 400)

  const membership = await findFinanceMembership(auth.userId, organisationId)
  if (!membership?.active) return json({ error: 'organisation_access_denied' }, 403)
  if (!roleAllowsWorkspaceRead(membership.role)) {
    return json({ error: 'finance_permission_denied' }, 403)
  }

  await ensureOrganisationShell(organisationId)

  // Mirror membership for subsequent bank proxy / RLS-aware paths.
  await cc('organisation_memberships.upsert', admin.from('organisation_memberships').upsert(
    {
      id: `ccm_${organisationId}_${auth.userId}`,
      organisation_id: organisationId,
      user_subject: auth.userId,
      role: membership.role,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organisation_id,user_subject' },
  ))

  const workspace = await loadWorkspace(organisationId)
  if (workspace.organisation.id !== organisationId) {
    return json({ error: 'finance_workspace_unavailable' }, 500)
  }
  return json(workspace, 200)
}

function roleAllowsCostApprove(role: FinanceRole): boolean {
  return [
    'finance_director',
    'finance_admin',
    'finance_manager',
    'finance_officer',
    'cost_approver',
  ].includes(role)
}

async function handleReviewDecision(request: Request, reviewId: string): Promise<Response> {
  const auth = await verifyBearer(request)
  if (auth instanceof Response) return auth

  const organisationId = request.headers.get('X-Veyvio-Organisation-ID')?.trim()
  if (!organisationId) return json({ error: 'active_organisation_required' }, 400)

  const membership = await findFinanceMembership(auth.userId, organisationId)
  if (!membership?.active) return json({ error: 'organisation_access_denied' }, 403)
  if (!roleAllowsCostApprove(membership.role)) {
    return json({ error: 'finance_permission_denied' }, 403)
  }

  await ensureOrganisationShell(organisationId)
  await cc('organisation_memberships.upsert', admin.from('organisation_memberships').upsert(
    {
      id: `ccm_${organisationId}_${auth.userId}`,
      organisation_id: organisationId,
      user_subject: auth.userId,
      role: membership.role,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organisation_id,user_subject' },
  ))

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  let decision
  try {
    decision = parseSimpleReviewDecision(body.decision)
  } catch (error) {
    const code = error instanceof Error ? error.message : 'invalid_decision'
    return json({ error: code }, 400)
  }

  if (
    body.decision &&
    typeof body.decision === 'object' &&
    ('allocations' in (body.decision as object) || 'evidenceLabel' in (body.decision as object))
  ) {
    return json({ error: 'allocations_or_evidence_not_supported_yet' }, 400)
  }

  const { data: reviewRow, error: reviewError } = await admin
    .from('review_items')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('id', reviewId)
    .maybeSingle()
  if (reviewError) return json({ error: 'review_lookup_failed' }, 500)
  if (!reviewRow) return json({ error: 'review_not_found' }, 404)

  const { data: costRow, error: costError } = await admin
    .from('cost_records')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('id', String(reviewRow.cost_id))
    .maybeSingle()
  if (costError) return json({ error: 'cost_lookup_failed' }, 500)
  if (!costRow) return json({ error: 'cost_not_found' }, 404)

  const expectedVersion =
    body.expectedCostVersion != null ? Number(body.expectedCostVersion) : null
  if (expectedVersion != null && Number(costRow.version) !== expectedVersion) {
    return json({ error: 'cost_version_conflict', currentVersion: Number(costRow.version) }, 409)
  }

  let result
  try {
    result = applySimpleReviewDecision({
      organisationId,
      actorId: auth.userId,
      decision,
      review: {
        id: String(reviewRow.id),
        organisationId,
        costId: String(reviewRow.cost_id),
        signal: String(reviewRow.signal),
        title: String(reviewRow.title),
        detail: String(reviewRow.detail),
        state: String(reviewRow.state) as 'open' | 'approved' | 'rejected' | 'snoozed',
        resolutionNote: reviewRow.resolution_note != null ? String(reviewRow.resolution_note) : null,
        version: Number(reviewRow.version ?? 1),
        createdAt: String(reviewRow.created_at),
      },
      cost: {
        id: String(costRow.id),
        organisationId,
        version: Number(costRow.version ?? 1),
        reviewState: String(costRow.review_state ?? 'none') as
          | 'none'
          | 'open'
          | 'approved'
          | 'rejected'
          | 'snoozed',
        validationState: String(costRow.validation_state),
        correctionReason: costRow.correction_reason != null ? String(costRow.correction_reason) : null,
        updatedAt: String(costRow.updated_at),
      },
    })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'decision_failed'
    const status = code === 'review_not_open' ? 409 : 400
    return json({ error: code }, status)
  }

  await cc(
    'review_items.update',
    admin
      .from('review_items')
      .update({
        state: result.review.state,
        detail: result.review.detail,
        resolution_note: result.review.resolutionNote,
        version: Number(reviewRow.version ?? 1) + 1,
        updated_at: result.audit.createdAt,
      })
      .eq('organisation_id', organisationId)
      .eq('id', reviewId),
  )

  await cc(
    'cost_records.update',
    admin
      .from('cost_records')
      .update({
        review_state: result.cost.reviewState,
        validation_state: result.cost.validationState,
        correction_reason: result.cost.correctionReason,
        version: result.cost.version,
        updated_at: result.cost.updatedAt,
      })
      .eq('organisation_id', organisationId)
      .eq('id', result.cost.id)
      .eq('version', Number(costRow.version ?? 1)),
  )

  await cc(
    'audit_events.insert',
    admin.from('audit_events').insert({
      id: result.audit.id,
      organisation_id: organisationId,
      actor_id: result.audit.actorId,
      action: result.audit.action,
      entity_type: result.audit.entityType,
      entity_id: result.audit.entityId,
      reason: result.audit.reason,
      before_state: result.audit.beforeState,
      after_state: result.audit.afterState,
      created_at: result.audit.createdAt,
    }),
  )

  const workspace = await loadWorkspace(organisationId)
  const cost = workspace.costs.find((c: { id: string }) => c.id === result.cost.id)
  const review = {
    id: result.review.id,
    organisationId,
    costId: result.review.costId,
    signal: result.review.signal,
    title: result.review.title,
    detail: result.review.detail,
    state: result.review.state,
    createdAt: result.review.createdAt,
    resolutionNote: result.review.resolutionNote,
    resolvedAt: result.review.resolvedAt,
    resolvedBy: result.review.resolvedBy,
  }

  return json(
    {
      review,
      cost: cost ?? null,
      audit: {
        id: result.audit.id,
        organisationId: result.audit.organisationId,
        actorId: result.audit.actorId,
        action: result.audit.action,
        entityType: result.audit.entityType,
        entityId: result.audit.entityId,
        reason: result.audit.reason,
        beforeState: result.audit.beforeState,
        afterState: result.audit.afterState,
        createdAt: result.audit.createdAt,
      },
    },
    200,
  )
}

function roleAllowsCostImport(role: FinanceRole): boolean {
  return [
    'finance_director',
    'finance_admin',
    'finance_manager',
    'finance_officer',
  ].includes(role)
}

async function handleCostCsvImport(request: Request): Promise<Response> {
  const auth = await verifyBearer(request)
  if (auth instanceof Response) return auth

  const organisationId = request.headers.get('X-Veyvio-Organisation-ID')?.trim()
  if (!organisationId) return json({ error: 'active_organisation_required' }, 400)

  const membership = await findFinanceMembership(auth.userId, organisationId)
  if (!membership?.active) return json({ error: 'organisation_access_denied' }, 403)
  if (!roleAllowsCostImport(membership.role)) {
    return json({ error: 'finance_permission_denied' }, 403)
  }

  await ensureOrganisationShell(organisationId)
  await cc('organisation_memberships.upsert', admin.from('organisation_memberships').upsert(
    {
      id: `ccm_${organisationId}_${auth.userId}`,
      organisation_id: organisationId,
      user_subject: auth.userId,
      role: membership.role,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organisation_id,user_subject' },
  ))

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const fileName = String(body.fileName ?? '').trim() || 'costs.csv'
  const text = typeof body.text === 'string' ? body.text : ''
  if (!text.trim()) return json({ error: 'csv_text_required' }, 400)
  if (text.length > 2_000_000) return json({ error: 'csv_too_large' }, 413)

  const { data: budgetRow } = await admin
    .from('budgets')
    .select('id, version')
    .eq('organisation_id', organisationId)
    .eq('status', 'approved')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  const budgetId = budgetRow?.id ?? `bud_${organisationId}_current`

  const { data: existingCosts } = await admin
    .from('cost_records')
    .select('source_key')
    .eq('organisation_id', organisationId)
  const existingSourceKeys = new Set(
    (existingCosts ?? []).map((row) => String(row.source_key)),
  )

  const startedAt = new Date().toISOString()
  const parsed = importCostCsvForPersist({
    organisationId,
    text,
    budgetId,
    existingSourceKeys,
    nowIso: startedAt,
  })
  if (parsed.rowsRead > 5000) {
    return json({ error: 'csv_too_many_rows' }, 413)
  }

  const runId = crypto.randomUUID()
  const finishedAt = new Date().toISOString()

  if (parsed.accepted.length) {
    await cc(
      'cost_records.insert',
      admin.from('cost_records').insert(
        parsed.accepted.map((c) => ({
          id: c.id,
          organisation_id: organisationId,
          version: c.version,
          supplier_name: c.supplierName,
          description: c.description,
          reference: c.reference,
          transaction_date: c.transactionDate,
          accounting_period: c.accountingPeriod,
          net_minor: c.netMinor,
          vat_minor: c.vatMinor,
          gross_minor: c.grossMinor,
          currency: 'GBP',
          status: c.status,
          category: c.category,
          validation_state: c.validationState,
          review_state: c.reviewState,
          source_key: c.sourceKey,
          linked_commitment_id: null,
          correction_reason: null,
          created_at: c.createdAt,
          updated_at: c.updatedAt,
        })),
      ),
    )

    await cc(
      'cost_allocations.insert',
      admin.from('cost_allocations').insert(
        parsed.accepted.map((c) => ({
          id: crypto.randomUUID(),
          organisation_id: organisationId,
          cost_id: c.id,
          budget_id: budgetId,
          category: c.category,
          cost_centre_id: null,
          vehicle_id: c.vehicleId,
          supplier_id: null,
          amount_minor: c.grossMinor,
          created_at: c.createdAt,
        })),
      ),
    )

    const evidenceRows = parsed.accepted
      .filter((c) => c.evidenceLabel)
      .map((c) => ({
        id: crypto.randomUUID(),
        organisation_id: organisationId,
        cost_id: c.id,
        label: c.evidenceLabel!,
        source_type: 'csv',
        checksum: null,
        storage_key: null,
        created_at: c.createdAt,
      }))
    if (evidenceRows.length) {
      await cc('cost_evidence.insert', admin.from('cost_evidence').insert(evidenceRows))
    }

    const reviewRows = parsed.accepted
      .filter((c) => c.reviewState === 'open')
      .map((c) => ({
        id: crypto.randomUUID(),
        organisation_id: organisationId,
        cost_id: c.id,
        signal: c.evidenceLabel ? 'allocation_issue' : 'missing_evidence',
        title: c.evidenceLabel ? 'Imported cost needs review' : 'Imported cost missing evidence',
        detail: `${c.supplierName} · ${c.reference}`,
        state: 'open',
        resolution_note: null,
        version: 1,
        created_at: finishedAt,
        updated_at: finishedAt,
      }))
    if (reviewRows.length) {
      await cc('review_items.insert', admin.from('review_items').insert(reviewRows))
    }
  }

  if (parsed.quarantined.length) {
    await cc(
      'quarantine_items.insert',
      admin.from('quarantine_items').insert(
        parsed.quarantined.map((q) => ({
          id: q.id,
          organisation_id: organisationId,
          source_key: q.sourceKey,
          reason: q.reason,
          raw: q.raw,
          created_at: q.createdAt,
        })),
      ),
    )
  }

  await cc(
    'import_runs.insert',
    admin.from('import_runs').insert({
      id: runId,
      organisation_id: organisationId,
      file_name: fileName,
      started_at: startedAt,
      finished_at: finishedAt,
      rows_read: parsed.rowsRead,
      accepted: parsed.accepted.length,
      quarantined: parsed.quarantined.length,
      duplicates_skipped: parsed.duplicatesSkipped,
    }),
  )

  await cc(
    'audit_events.insert',
    admin.from('audit_events').insert({
      id: crypto.randomUUID(),
      organisation_id: organisationId,
      actor_id: auth.userId,
      action: 'cost.import_csv',
      entity_type: 'import_run',
      entity_id: runId,
      reason: fileName,
      before_state: { existingSourceKeys: existingSourceKeys.size },
      after_state: {
        accepted: parsed.accepted.length,
        quarantined: parsed.quarantined.length,
        duplicatesSkipped: parsed.duplicatesSkipped,
        rowsRead: parsed.rowsRead,
      },
      created_at: finishedAt,
    }),
  )

  const workspace = await loadWorkspace(organisationId)
  return json(
    {
      summary: {
        accepted: parsed.accepted.length,
        quarantined: parsed.quarantined.length,
        duplicatesSkipped: parsed.duplicatesSkipped,
        rowsRead: parsed.rowsRead,
        importRunId: runId,
        fileName,
      },
      workspace,
    },
    200,
  )
}

function roleAllowsPayrollImport(role: FinanceRole): boolean {
  return [
    'finance_director',
    'finance_admin',
    'finance_manager',
    'finance_officer',
    'payroll_cost_reviewer',
  ].includes(role)
}

async function ensureWageCostRecord(organisationId: string, budgetId: string): Promise<string> {
  const { data: existing } = await admin
    .from('cost_records')
    .select('id')
    .eq('organisation_id', organisationId)
    .eq('category', 'wages')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existing?.id) return String(existing.id)

  const id = `cost_wages_${organisationId}`
  const now = new Date().toISOString()
  const period = now.slice(0, 7)
  await cc(
    'cost_records.insert_wage',
    admin.from('cost_records').upsert(
      {
        id,
        organisation_id: organisationId,
        version: 1,
        supplier_name: 'Payroll',
        description: 'Employer wage cost summary',
        reference: `WAGES-${period}`,
        transaction_date: `${period}-01`,
        accounting_period: period,
        net_minor: 0,
        vat_minor: 0,
        gross_minor: 0,
        currency: 'GBP',
        status: 'actual',
        category: 'wages',
        validation_state: 'validated',
        review_state: 'open',
        source_key: `wages|summary|${organisationId}`,
        linked_commitment_id: null,
        correction_reason: null,
        created_at: now,
        updated_at: now,
      },
      { onConflict: 'id' },
    ),
  )
  await cc(
    'cost_allocations.insert_wage',
    admin.from('cost_allocations').upsert(
      {
        id: `alloc_${id}`,
        organisation_id: organisationId,
        cost_id: id,
        budget_id: budgetId,
        category: 'wages',
        cost_centre_id: null,
        vehicle_id: null,
        supplier_id: null,
        amount_minor: 0,
        created_at: now,
      },
      { onConflict: 'id' },
    ),
  )
  return id
}

async function ensurePayPeriod(organisationId: string): Promise<string> {
  const { data: existing } = await admin
    .from('pay_periods')
    .select('id')
    .eq('organisation_id', organisationId)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (existing?.id) return String(existing.id)

  const id = `payperiod_${organisationId}_current`
  const year = new Date().getUTCFullYear()
  const now = new Date().toISOString()
  await cc(
    'pay_periods.insert',
    admin.from('pay_periods').insert({
      id,
      organisation_id: organisationId,
      label: `${year}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')} pay period`,
      tax_year: `${year}/${String(year + 1).slice(-2)}`,
      frequency: 'monthly',
      period_number: new Date().getUTCMonth() + 1,
      status: 'forecast',
      provider_name: '',
      scheme_ref_token: '',
      employee_count: 0,
      budgeted_employer_cost_minor: 0,
      forecast: {
        grossWagesMinor: 0,
        employerNiMinor: 0,
        employerPensionMinor: 0,
        overtimeMinor: 0,
        allowancesMinor: 0,
        agencyMinor: 0,
        statutoryEmployerCostMinor: 0,
        otherEmployerCostMinor: 0,
        recoveriesMinor: 0,
        totalEmployerCostMinor: 0,
        formulaVersion: 'cost-control.payroll-employer.v1',
      },
      pre_payroll: null,
      final_payroll: null,
      exceptions: [],
      last_import_at: null,
      formula_version: 'cost-control.payroll-employer.v1',
      sort_order: 0,
      created_at: now,
      updated_at: now,
    }),
  )
  return id
}

async function handlePayrollSummaryImport(request: Request): Promise<Response> {
  const auth = await verifyBearer(request)
  if (auth instanceof Response) return auth

  const organisationId = request.headers.get('X-Veyvio-Organisation-ID')?.trim()
  if (!organisationId) return json({ error: 'active_organisation_required' }, 400)

  const membership = await findFinanceMembership(auth.userId, organisationId)
  if (!membership?.active) return json({ error: 'organisation_access_denied' }, 403)
  if (!roleAllowsPayrollImport(membership.role)) {
    return json({ error: 'finance_permission_denied' }, 403)
  }

  await ensureOrganisationShell(organisationId)
  await cc('organisation_memberships.upsert', admin.from('organisation_memberships').upsert(
    {
      id: `ccm_${organisationId}_${auth.userId}`,
      organisation_id: organisationId,
      user_subject: auth.userId,
      role: membership.role,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organisation_id,user_subject' },
  ))

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const fileName = String(body.fileName ?? '').trim() || 'payroll-summary.csv'
  const text = typeof body.text === 'string' ? body.text : ''
  if (!text.trim()) return json({ error: 'csv_text_required' }, 400)
  if (text.length > 2_000_000) return json({ error: 'csv_too_large' }, 413)

  const { data: budgetRow } = await admin
    .from('budgets')
    .select('id')
    .eq('organisation_id', organisationId)
    .eq('status', 'approved')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  const budgetId = budgetRow?.id ?? `bud_${organisationId}_current`

  const wageCostId = await ensureWageCostRecord(organisationId, budgetId)
  await ensurePayPeriod(organisationId)

  const { data: employeeRows } = await admin
    .from('employee_cost_references')
    .select('*')
    .eq('organisation_id', organisationId)

  const employees = (employeeRows ?? []).map((e) => ({
    id: String(e.id),
    externalPayrollId: String(e.external_payroll_id),
    displayName: String(e.display_name),
    expectedEmployerCostMinor: Number(e.expected_employer_cost_minor ?? 0),
    overtimeMinor: Number(e.overtime_minor ?? 0),
    allocationComplete: Boolean(e.allocation_complete),
    active: Boolean(e.active),
    wageCostBearing: Boolean(e.wage_cost_bearing),
  }))

  const startedAt = new Date().toISOString()
  const parsed = importPayrollSummaryForPersist({
    organisationId,
    text,
    wageCostId,
    employees,
    stage: 'pre_payroll',
    nowIso: startedAt,
  })
  if (parsed.rowsRead > 5000) return json({ error: 'csv_too_many_rows' }, 413)

  const finishedAt = new Date().toISOString()
  const importId = crypto.randomUUID()
  const runId = crypto.randomUUID()

  if (parsed.quarantined.length) {
    await cc(
      'quarantine_items.insert',
      admin.from('quarantine_items').insert(
        parsed.quarantined.map((q) => ({
          id: q.id,
          organisation_id: organisationId,
          source_key: q.sourceKey,
          reason: q.reason,
          raw: q.raw,
          created_at: q.createdAt,
        })),
      ),
    )
  }

  if (parsed.reviews.length) {
    await cc(
      'review_items.insert',
      admin.from('review_items').insert(
        parsed.reviews.map((r) => ({
          id: crypto.randomUUID(),
          organisation_id: organisationId,
          cost_id: r.costId,
          signal: r.signal,
          title: r.title,
          detail: r.detail,
          state: 'open',
          resolution_note: null,
          version: 1,
          created_at: finishedAt,
          updated_at: finishedAt,
        })),
      ),
    )
  }

  await cc(
    'import_runs.insert',
    admin.from('import_runs').insert({
      id: runId,
      organisation_id: organisationId,
      file_name: `[payroll-summary] ${fileName}`,
      started_at: startedAt,
      finished_at: finishedAt,
      rows_read: parsed.rowsRead,
      accepted: parsed.totals.matchedCount,
      quarantined: parsed.quarantined.length + parsed.totals.unmatchedCount,
      duplicates_skipped: 0,
    }),
  )

  await cc(
    'payroll_summary_imports.insert',
    admin.from('payroll_summary_imports').insert({
      id: importId,
      organisation_id: organisationId,
      file_name: fileName,
      stage: parsed.stage,
      wage_cost_id: wageCostId,
      rows_read: parsed.rowsRead,
      matched_count: parsed.totals.matchedCount,
      unmatched_count: parsed.totals.unmatchedCount,
      variance_count: parsed.totals.varianceCount,
      quarantined_count: parsed.quarantined.length,
      exception_count: parsed.exceptions.length,
      result_payload: parsed,
      actor_id: auth.userId,
      created_at: finishedAt,
    }),
  )

  const { data: periodRow } = await admin
    .from('pay_periods')
    .select('id')
    .eq('organisation_id', organisationId)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (periodRow?.id) {
    await cc(
      'pay_periods.update',
      admin
        .from('pay_periods')
        .update({
          status: 'review',
          pre_payroll: parsed.rolledUp,
          exceptions: parsed.exceptions,
          employee_count: Math.max(parsed.totals.matchedCount, employees.filter((e) => e.active && e.wageCostBearing).length),
          last_import_at: finishedAt,
          formula_version: parsed.rolledUp?.formulaVersion ?? 'cost-control.payroll-employer.v1',
          updated_at: finishedAt,
        })
        .eq('organisation_id', organisationId)
        .eq('id', periodRow.id),
    )
  }

  await cc(
    'audit_events.insert',
    admin.from('audit_events').insert({
      id: crypto.randomUUID(),
      organisation_id: organisationId,
      actor_id: auth.userId,
      action: 'payroll.import_summary',
      entity_type: 'payroll_summary_import',
      entity_id: importId,
      reason: fileName,
      before_state: { employeeCount: employees.length },
      after_state: parsed.totals,
      created_at: finishedAt,
    }),
  )

  const workspace = await loadWorkspace(organisationId)
  return json(
    {
      summary: {
        matched: parsed.totals.matchedCount,
        unmatched: parsed.totals.unmatchedCount,
        variance: parsed.totals.varianceCount,
        quarantined: parsed.quarantined.length,
        exceptions: parsed.exceptions.length,
        importId,
        fileName,
      },
      result: parsed,
      workspace,
    },
    200,
  )
}

async function loadWorkspace(organisationId: string) {
  const { data: org } = await admin
    .from('organisations')
    .select('*')
    .eq('id', organisationId)
    .maybeSingle()
  if (!org) throw new Error('organisation missing')

  const { data: budgetRow } = await admin
    .from('budgets')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('status', 'approved')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const year = new Date().getUTCFullYear()
  const budgetId = budgetRow?.id ?? `bud_${organisationId}_current`
  const { data: lineRows } = await admin
    .from('budget_lines')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('budget_id', budgetId)
    .order('sort_order', { ascending: true })

  const { data: costRows } = await admin
    .from('cost_records')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('transaction_date', { ascending: false })
    .limit(5000)

  const costIds = (costRows ?? []).map((c) => String(c.id))
  const { data: allocRows } = costIds.length
    ? await admin.from('cost_allocations').select('*').eq('organisation_id', organisationId).in('cost_id', costIds)
    : { data: [] as Record<string, unknown>[] }
  const { data: evidenceRows } = costIds.length
    ? await admin.from('cost_evidence').select('*').eq('organisation_id', organisationId).in('cost_id', costIds)
    : { data: [] as Record<string, unknown>[] }

  const { data: reviewRows } = await admin
    .from('review_items')
    .select('*')
    .eq('organisation_id', organisationId)
  const { data: quarantineRows } = await admin
    .from('quarantine_items')
    .select('*')
    .eq('organisation_id', organisationId)
  const { data: importRows } = await admin
    .from('import_runs')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('started_at', { ascending: false })
    .limit(50)
  const { data: employeeRows } = await admin
    .from('employee_cost_references')
    .select('*')
    .eq('organisation_id', organisationId)
  const { data: payPeriodRows } = await admin
    .from('pay_periods')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('sort_order', { ascending: true })
  const { data: snapRows } = await admin
    .from('financial_snapshots')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: false })
    .limit(1)

  const { data: bankConn } = await admin
    .from('bank_connections')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const { data: bankAccounts } = await admin
    .from('bank_accounts')
    .select('*')
    .eq('organisation_id', organisationId)
  const { data: bankTxns } = await admin
    .from('bank_transactions')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('booked_at', { ascending: false })
    .limit(2000)

  const allocByCost = new Map<string, Array<Record<string, unknown>>>()
  for (const a of allocRows ?? []) {
    const key = String(a.cost_id)
    const list = allocByCost.get(key) ?? []
    list.push(a)
    allocByCost.set(key, list)
  }
  const evidenceByCost = new Map<string, Array<Record<string, unknown>>>()
  for (const e of evidenceRows ?? []) {
    const key = String(e.cost_id)
    const list = evidenceByCost.get(key) ?? []
    list.push(e)
    evidenceByCost.set(key, list)
  }

  const budget = {
    id: budgetId,
    organisationId,
    name: budgetRow?.name ?? 'Company cost budget',
    code: budgetRow?.code ?? 'PENDING',
    financialYear: budgetRow?.financial_year ?? `${year}/${String(year + 1).slice(-2)}`,
    version: Number(budgetRow?.version ?? 1),
    currency: 'GBP' as const,
    contingencyMinor: Number(budgetRow?.contingency_minor ?? 0),
    lines: (lineRows ?? []).map((line) => ({
      id: String(line.id),
      category: String(line.category),
      label: String(line.label),
      approvedMinor: Number(line.approved_minor),
      originalApprovedMinor: Number(
        line.original_approved_minor ?? line.approved_minor ?? 0,
      ),
      ownerName: String(line.owner_name ?? ''),
      ownerRole: String(line.owner_role ?? ''),
    })),
  }

  const costs = (costRows ?? []).map((c) => {
    const allocs = allocByCost.get(String(c.id)) ?? []
    const evidence = evidenceByCost.get(String(c.id)) ?? []
    return {
      id: String(c.id),
      organisationId,
      version: Number(c.version ?? 1),
      supplierName: String(c.supplier_name),
      description: String(c.description),
      reference: String(c.reference),
      transactionDate: String(c.transaction_date),
      accountingPeriod: String(c.accounting_period),
      net: { amountMinor: Number(c.net_minor), currency: 'GBP' },
      vat: { amountMinor: Number(c.vat_minor), currency: 'GBP' },
      gross: { amountMinor: Number(c.gross_minor), currency: 'GBP' },
      status: String(c.status),
      category: String(c.category),
      validationState: String(c.validation_state),
      reviewState: String(c.review_state ?? 'none'),
      sourceKey: String(c.source_key),
      linkedCommitmentId: c.linked_commitment_id ? String(c.linked_commitment_id) : null,
      correctionReason: c.correction_reason ? String(c.correction_reason) : null,
      allocations: allocs.map((a) => ({
        id: String(a.id),
        budgetId: String(a.budget_id),
        category: String(a.category),
        costCentreId: a.cost_centre_id ? String(a.cost_centre_id) : null,
        vehicleId: a.vehicle_id ? String(a.vehicle_id) : null,
        supplierId: a.supplier_id ? String(a.supplier_id) : null,
        amountMinor: Number(a.amount_minor),
      })),
      evidence: evidence.map((e) => ({
        id: String(e.id),
        label: String(e.label),
        sourceType: String(e.source_type),
        checksum: e.checksum ? String(e.checksum) : null,
        storageKey: e.storage_key ? String(e.storage_key) : null,
      })),
      createdAt: String(c.created_at),
      updatedAt: String(c.updated_at),
    }
  })

  const approvedMinor =
    budget.lines.reduce((s, l) => s + l.approvedMinor, 0) + budget.contingencyMinor
  const snapRow = snapRows?.[0]
  const now = new Date().toISOString()
  const lastSnapshot = snapRow
    ? {
        id: String(snapRow.id),
        organisationId,
        calculationId: String(snapRow.calculation_id),
        formulaVersion: String(snapRow.formula_version),
        createdAt: String(snapRow.created_at),
        budgetId: String(snapRow.budget_id),
        budgetVersion: Number(snapRow.budget_version),
        approvedMinor: Number(snapRow.approved_minor),
        actualMinor: Number(snapRow.actual_minor),
        committedMinor: Number(snapRow.committed_minor),
        forecastMinor: Number(snapRow.forecast_minor),
        availableMinor: Number(snapRow.available_minor),
        projectedRemainingMinor: Number(snapRow.projected_remaining_minor),
        projectedFinalMinor: Number(snapRow.projected_final_minor),
        varianceToApprovedMinor: Number(snapRow.variance_to_approved_minor),
      }
    : {
        id: crypto.randomUUID(),
        organisationId,
        calculationId: crypto.randomUUID(),
        formulaVersion: 'v1',
        createdAt: now,
        budgetId: budget.id,
        budgetVersion: budget.version,
        approvedMinor,
        actualMinor: 0,
        committedMinor: 0,
        forecastMinor: 0,
        availableMinor: approvedMinor,
        projectedRemainingMinor: approvedMinor,
        projectedFinalMinor: 0,
        varianceToApprovedMinor: approvedMinor,
      }

  return {
    organisation: {
      id: organisationId,
      name: String(org.name),
      tradingName: String(org.trading_name),
      currency: 'GBP',
      timezone: String(org.timezone ?? 'Europe/London'),
    },
    budget,
    budgetChanges: [],
    quarterlyReview: {
      id: `qr_${organisationId}_open`,
      organisationId,
      budgetId: budget.id,
      financialYear: budget.financialYear,
      quarter: 'Q1',
      status: 'open',
      periodStart: `${year}-04-01`,
      periodEnd: `${year}-06-30`,
      version: 1,
      priorForecastByLineId: {},
      lineReviews: [],
      ownerConfirmedAt: null,
      financeApprovedAt: null,
      financeApprovedBy: null,
      lockedAt: null,
      lockedBy: null,
      movementSinceLastReviewMinor: 0,
      lastReviewLabel: 'No prior review',
    },
    incomeSummary: null,
    clgProfile: {
      organisationId,
      legalForm: 'clg',
      companyNumber: '',
      guaranteeAmountMinor: 0,
      charityStatus: 'pending_decision',
      charityNumber: null,
      articlesRequireAudit: false,
      funderRequiresAuditedAccounts: false,
      turnoverMinor: 0,
      totalAssetsMinor: 0,
      averageEmployees: 0,
    },
    clgPersons: [],
    approvalBands: [],
    fundingAwards: [],
    costs,
    reviews: (reviewRows ?? []).map((r) => ({
      id: String(r.id),
      organisationId,
      costId: String(r.cost_id),
      signal: String(r.signal),
      title: String(r.title),
      detail: String(r.detail),
      state: String(r.state),
      createdAt: String(r.created_at),
      resolutionNote: r.resolution_note != null ? String(r.resolution_note) : null,
    })),
    quarantine: (quarantineRows ?? []).map((q) => ({
      id: String(q.id),
      organisationId,
      sourceKey: String(q.source_key),
      reason: String(q.reason),
      raw: q.raw,
      createdAt: String(q.created_at),
    })),
    imports: (importRows ?? []).map((i) => ({
      id: String(i.id),
      organisationId,
      fileName: String(i.file_name),
      startedAt: String(i.started_at),
      finishedAt: String(i.finished_at),
      rowsRead: Number(i.rows_read),
      accepted: Number(i.accepted),
      quarantined: Number(i.quarantined),
      duplicatesSkipped: Number(i.duplicates_skipped),
    })),
    payPeriods: (payPeriodRows ?? []).map((p) => ({
      id: String(p.id),
      organisationId,
      label: String(p.label),
      taxYear: String(p.tax_year ?? ''),
      frequency: String(p.frequency ?? 'monthly'),
      periodNumber: Number(p.period_number ?? 1),
      periodStart: p.period_start ? String(p.period_start) : '',
      periodEnd: p.period_end ? String(p.period_end) : '',
      contractualPayday: p.contractual_payday ? String(p.contractual_payday) : '',
      status: String(p.status ?? 'forecast'),
      providerName: String(p.provider_name ?? ''),
      schemeRefToken: String(p.scheme_ref_token ?? ''),
      employeeCount: Number(p.employee_count ?? 0),
      budgetedEmployerCostMinor: Number(p.budgeted_employer_cost_minor ?? 0),
      forecast: p.forecast ?? {
        grossWagesMinor: 0,
        employerNiMinor: 0,
        employerPensionMinor: 0,
        overtimeMinor: 0,
        allowancesMinor: 0,
        agencyMinor: 0,
        statutoryEmployerCostMinor: 0,
        otherEmployerCostMinor: 0,
        recoveriesMinor: 0,
        totalEmployerCostMinor: 0,
        formulaVersion: 'cost-control.payroll-employer.v1',
      },
      prePayroll: p.pre_payroll ?? null,
      finalPayroll: p.final_payroll ?? null,
      exceptions: Array.isArray(p.exceptions) ? p.exceptions : [],
      lastImportAt: p.last_import_at ? String(p.last_import_at) : null,
      formulaVersion: String(p.formula_version ?? 'cost-control.payroll-employer.v1'),
    })),
    orgNodes: [],
    employeeCostReferences: (employeeRows ?? []).map((e) => ({
      id: String(e.id),
      organisationId,
      externalPayrollId: String(e.external_payroll_id),
      displayName: String(e.display_name),
      orgNodeId: String(e.org_node_id ?? ''),
      roleTitle: String(e.role_title ?? ''),
      costCentre: String(e.cost_centre ?? ''),
      employmentKind: String(e.employment_kind ?? 'employed'),
      wageCostBearing: Boolean(e.wage_cost_bearing),
      expectedEmployerCostMinor: Number(e.expected_employer_cost_minor ?? 0),
      overtimeMinor: Number(e.overtime_minor ?? 0),
      employerNiMinor: Number(e.employer_ni_minor ?? 0),
      employerPensionMinor: Number(e.employer_pension_minor ?? 0),
      allocationComplete: Boolean(e.allocation_complete),
      active: Boolean(e.active),
    })),
    driverDays: [],
    payRates: [],
    wageBatches: [],
    bankAccounts: (bankAccounts ?? []).map((a) => ({
      id: String(a.id),
      organisationId,
      displayName: String(a.account_name),
      institutionName: bankConn?.institution_name ?? 'Business bank',
      sortCodeMasked: '**-**-**',
      accountNumberMasked: String(a.account_number_masked),
      currency: 'GBP',
      balanceMinor: Number(a.available_balance_minor),
      ledgerBalanceMinor: Number(a.ledger_balance_minor),
      asOf: String(a.provider_updated_at),
      feedMode: 'open_banking',
      connectionLabel: bankConn?.provider_id
        ? `Open Banking AIS via ${String(bankConn.provider_id)}`
        : 'Open Banking',
      lastSyncedAt: bankConn?.last_synced_at ? String(bankConn.last_synced_at) : null,
      staleAfterSeconds: 900,
    })),
    bankTransactions: (bankTxns ?? []).map((t) => ({
      id: String(t.id),
      organisationId,
      accountId: String(t.account_id),
      bookedAt: String(t.booked_at),
      description: String(t.description),
      counterparty: t.counterparty_name ? String(t.counterparty_name) : String(t.description),
      direction: String(t.direction),
      amountMinor: Number(t.amount_minor),
      balanceAfterMinor: null,
      providerTxnId: String(t.open_banking_transaction_id),
      matchedCostId: null,
      status: 'booked',
    })),
    bankConnection: bankConn
      ? {
          id: String(bankConn.id),
          organisationId,
          providerId: String(bankConn.provider_id),
          status: String(bankConn.status),
          externalConnectionId: bankConn.external_connection_id
            ? String(bankConn.external_connection_id)
            : null,
          institutionName: bankConn.institution_name ? String(bankConn.institution_name) : null,
          scopes: Array.isArray(bankConn.scopes) ? bankConn.scopes : ['accounts', 'balance', 'transactions'],
          connectedAt: bankConn.connected_at ? String(bankConn.connected_at) : null,
          lastError: bankConn.last_error ? String(bankConn.last_error) : null,
          secretStorage: String(bankConn.secret_reference ?? '').startsWith('sandbox:')
            ? 'demo_memory'
            : bankConn.secret_reference
              ? 'server_vault'
              : 'demo_memory',
        }
      : {
          id: `bankconn_${organisationId}`,
          organisationId,
          providerId: 'demo',
          status: 'disconnected',
          externalConnectionId: null,
          institutionName: null,
          scopes: [],
          connectedAt: null,
          lastError: null,
          secretStorage: 'demo_memory',
        },
    pendingBankConsentState: null,
    bankRestrictedMinor: 0,
    sageIntegration: {
      connection: {
        organisationId,
        productId: 'undecided',
        status: 'disconnected',
        sageBusinessId: null,
        sageOrganisationName: null,
        connectedAt: null,
        lastError: null,
        secretStorage: 'none',
      },
      mappings: [],
      unmappedCount: 0,
      failedExports: [],
      recentPostings: [],
    },
    auditEvents: [],
    lastSnapshot,
    lastValidSnapshot: lastSnapshot,
  }
}

// ---------------------------------------------------------------------------
// Open Banking token proxy (sandbox-first; secrets stay server-side)
// ---------------------------------------------------------------------------

async function assertOrgAccess(request: Request, organisationId: string) {
  const auth = await verifyBearer(request)
  if (auth instanceof Response) return { error: auth }
  const membership = await findFinanceMembership(auth.userId, organisationId)
  if (!membership?.active) return { error: json({ error: 'organisation_access_denied' }, 403) }
  return { userId: auth.userId, membership }
}

function isAllowedBankRedirectUri(redirectUri: string): boolean {
  const exact = Deno.env.get('BANK_REDIRECT_URI')?.trim()
  if (exact && redirectUri === exact) return true
  const allowlist = (Deno.env.get('BANK_REDIRECT_URI_ALLOWLIST') ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
  if (allowlist.includes(redirectUri)) return true
  // Local Cost Control defaults (never treat as production allow-all).
  try {
    const parsed = new URL(redirectUri)
    if (
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
      (parsed.pathname === '/settings' || parsed.pathname.startsWith('/settings'))
    ) {
      return true
    }
  } catch {
    return false
  }
  return false
}

async function handleBankConsentStart(request: Request, url: URL): Promise<Response> {
  const organisationId = url.searchParams.get('organisation_id')?.trim()
  if (!organisationId) return json({ error: 'organisation_id_required' }, 400)

  const access = await assertOrgAccess(request, organisationId)
  if ('error' in access && access.error) return access.error

  const state = url.searchParams.get('state')?.trim() || crypto.randomUUID()
  const redirectUri = url.searchParams.get('redirect_uri')?.trim()
  if (!redirectUri) return json({ error: 'redirect_uri_required' }, 400)
  if (!isAllowedBankRedirectUri(redirectUri)) {
    return json({ error: 'redirect_uri_not_allowed' }, 400)
  }

  const clientSecret = Deno.env.get('BANK_CLIENT_SECRET')?.trim()
  if (!clientSecret) {
    // Missing partner secret must fail closed — never invent a sandbox caller.
    return json({ error: 'bank_credentials_not_configured' }, 503)
  }

  const institution = url.searchParams.get('institution')?.trim() || 'NatWest Business'
  const providerId = Deno.env.get('BANK_PROVIDER')?.trim() || 'truelayer_sandbox'
  const clientId = url.searchParams.get('client_id')?.trim() || Deno.env.get('BANK_CLIENT_ID')?.trim()
  if (!clientId) return json({ error: 'bank_client_id_required' }, 503)

  const connectionId = crypto.randomUUID()
  await ensureOrganisationShell(organisationId)
  await cc('bank_connections.insert', admin.from('bank_connections').insert({
    id: connectionId,
    organisation_id: organisationId,
    provider_id: providerId,
    status: 'awaiting_consent',
    external_connection_id: null,
    institution_name: institution,
    scopes: ['accounts', 'balance', 'transactions'],
    secret_reference: `vault:${organisationId}:${connectionId}`,
    updated_at: new Date().toISOString(),
  }))

  const authBase = providerId.includes('sandbox')
    ? 'https://auth.truelayer-sandbox.com'
    : 'https://auth.truelayer.com'
  const consent = new URL('/', authBase)
  consent.searchParams.set('response_type', 'code')
  consent.searchParams.set('client_id', clientId)
  consent.searchParams.set('scope', 'info accounts balance transactions offline_access')
  consent.searchParams.set('redirect_uri', redirectUri)
  consent.searchParams.set('providers', 'uk-cs-mock uk-ob-all')
  consent.searchParams.set('state', state)

  return json({
    consentUrl: consent.toString(),
    state,
    connection_id: connectionId,
    provider: providerId,
  })
}

async function handleBankConsentComplete(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    organisation_id?: string
    connection_id?: string
    code?: string
    state?: string
  }
  const organisationId = body.organisation_id?.trim()
  if (!organisationId) return json({ error: 'organisation_id_required' }, 400)
  const access = await assertOrgAccess(request, organisationId)
  if ('error' in access && access.error) return access.error

  const connectionId = body.connection_id?.trim() || crypto.randomUUID()
  const externalId = body.code
    ? `tl_${organisationId}_${body.state ?? crypto.randomUUID().slice(0, 8)}`
    : `sandbox_conn_${organisationId}`
  const providerId = Deno.env.get('BANK_PROVIDER')?.trim() || 'truelayer_sandbox'
  const now = new Date().toISOString()

  await ensureOrganisationShell(organisationId)
  await cc('bank_connections.upsert', admin.from('bank_connections').upsert(
    {
      id: connectionId,
      organisation_id: organisationId,
      provider_id: providerId,
      status: 'connected',
      external_connection_id: externalId,
      institution_name: 'NatWest Business',
      scopes: ['accounts', 'balance', 'transactions'],
      secret_reference: Deno.env.get('BANK_CLIENT_SECRET')
        ? `vault:${organisationId}:${connectionId}`
        : `sandbox:${organisationId}`,
      connected_at: now,
      last_synced_at: now,
      last_error: null,
      updated_at: now,
    },
    { onConflict: 'id' },
  ))

  // Persist sandbox AIS fixture so /bank/accounts returns durable rows.
  await persistSandboxBankFeed(organisationId, connectionId, externalId)

  return json({
    external_connection_id: externalId,
    institution_name: 'NatWest Business',
    connection_id: connectionId,
  }, 200)
}

async function persistSandboxBankFeed(
  organisationId: string,
  connectionId: string,
  _externalId: string,
) {
  const now = new Date().toISOString()
  const accountId = `ob_${organisationId}_current`
  await cc('bank_accounts.upsert', admin.from('bank_accounts').upsert(
    {
      id: accountId,
      organisation_id: organisationId,
      connection_id: connectionId,
      external_account_id: accountId,
      account_name: 'Operating current account',
      account_number_masked: '****7821',
      currency: 'GBP',
      ledger_balance_minor: 8_462_045,
      available_balance_minor: 8_462_045,
      provider_updated_at: now,
      updated_at: now,
    },
    { onConflict: 'organisation_id,connection_id,external_account_id' },
  ))

  const txns = [
    {
      id: `obtxn_${organisationId}_fuel_1`,
      open_banking_transaction_id: 'obtxn_fuel_1',
      booked_at: '2026-07-28T09:12:00.000Z',
      amount_minor: 582_000,
      direction: 'debit',
      description: 'ALLSTAR FUEL CARD',
      counterparty_name: 'Allstar Business Solutions',
    },
    {
      id: `obtxn_${organisationId}_rent_1`,
      open_banking_transaction_id: 'obtxn_rent_1',
      booked_at: '2026-07-28T08:40:00.000Z',
      amount_minor: 510_000,
      direction: 'debit',
      description: 'WEMBLEY DEPOT ESTATES RENT',
      counterparty_name: 'Wembley Depot Estates',
    },
    {
      id: `obtxn_${organisationId}_grant_1`,
      open_banking_transaction_id: 'obtxn_grant_1',
      booked_at: '2026-07-27T16:22:00.000Z',
      amount_minor: 4_200_000,
      direction: 'credit',
      description: 'GRANT DRAWDOWN JUL',
      counterparty_name: 'Local Authority',
    },
  ]
  for (const t of txns) {
    await cc('bank_transactions.upsert', admin.from('bank_transactions').upsert(
      {
        ...t,
        organisation_id: organisationId,
        account_id: accountId,
        currency: 'GBP',
        provider_payload_checksum: `sha256:${t.open_banking_transaction_id}`,
        updated_at: now,
      },
      { onConflict: 'organisation_id,account_id,open_banking_transaction_id' },
    ))
  }

  await cc(
    'bank_connections.update',
    admin
      .from('bank_connections')
      .update({ last_synced_at: now, updated_at: now })
      .eq('id', connectionId),
  )
}

async function handleBankAccounts(request: Request, url: URL): Promise<Response> {
  const organisationId = url.searchParams.get('organisation_id')?.trim()
  if (!organisationId) return json({ error: 'organisation_id_required' }, 400)
  const access = await assertOrgAccess(request, organisationId)
  if ('error' in access && access.error) return access.error

  const { data: accounts } = await admin
    .from('bank_accounts')
    .select('*')
    .eq('organisation_id', organisationId)

  if (!accounts?.length) {
    // Lazily seed sandbox feed when proxy is used without prior complete.
    const { data: conn } = await admin
      .from('bank_connections')
      .select('id, external_connection_id')
      .eq('organisation_id', organisationId)
      .eq('status', 'connected')
      .limit(1)
      .maybeSingle()
    if (conn) {
      await persistSandboxBankFeed(
        organisationId,
        String(conn.id),
        String(conn.external_connection_id ?? `sandbox_conn_${organisationId}`),
      )
    }
  }

  const { data: refreshed } = await admin
    .from('bank_accounts')
    .select('*')
    .eq('organisation_id', organisationId)

  return json({
    results: (refreshed ?? []).map((a) => ({
      account_id: String(a.id),
      display_name: String(a.account_name),
      currency: 'GBP',
      account_number: {
        number: String(a.account_number_masked).replace(/\D/g, '') || '0000',
        sort_code: '601544',
      },
      provider: { display_name: 'NatWest Business' },
      balances: [
        {
          available: Number(a.available_balance_minor) / 100,
          current: Number(a.ledger_balance_minor) / 100,
          currency: 'GBP',
        },
      ],
    })),
    request_id: `fin_${crypto.randomUUID()}`,
  }, 200)
}

async function handleBankTransactions(
  request: Request,
  url: URL,
  accountId: string,
): Promise<Response> {
  const organisationId = url.searchParams.get('organisation_id')?.trim()
  if (!organisationId) return json({ error: 'organisation_id_required' }, 400)
  const access = await assertOrgAccess(request, organisationId)
  if ('error' in access && access.error) return access.error

  const { data: txns } = await admin
    .from('bank_transactions')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('account_id', accountId)
    .order('booked_at', { ascending: false })

  return json({
    results: (txns ?? []).map((t) => ({
      transaction_id: String(t.open_banking_transaction_id),
      timestamp: String(t.booked_at),
      description: String(t.description),
      merchant_name: t.counterparty_name ? String(t.counterparty_name) : undefined,
      amount: Number(t.amount_minor) / 100,
      currency: 'GBP',
      transaction_type: String(t.direction).toUpperCase() === 'CREDIT' ? 'CREDIT' : 'DEBIT',
      status: 'BOOKED',
    })),
    request_id: `fin_txn_${crypto.randomUUID()}`,
  }, 200)
}

async function handleBankRevoke(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    organisation_id?: string
    connection_id?: string
  }
  const organisationId = body.organisation_id?.trim()
  if (!organisationId) return json({ error: 'organisation_id_required' }, 400)
  const access = await assertOrgAccess(request, organisationId)
  if ('error' in access && access.error) return access.error

  const q = admin
    .from('bank_connections')
    .update({
      status: 'revoked',
      external_connection_id: null,
      connected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('organisation_id', organisationId)
  if (body.connection_id) {
    await q.or(
      `id.eq.${body.connection_id},external_connection_id.eq.${body.connection_id}`,
    )
  } else {
    await q
  }
  return json({ revoked: true }, 200)
}
