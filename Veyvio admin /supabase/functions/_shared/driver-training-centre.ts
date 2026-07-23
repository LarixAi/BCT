/** Driver Training Centre — list assignments and save progress/completion. */
import { admin, authenticate } from './supabase.ts'
import { apiError, json, readJson } from './http.ts'
import {
  DRIVER_ONBOARDING_NOTIFICATION,
  notifyCompanyAdmins,
  notifyDriverAppUser,
} from './notifications.ts'

type Row = Record<string, unknown>

export const TRAINING_COURSE_META: Record<
  string,
  {
    label: string
    category: string
    requiredFor: string
    renewalMonths: number | null
    estimatedMinutes: number
    mandatory: boolean
    eligibilityEffect: 'none' | 'warning' | 'block_specific_work' | 'block_all_work'
    restrictedWorkTypes: string[]
    requiresEvidence: boolean
  }
> = {
  company_induction: {
    label: 'Company induction',
    category: 'Mandatory before first shift',
    requiredFor: 'All drivers — before first shift',
    renewalMonths: null,
    estimatedMinutes: 25,
    mandatory: true,
    eligibilityEffect: 'block_all_work',
    restrictedWorkTypes: [],
    requiresEvidence: false,
  },
  driver_app: {
    label: 'Driver app training',
    category: 'Mandatory before first shift',
    requiredFor: 'All drivers — before first shift',
    renewalMonths: null,
    estimatedMinutes: 20,
    mandatory: true,
    eligibilityEffect: 'block_all_work',
    restrictedWorkTypes: [],
    requiresEvidence: false,
  },
  daily_vehicle_checks: {
    label: 'Daily vehicle check training',
    category: 'Mandatory before first shift',
    requiredFor: 'All drivers — before first shift',
    renewalMonths: 12,
    estimatedMinutes: 20,
    mandatory: true,
    eligibilityEffect: 'block_all_work',
    restrictedWorkTypes: [],
    requiresEvidence: false,
  },
  health_safety: {
    label: 'Health and safety',
    category: 'Mandatory before first shift',
    requiredFor: 'All drivers — before first shift',
    renewalMonths: 36,
    estimatedMinutes: 30,
    mandatory: true,
    eligibilityEffect: 'block_all_work',
    restrictedWorkTypes: [],
    requiresEvidence: false,
  },
  emergency_procedures: {
    label: 'Emergency procedures',
    category: 'Mandatory before first shift',
    requiredFor: 'All drivers — before first shift',
    renewalMonths: 12,
    estimatedMinutes: 25,
    mandatory: true,
    eligibilityEffect: 'block_all_work',
    restrictedWorkTypes: [],
    requiresEvidence: false,
  },
  safeguarding: {
    label: 'Safeguarding',
    category: 'Mandatory before first shift',
    requiredFor: 'All drivers — Section 19/22 essential',
    renewalMonths: 36,
    estimatedMinutes: 30,
    mandatory: true,
    eligibilityEffect: 'block_all_work',
    restrictedWorkTypes: [],
    requiresEvidence: true,
  },
  data_protection_gdpr: {
    label: 'Data protection (GDPR)',
    category: 'Mandatory before first shift',
    requiredFor: 'All drivers — before first shift',
    renewalMonths: 36,
    estimatedMinutes: 20,
    mandatory: true,
    eligibilityEffect: 'block_all_work',
    restrictedWorkTypes: [],
    requiresEvidence: false,
  },
  driver_declaration: {
    label: 'Driver declaration',
    category: 'Mandatory before first shift',
    requiredFor: 'All drivers — before first shift',
    renewalMonths: null,
    estimatedMinutes: 5,
    mandatory: true,
    eligibilityEffect: 'block_all_work',
    restrictedWorkTypes: [],
    requiresEvidence: false,
  },
  manual_handling: {
    label: 'Manual handling',
    category: 'Mandatory before first shift',
    requiredFor: 'All drivers',
    renewalMonths: 36,
    estimatedMinutes: 30,
    mandatory: true,
    eligibilityEffect: 'block_all_work',
    restrictedWorkTypes: [],
    requiresEvidence: true,
  },
  midas_standard: {
    label: 'MiDAS Standard',
    category: 'Vehicle-specific',
    requiredFor: 'Minibus / community transport vehicles',
    renewalMonths: 48,
    estimatedMinutes: 45,
    mandatory: false,
    eligibilityEffect: 'block_specific_work',
    restrictedWorkTypes: ['minibus', 'community_transport'],
    requiresEvidence: true,
  },
  safeguarding_adults: {
    label: 'Safeguarding adults',
    category: 'Mandatory before first shift',
    requiredFor: 'All drivers',
    renewalMonths: 36,
    estimatedMinutes: 30,
    mandatory: true,
    eligibilityEffect: 'block_all_work',
    restrictedWorkTypes: [],
    requiresEvidence: true,
  },
  first_aid_efaw: {
    label: 'Emergency First Aid at Work',
    category: 'Role-specific',
    requiredFor: 'First-aid designated duties',
    renewalMonths: 36,
    estimatedMinutes: 40,
    mandatory: false,
    eligibilityEffect: 'block_specific_work',
    restrictedWorkTypes: ['first_aid', 'hospital', 'school'],
    requiresEvidence: true,
  },
  midas_accessible: {
    label: 'MiDAS Accessible',
    category: 'Vehicle-specific',
    requiredFor: 'Wheelchair / accessible vehicles',
    renewalMonths: 48,
    estimatedMinutes: 40,
    mandatory: false,
    eligibilityEffect: 'block_specific_work',
    restrictedWorkTypes: ['wheelchair', 'accessible'],
    requiresEvidence: true,
  },
  wheelchair_restraint: {
    label: 'Wheelchair restraint systems',
    category: 'Vehicle-specific',
    requiredFor: 'Wheelchair passengers',
    renewalMonths: 36,
    estimatedMinutes: 35,
    mandatory: false,
    eligibilityEffect: 'block_specific_work',
    restrictedWorkTypes: ['wheelchair', 'accessible'],
    requiresEvidence: true,
  },
  lift_ramp_operation: {
    label: 'Lift and ramp operation',
    category: 'Vehicle-specific',
    requiredFor: 'Accessible vehicles with lift or ramp',
    renewalMonths: 36,
    estimatedMinutes: 25,
    mandatory: false,
    eligibilityEffect: 'block_specific_work',
    restrictedWorkTypes: ['wheelchair', 'accessible', 'passenger_lift'],
    requiresEvidence: true,
  },
  safeguarding_children: {
    label: 'Safeguarding children',
    category: 'Role-specific',
    requiredFor: 'School / SEND transport',
    renewalMonths: 36,
    estimatedMinutes: 30,
    mandatory: false,
    eligibilityEffect: 'block_specific_work',
    restrictedWorkTypes: ['school', 'send'],
    requiresEvidence: true,
  },
  send_autism_awareness: {
    label: 'SEND / autism awareness',
    category: 'Role-specific',
    requiredFor: 'SEND transport',
    renewalMonths: 36,
    estimatedMinutes: 30,
    mandatory: false,
    eligibilityEffect: 'block_specific_work',
    restrictedWorkTypes: ['send', 'school'],
    requiresEvidence: false,
  },
  behaviour_management: {
    label: 'Behaviour management',
    category: 'Role-specific',
    requiredFor: 'SEND / school transport',
    renewalMonths: 36,
    estimatedMinutes: 25,
    mandatory: false,
    eligibilityEffect: 'block_specific_work',
    restrictedWorkTypes: ['send', 'school'],
    requiresEvidence: false,
  },
  infection_prevention: {
    label: 'Infection prevention and control',
    category: 'Role-specific',
    requiredFor: 'Hospital transport',
    renewalMonths: 24,
    estimatedMinutes: 20,
    mandatory: false,
    eligibilityEffect: 'block_specific_work',
    restrictedWorkTypes: ['hospital'],
    requiresEvidence: false,
  },
  dementia_awareness: {
    label: 'Dementia awareness',
    category: 'Role-specific',
    requiredFor: 'Hospital / elderly transport',
    renewalMonths: 36,
    estimatedMinutes: 25,
    mandatory: false,
    eligibilityEffect: 'block_specific_work',
    restrictedWorkTypes: ['hospital', 'elderly'],
    requiresEvidence: false,
  },
  driver_cpc: {
    label: 'Driver CPC (periodic training)',
    category: 'Vehicle-specific',
    requiredFor: 'PSV / coach',
    renewalMonths: 60,
    estimatedMinutes: 60,
    mandatory: false,
    eligibilityEffect: 'block_specific_work',
    restrictedWorkTypes: ['psv', 'coach'],
    requiresEvidence: true,
  },
  eco_driving: {
    label: 'Eco driving',
    category: 'Professional development',
    requiredFor: 'Optional development',
    renewalMonths: null,
    estimatedMinutes: 20,
    mandatory: false,
    eligibilityEffect: 'none',
    restrictedWorkTypes: [],
    requiresEvidence: false,
  },
  customer_excellence: {
    label: 'Customer excellence',
    category: 'Professional development',
    requiredFor: 'Optional development',
    renewalMonths: null,
    estimatedMinutes: 20,
    mandatory: false,
    eligibilityEffect: 'none',
    restrictedWorkTypes: [],
    requiresEvidence: false,
  },
  leadership: {
    label: 'Leadership',
    category: 'Professional development',
    requiredFor: 'Optional development',
    renewalMonths: null,
    estimatedMinutes: 30,
    mandatory: false,
    eligibilityEffect: 'none',
    restrictedWorkTypes: [],
    requiresEvidence: false,
  },
}

const VISIBLE_REQ_STATUSES = new Set([
  'training_assigned',
  'in_progress',
  'submitted',
  'awaiting_review',
  'changes_requested',
  'request_sent',
  'rejected',
  'overdue',
])

const COMPLETE_REQ_STATUSES = new Set(['approved', 'completed', 'complete'])
const WAIVED_STATUSES = new Set(['waived', 'not_applicable'])

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const due = new Date(`${String(dateStr).slice(0, 10)}T23:59:59.000Z`)
  if (Number.isNaN(due.getTime())) return null
  const now = new Date()
  return Math.ceil((due.getTime() - now.getTime()) / 86_400_000)
}

function defaultExpiry(trainingKey: string, completedAt: string): string | null {
  const meta = TRAINING_COURSE_META[trainingKey]
  if (!meta?.renewalMonths) return null
  const base = new Date(`${completedAt}T00:00:00.000Z`)
  if (Number.isNaN(base.getTime())) return null
  base.setUTCMonth(base.getUTCMonth() + meta.renewalMonths)
  return base.toISOString().slice(0, 10)
}

function mapStatus(args: {
  reqStatus: string | null
  trainingStatus: string | null
  progressPercentage: number
  dueAt: string | null
  expiresAt: string | null
  requiresEvidence: boolean
}): { status: string; warningStatus: string | null } {
  const req = String(args.reqStatus ?? '').toLowerCase()
  const train = String(args.trainingStatus ?? '').toLowerCase()
  const days = daysUntil(args.dueAt)
  const expireDays = daysUntil(args.expiresAt)

  if (WAIVED_STATUSES.has(req) || train === 'waived') {
    return { status: 'waived', warningStatus: null }
  }
  if (train === 'superseded' || req === 'superseded') {
    return { status: 'superseded', warningStatus: null }
  }
  if (COMPLETE_REQ_STATUSES.has(req) || train === 'complete' || train === 'completed') {
    let warning: string | null = null
    if (expireDays != null && expireDays < 0) warning = 'expired'
    else if (expireDays != null && expireDays <= 30) warning = 'expires_soon'
    return { status: 'completed', warningStatus: warning }
  }
  if (req === 'changes_requested') {
    return { status: 'changes_requested', warningStatus: days != null && days < 0 ? 'overdue' : null }
  }
  if (req === 'submitted' || req === 'awaiting_review') {
    return { status: 'awaiting_review', warningStatus: null }
  }
  if (args.requiresEvidence && (req === 'request_sent' || train === 'evidence_required')) {
    return {
      status: 'evidence_required',
      warningStatus: days != null && days < 0 ? 'overdue' : days != null && days <= 7 ? 'due_soon' : null,
    }
  }

  let status = 'assigned'
  if (args.progressPercentage > 0 && args.progressPercentage < 100) status = 'in_progress'
  else if (train === 'in_progress') status = 'in_progress'
  else if (train === 'not_started' || req === 'training_assigned') status = 'not_started'
  else if (train === 'assigned' || req === 'training_assigned') status = 'assigned'

  let warning: string | null = null
  if (days != null && days < 0) warning = 'overdue'
  else if (days != null && days === 0) warning = 'due_today'
  else if (days != null && days <= 7) warning = 'due_soon'

  return { status, warningStatus: warning }
}

function urgencyRank(assignment: Row): number {
  const warning = String(assignment.warningStatus ?? '')
  const effect = String(assignment.eligibilityEffect ?? 'none')
  const status = String(assignment.status ?? '')
  if (warning === 'overdue' && (effect === 'block_all_work' || effect === 'block_specific_work')) return 0
  if (warning === 'overdue') return 1
  if (warning === 'due_today') return 2
  if (warning === 'due_soon') return 3
  if (status === 'in_progress') return 4
  if (status === 'assigned' || status === 'not_started') return 5
  return 9
}

export async function ensureTrainingAssignmentRow(input: {
  companyId: string
  driverId: string
  trainingKey: string
  userId: string
  assignedByName?: string | null
  dueAt?: string | null
}) {
  const meta = TRAINING_COURSE_META[input.trainingKey]
  if (!meta) return null
  const now = new Date().toISOString()
  let existing: Row | null = null
  {
    const withProgress = await admin
      .from('driver_training')
      .select('id, status, progress_percentage')
      .eq('company_id', input.companyId)
      .eq('driver_id', input.driverId)
      .eq('training_key', input.trainingKey)
      .maybeSingle()
    if (withProgress.error && /progress_percentage/i.test(withProgress.error.message)) {
      const basic = await admin
        .from('driver_training')
        .select('id, status')
        .eq('company_id', input.companyId)
        .eq('driver_id', input.driverId)
        .eq('training_key', input.trainingKey)
        .maybeSingle()
      existing = (basic.data as Row | null) ?? null
    } else if (withProgress.error) {
      throw new Error(withProgress.error.message)
    } else {
      existing = (withProgress.data as Row | null) ?? null
    }
  }

  if (existing && ['complete', 'completed'].includes(String(existing.status))) {
    return existing
  }

  const row = {
    company_id: input.companyId,
    driver_id: input.driverId,
    training_key: input.trainingKey,
    label: meta.label,
    required_for: meta.requiredFor,
    status: existing ? String(existing.status ?? 'assigned') : 'assigned',
    progress_percentage: existing ? Number(existing.progress_percentage ?? 0) : 0,
    due_at: input.dueAt ?? null,
    assigned_at: now,
    assigned_by_name: input.assignedByName ?? 'Training lead',
    eligibility_effect: meta.eligibilityEffect,
    restricted_work_types: meta.restrictedWorkTypes,
    updated_at: now,
    updated_by: input.userId,
    created_by: input.userId,
    source_app: 'COMMAND',
  }

  let { data, error } = await admin
    .from('driver_training')
    .upsert(row, { onConflict: 'driver_id,training_key' })
    .select('*')
    .maybeSingle()

  // Fallback when progress migration is not applied yet.
  if (error && /progress_percentage|lesson_progress|assigned_at|eligibility_effect|restricted_work/i.test(error.message)) {
    const basic = {
      company_id: input.companyId,
      driver_id: input.driverId,
      training_key: input.trainingKey,
      label: meta.label,
      required_for: meta.requiredFor,
      status: existing ? String(existing.status ?? 'assigned') : 'assigned',
      due_at: input.dueAt ?? null,
      updated_at: now,
      updated_by: input.userId,
      created_by: input.userId,
      source_app: 'COMMAND',
    }
    const retry = await admin
      .from('driver_training')
      .upsert(basic, { onConflict: 'driver_id,training_key' })
      .select('*')
      .maybeSingle()
    data = retry.data
    error = retry.error
  }

  if (error) throw new Error(error.message)
  return data
}

function toAssignment(row: Row, req: Row | null): Row {
  const key = String(row.training_key ?? req?.definition_key ?? '')
  const meta = TRAINING_COURSE_META[key] ?? {
    label: String(row.label ?? key.replace(/_/g, ' ')),
    category: 'Compliance',
    requiredFor: String(row.required_for ?? 'Drivers'),
    renewalMonths: null,
    estimatedMinutes: 20,
    mandatory: true,
    eligibilityEffect: 'none' as const,
    restrictedWorkTypes: [] as string[],
    requiresEvidence: false,
  }

  const progressPercentage = Number(row.progress_percentage ?? 0)
  const dueAt = (row.due_at ?? req?.due_at ?? null) as string | null
  const expiresAt = (row.expires_at ?? null) as string | null
  const mapped = mapStatus({
    reqStatus: req?.status_override ? String(req.status_override) : null,
    trainingStatus: row.status ? String(row.status) : null,
    progressPercentage,
    dueAt,
    expiresAt,
    requiresEvidence: meta.requiresEvidence,
  })

  const lessonProgress =
    row.lesson_progress && typeof row.lesson_progress === 'object' ? row.lesson_progress : {}

  return {
    id: String(row.id ?? `${key}`),
    courseId: key,
    courseVersionId: String(row.course_version ?? '1.0'),
    title: meta.label,
    category: meta.category,
    mandatory: meta.mandatory,
    requiredFor: meta.requiredFor,
    assignedAt: row.assigned_at ? String(row.assigned_at) : req?.updated_at ? String(req.updated_at) : null,
    assignedByName: row.assigned_by_name
      ? String(row.assigned_by_name)
      : req?.assigned_to_name
        ? String(req.assigned_to_name)
        : 'Training lead',
    dueAt,
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    expiresAt,
    status: mapped.status,
    warningStatus: mapped.warningStatus,
    progressPercentage,
    estimatedMinutes: meta.estimatedMinutes,
    eligibilityEffect: row.eligibility_effect
      ? String(row.eligibility_effect)
      : meta.eligibilityEffect,
    restrictedWorkTypes: Array.isArray(row.restricted_work_types)
      ? row.restricted_work_types.map(String)
      : meta.restrictedWorkTypes,
    requiresEvidence: meta.requiresEvidence,
    requiresManagerApproval: meta.requiresEvidence,
    assessmentScore: row.assessment_score != null ? Number(row.assessment_score) : null,
    declarationAt: row.declaration_at ? String(row.declaration_at) : null,
    lessonProgress,
    lastActivityAt: row.updated_at ? String(row.updated_at) : null,
  }
}

export async function listDriverTrainingCentre(request: Request) {
  const context = await authenticate(request)
  const { data: appAccount, error: accountError } = await admin
    .from('driver_app_accounts')
    .select('driver_id')
    .eq('company_id', context.companyId)
    .eq('user_id', context.user.id)
    .maybeSingle()
  if (accountError) return apiError(500, 'Driver account could not be loaded')
  if (!appAccount?.driver_id) {
    return apiError(403, 'No Driver account is linked to this login', 'driver_account_missing')
  }

  const driverId = String(appAccount.driver_id)

  const [{ data: requirements }, { data: trainingRows }] = await Promise.all([
    admin
      .from('driver_requirements')
      .select('*')
      .eq('company_id', context.companyId)
      .eq('driver_id', driverId),
    admin
      .from('driver_training')
      .select('*')
      .eq('company_id', context.companyId)
      .eq('driver_id', driverId),
  ])

  const reqByKey = new Map<string, Row>()
  for (const row of requirements ?? []) {
    reqByKey.set(String((row as Row).definition_key), row as Row)
  }

  const trainByKey = new Map<string, Row>()
  for (const row of trainingRows ?? []) {
    trainByKey.set(String((row as Row).training_key), row as Row)
  }

  // Materialise admin requests/assignments into driver_training rows (Driver Training Centre).
  for (const [key, req] of reqByKey) {
    if (!TRAINING_COURSE_META[key]) continue
    const status = String(req.status_override ?? '')
    if (!VISIBLE_REQ_STATUSES.has(status) && !COMPLETE_REQ_STATUSES.has(status)) continue

    if (status === 'request_sent') {
      try {
        await admin
          .from('driver_requirements')
          .update({
            status_override: 'training_assigned',
            assigned_to_name: req.assigned_to_name ? String(req.assigned_to_name) : 'Training lead',
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', context.companyId)
          .eq('driver_id', driverId)
          .eq('definition_key', key)
      } catch {
        /* best-effort */
      }
    }

    const existing = trainByKey.get(key)
    const trainComplete =
      existing &&
      ['complete', 'completed'].includes(String(existing.status ?? '').toLowerCase())
    if (trainComplete) continue

    try {
      const created = await ensureTrainingAssignmentRow({
        companyId: context.companyId,
        driverId,
        trainingKey: key,
        userId: context.user.id,
        assignedByName: req.assigned_to_name ? String(req.assigned_to_name) : 'Training lead',
        dueAt: req.due_at ? String(req.due_at) : null,
      })
      if (created) trainByKey.set(key, created as Row)
    } catch (err) {
      console.error('listDriverTrainingCentre materialise', key, err)
    }
  }

  const assignments: Row[] = []
  const keys = new Set([...trainByKey.keys(), ...reqByKey.keys()])
  for (const key of keys) {
    if (!TRAINING_COURSE_META[key]) continue
    const req = reqByKey.get(key) ?? null
    const train = trainByKey.get(key)
    const reqStatus = req?.status_override ? String(req.status_override) : ''
    if (!train && !VISIBLE_REQ_STATUSES.has(reqStatus) && !COMPLETE_REQ_STATUSES.has(reqStatus)) {
      continue
    }
    if (!train) continue
    assignments.push(toAssignment(train, req))
  }

  assignments.sort((a, b) => urgencyRank(a) - urgencyRank(b))

  const open = assignments.filter((a) => !['completed', 'waived', 'superseded'].includes(String(a.status)))
  const completed = assignments.filter((a) => String(a.status) === 'completed')
  const overdue = open.filter((a) => String(a.warningStatus) === 'overdue')
  const dueSoon = open.filter((a) => ['due_soon', 'due_today'].includes(String(a.warningStatus)))
  const totalTracked = assignments.filter((a) => a.mandatory !== false).length || assignments.length
  const doneCount = completed.length
  const compliancePercent =
    totalTracked === 0 ? 100 : Math.round((doneCount / Math.max(totalTracked, 1)) * 100)

  const nextDue = open
    .map((a) => a.dueAt)
    .filter(Boolean)
    .map(String)
    .sort()[0] ?? null

  const urgent = open.find((a) => urgencyRank(a) <= 5) ?? null

  return json({
    driverId,
    summary: {
      compliancePercent,
      requiredOpen: open.filter((a) => a.mandatory !== false).length,
      dueSoon: dueSoon.length,
      overdue: overdue.length,
      nextDeadline: nextDue,
      statusLabel:
        overdue.length > 0
          ? 'Action required'
          : dueSoon.length > 0
            ? 'Due soon'
            : open.length > 0
              ? 'Training in progress'
              : 'Up to date',
    },
    urgent,
    assignments,
  })
}

export async function updateDriverTrainingProgress(request: Request) {
  const context = await authenticate(request)
  const { data: appAccount, error: accountError } = await admin
    .from('driver_app_accounts')
    .select('driver_id')
    .eq('company_id', context.companyId)
    .eq('user_id', context.user.id)
    .maybeSingle()
  if (accountError) return apiError(500, 'Driver account could not be loaded')
  if (!appAccount?.driver_id) {
    return apiError(403, 'No Driver account is linked to this login', 'driver_account_missing')
  }

  const driverId = String(appAccount.driver_id)
  const input = await readJson<Row>(request)
  const assignmentId = String(input.assignmentId ?? input.id ?? '')
  const courseId = String(input.courseId ?? input.trainingKey ?? '')
  const action = String(input.action ?? 'save_progress')
  const now = new Date().toISOString()

  let query = admin
    .from('driver_training')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)
  if (assignmentId && assignmentId.includes('-')) {
    query = query.eq('id', assignmentId)
  } else if (courseId) {
    query = query.eq('training_key', courseId)
  } else {
    return apiError(400, 'assignmentId or courseId is required')
  }

  const { data: existing, error: loadError } = await query.maybeSingle()
  if (loadError) return apiError(500, loadError.message)
  if (!existing) return apiError(404, 'Training assignment not found', 'not_found')

  const trainingKey = String(existing.training_key)
  const meta = TRAINING_COURSE_META[trainingKey]
  const lessonProgress =
    existing.lesson_progress && typeof existing.lesson_progress === 'object'
      ? { ...(existing.lesson_progress as Row) }
      : {}

  const patch: Row = {
    updated_at: now,
    updated_by: context.user.id,
  }

  if (action === 'save_progress' || action === 'complete_lesson') {
    const lessonId = String(input.lessonId ?? '')
    if (lessonId) {
      const prev = (lessonProgress[lessonId] as Row | undefined) ?? {}
      lessonProgress[lessonId] = {
        ...prev,
        ...(input.lessonPayload && typeof input.lessonPayload === 'object'
          ? (input.lessonPayload as Row)
          : {}),
        completedAt:
          action === 'complete_lesson'
            ? now
            : prev.completedAt ?? null,
        acknowledgedAt: input.acknowledged ? now : prev.acknowledgedAt ?? null,
        updatedAt: now,
      }
    }
    const totalLessons = Number(input.totalLessons ?? 0)
    const completedLessons = Object.values(lessonProgress).filter(
      (v) => v && typeof v === 'object' && (v as Row).completedAt,
    ).length
    const progressPercentage =
      totalLessons > 0
        ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
        : Number(input.progressPercentage ?? existing.progress_percentage ?? 0)

    patch.lesson_progress = lessonProgress
    patch.progress_percentage = progressPercentage
    patch.status = progressPercentage >= 100 ? 'assessment_required' : 'in_progress'
    if (!existing.started_at) patch.started_at = now

    await admin
      .from('driver_requirements')
      .update({
        status_override: 'in_progress',
        updated_at: now,
        updated_by: context.user.id,
      })
      .eq('company_id', context.companyId)
      .eq('driver_id', driverId)
      .eq('definition_key', trainingKey)
  } else if (action === 'complete_declaration' || action === 'complete') {
    const completedAt = now.slice(0, 10)
    const expiresAt = defaultExpiry(trainingKey, completedAt)
    patch.status = 'complete'
    patch.progress_percentage = 100
    patch.completed_at = completedAt
    patch.expires_at = expiresAt
    patch.declaration_at = now
    if (input.assessmentScore != null) patch.assessment_score = Number(input.assessmentScore)
    if (!existing.started_at) patch.started_at = now

    await admin
      .from('driver_requirements')
      .update({
        status_override: 'approved',
        updated_at: now,
        updated_by: context.user.id,
      })
      .eq('company_id', context.companyId)
      .eq('driver_id', driverId)
      .eq('definition_key', trainingKey)

    const { data: driver } = await admin
      .from('drivers')
      .select('staff_members(first_name, last_name)')
      .eq('id', driverId)
      .maybeSingle()
    const staff = (driver?.staff_members as Row | null) ?? null
    const driverName =
      [staff?.first_name, staff?.last_name].filter(Boolean).join(' ').trim() || 'Driver'

    await notifyCompanyAdmins({
      companyId: context.companyId,
      type: DRIVER_ONBOARDING_NOTIFICATION.trainingCompleted,
      title: 'Driver training completed',
      body: `${driverName} completed ${meta?.label ?? trainingKey}.`,
      severity: 'info',
      actionUrl: `/drivers/${driverId}?tab=Eligibility`,
      sourceEntityId: driverId,
    })
  } else if (action === 'start') {
    patch.status = 'in_progress'
    if (!existing.started_at) patch.started_at = now
    await admin
      .from('driver_requirements')
      .update({
        status_override: 'in_progress',
        opened_at: now,
        updated_at: now,
        updated_by: context.user.id,
      })
      .eq('company_id', context.companyId)
      .eq('driver_id', driverId)
      .eq('definition_key', trainingKey)
  } else {
    return apiError(400, 'Unknown action')
  }

  const { data: updated, error: updateError } = await admin
    .from('driver_training')
    .update(patch)
    .eq('id', existing.id)
    .select('*')
    .maybeSingle()

  let finalRow = updated
  if (
    updateError &&
    /progress_percentage|lesson_progress|started_at|declaration_at|assessment_score|eligibility_effect/i.test(
      updateError.message,
    )
  ) {
    const basicPatch: Row = {
      status: patch.status ?? existing.status,
      completed_at: patch.completed_at ?? existing.completed_at,
      expires_at: patch.expires_at ?? existing.expires_at,
      updated_at: now,
      updated_by: context.user.id,
    }
    const retry = await admin
      .from('driver_training')
      .update(basicPatch)
      .eq('id', existing.id)
      .select('*')
      .maybeSingle()
    if (retry.error) return apiError(400, retry.error.message)
    finalRow = retry.data
  } else if (updateError) {
    return apiError(400, updateError.message)
  }

  const { data: req } = await admin
    .from('driver_requirements')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)
    .eq('definition_key', trainingKey)
    .maybeSingle()

  return json(toAssignment(finalRow as Row, (req as Row) ?? null))
}

export async function notifyDriverTrainingAssigned(input: {
  companyId: string
  driverId: string
  label: string
  dueAt?: string | null
}) {
  await notifyDriverAppUser({
    companyId: input.companyId,
    driverId: input.driverId,
    type: DRIVER_ONBOARDING_NOTIFICATION.trainingAssigned,
    title: 'Training assigned',
    body: input.dueAt
      ? `${input.label} has been assigned. Due ${input.dueAt}.`
      : `${input.label} has been assigned. Open Training Centre to start.`,
    severity: 'attention',
    actionUrl: '/training',
    sourceEntityId: input.driverId,
  })
}
