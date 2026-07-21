/** Driver activation requirements — request, resend, assign, waive, history. */
import { admin, authenticate } from './supabase.ts'
import { apiError, json, readJson } from './http.ts'
import {
  DRIVER_ONBOARDING_NOTIFICATION,
  notifyCompanyAdmins,
  notifyDriverAppUser,
} from './notifications.ts'
import {
  ensureTrainingAssignmentRow,
  notifyDriverTrainingAssigned,
  TRAINING_COURSE_META,
} from './driver-training-centre.ts'

type Row = Record<string, unknown>

const TRAINING_KEYS = new Set([
  'company_induction',
  'driver_app',
  'daily_vehicle_checks',
  'health_safety',
  'emergency_procedures',
  'manual_handling',
  'midas_standard',
  'safeguarding_adults',
  'first_aid_efaw',
  'midas_accessible',
  'wheelchair_restraint',
  'lift_ramp_operation',
  'safeguarding_children',
  'send_autism_awareness',
  'behaviour_management',
  'infection_prevention',
  'dementia_awareness',
  'driver_cpc',
])

const QUALIFICATION_KEYS = new Set([
  'midas_standard',
  'midas_accessible',
  'first_aid_efaw',
  'driver_cpc',
])

function requirementTypeFor(key: string): string {
  if (key === 'app_account') return 'account_setup'
  if (QUALIFICATION_KEYS.has(key)) return 'qualification'
  if (TRAINING_KEYS.has(key)) return 'internal_training'
  return 'document'
}

/** Maps driver_documents.requirement_type to driver_requirements.definition_key. */
export function definitionKeyForDocumentRequirementType(requirementType: string): string {
  const aliases: Record<string, string> = {
    licence_front: 'driving_licence',
    licence_back: 'driving_licence',
    dvla_check: 'driving_licence',
    dqc_front: 'dqc',
    dqc_back: 'dqc',
    dqc_cpc: 'dqc',
    cpc: 'dqc',
  }
  return aliases[requirementType] ?? requirementType
}

async function applyRequirementRequest(input: {
  companyId: string
  driverId: string
  userId: string
  definitionKey: string
  channels: string[]
  dueAt: string | null
  message: string | null
  actorName: string
  mode: 'request' | 'resend'
}) {
  const now = new Date()
  const req = await ensureRequirement(input.companyId, input.driverId, input.definitionKey, input.userId)
  const isReminder = input.mode === 'resend' || Number(req.request_count ?? 0) > 0
  const reqType = requirementTypeFor(input.definitionKey)
  const label =
    TRAINING_COURSE_META[input.definitionKey]?.label ??
    input.definitionKey.replace(/_/g, ' ')

  const patch: Row = {
    last_requested_at: now.toISOString(),
    last_requested_by: input.userId,
    last_requested_channels: input.channels,
    request_count: Number(req.request_count ?? 0) + 1,
    due_at: input.dueAt,
    updated_at: now.toISOString(),
    updated_by: input.userId,
  }
  if (isReminder) {
    patch.reminder_count = Number(req.reminder_count ?? 0) + 1
    patch.last_reminder_at = now.toISOString()
  }

  // Internal training → Training Centre (not onboarding document upload).
  if (reqType === 'internal_training' && TRAINING_COURSE_META[input.definitionKey]) {
    patch.status_override = 'training_assigned'
    patch.assigned_to_name = input.actorName

    const { error: updateError } = await admin.from('driver_requirements').update(patch).eq('id', req.id)
    if (updateError) throw new Error(updateError.message)

    const { error: historyError } = await admin.from('driver_requirement_requests').insert({
      company_id: input.companyId,
      driver_id: input.driverId,
      requirement_id: req.id,
      definition_key: input.definitionKey,
      requested_by: input.userId,
      requested_by_name: input.actorName,
      channels: input.channels,
      status: 'sent',
      message: input.message,
      due_at: input.dueAt,
      sent_at: now.toISOString(),
      delivered_at: now.toISOString(),
      reminder_count: isReminder ? 1 : 0,
      last_reminder_at: isReminder ? now.toISOString() : null,
    })
    if (historyError) throw new Error(historyError.message)

    try {
      await ensureTrainingAssignmentRow({
        companyId: input.companyId,
        driverId: input.driverId,
        trainingKey: input.definitionKey,
        userId: input.userId,
        assignedByName: input.actorName,
        dueAt: input.dueAt,
      })
      await notifyDriverTrainingAssigned({
        companyId: input.companyId,
        driverId: input.driverId,
        label,
        dueAt: input.dueAt,
      })
    } catch (err) {
      console.error('training request materialise failed', err)
    }
    return
  }

  patch.status_override = 'request_sent'

  const { error: updateError } = await admin.from('driver_requirements').update(patch).eq('id', req.id)
  if (updateError) throw new Error(updateError.message)

  const { error: historyError } = await admin.from('driver_requirement_requests').insert({
    company_id: input.companyId,
    driver_id: input.driverId,
    requirement_id: req.id,
    definition_key: input.definitionKey,
    requested_by: input.userId,
    requested_by_name: input.actorName,
    channels: input.channels,
    status: 'sent',
    message: input.message,
    due_at: input.dueAt,
    sent_at: now.toISOString(),
    delivered_at: now.toISOString(),
    reminder_count: isReminder ? 1 : 0,
    last_reminder_at: isReminder ? now.toISOString() : null,
  })
  if (historyError) throw new Error(historyError.message)

  const actionUrl = reqType === 'account_setup' ? '/onboarding' : '/documents'
  const title = isReminder
    ? `Reminder: ${label}`
    : reqType === 'qualification'
      ? `Certificate required: ${label}`
      : `Upload required: ${label}`
  const defaultBody =
    reqType === 'qualification'
      ? 'Upload your certificate in Documents in the Driver app, or complete company training if your operator arranged it.'
      : 'Open Documents in the Driver app and upload what your operator requested.'

  try {
    await notifyDriverAppUser({
      companyId: input.companyId,
      driverId: input.driverId,
      type: isReminder
        ? DRIVER_ONBOARDING_NOTIFICATION.reminderSent
        : DRIVER_ONBOARDING_NOTIFICATION.requestSent,
      title,
      body: input.message ?? defaultBody,
      severity: 'attention',
      actionUrl,
    })
  } catch (err) {
    console.error('document request notify failed', err)
  }
}

export async function syncDriverRequirementAfterDocumentVerified(input: {
  companyId: string
  driverId: string
  userId: string
  requirementType: string
}) {
  const definitionKey = definitionKeyForDocumentRequirementType(input.requirementType)
  const req = await ensureRequirement(input.companyId, input.driverId, definitionKey, input.userId)
  const now = new Date().toISOString()
  await admin
    .from('driver_requirements')
    .update({
      status_override: 'approved',
      rejection_reason: null,
      updated_at: now,
      updated_by: input.userId,
    })
    .eq('id', req.id)
}

export async function syncDriverRequirementAfterDocumentRejected(input: {
  companyId: string
  driverId: string
  userId: string
  requirementType: string
  label: string
  reason: string
  actorName: string
  requestResubmit: boolean
}) {
  const definitionKey = definitionKeyForDocumentRequirementType(input.requirementType)
  const req = await ensureRequirement(input.companyId, input.driverId, definitionKey, input.userId)
  const now = new Date().toISOString()
  await admin
    .from('driver_requirements')
    .update({
      status_override: 'rejected',
      rejection_reason: input.reason,
      updated_at: now,
      updated_by: input.userId,
    })
    .eq('id', req.id)

  const docLabel = input.label.trim() || definitionKey.replace(/_/g, ' ')
  await notifyDriverAppUser({
    companyId: input.companyId,
    driverId: input.driverId,
    type: DRIVER_ONBOARDING_NOTIFICATION.evidenceRejected,
    title: `${docLabel} was declined`,
    body: input.reason,
    severity: 'attention',
    actionUrl: '/onboarding',
  })

  if (input.requestResubmit) {
    await applyRequirementRequest({
      companyId: input.companyId,
      driverId: input.driverId,
      userId: input.userId,
      definitionKey,
      channels: ['in_app', 'email'],
      dueAt: null,
      message: input.reason,
      actorName: input.actorName,
      mode: 'resend',
    })
  }
}

function toCamelState(row: Row) {
  return {
    id: row.id,
    definitionKey: row.definition_key,
    requirementType: row.requirement_type,
    statusOverride: row.status_override ?? null,
    assignedToName: row.assigned_to_name ?? null,
    dueAt: row.due_at ?? null,
    lastRequestedAt: row.last_requested_at ?? null,
    lastRequestedChannels: row.last_requested_channels ?? [],
    openedAt: row.opened_at ?? null,
    requestCount: row.request_count ?? 0,
    reminderCount: row.reminder_count ?? 0,
    lastReminderAt: row.last_reminder_at ?? null,
    rejectionReason: row.rejection_reason ?? null,
    internalNote: row.internal_note ?? null,
    updatedAt: row.updated_at ?? null,
  }
}

async function ensureRequirement(
  companyId: string,
  driverId: string,
  definitionKey: string,
  userId: string | null,
) {
  const { data: existing } = await admin
    .from('driver_requirements')
    .select('*')
    .eq('company_id', companyId)
    .eq('driver_id', driverId)
    .eq('definition_key', definitionKey)
    .maybeSingle()
  if (existing) return existing as Row

  const { data, error } = await admin
    .from('driver_requirements')
    .insert({
      company_id: companyId,
      driver_id: driverId,
      definition_key: definitionKey,
      requirement_type: requirementTypeFor(definitionKey),
      created_by: userId,
      updated_by: userId,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Row
}

async function assertDriver(companyId: string, driverId: string) {
  const { data, error } = await admin
    .from('drivers')
    .select('id, staff_members(first_name, last_name)')
    .eq('company_id', companyId)
    .eq('id', driverId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const staff = (data.staff_members as Row | Row[] | null) ?? null
  const staffRow = Array.isArray(staff) ? staff[0] ?? null : staff
  return {
    id: data.id,
    first_name: staffRow?.first_name ?? null,
    last_name: staffRow?.last_name ?? null,
  } as Row
}

export async function listDriverRequirements(request: Request, driverId: string) {
  const context = await authenticate(request)
  const driver = await assertDriver(context.companyId, driverId)
  if (!driver) return apiError(404, 'Driver not found', 'not_found')

  const { data, error } = await admin
    .from('driver_requirements')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)
    .order('updated_at', { ascending: false })
  if (error) return apiError(500, error.message)

  return json({
    driverId,
    requirements: (data ?? []).map((row) => toCamelState(row as Row)),
  })
}

export async function requestDriverRequirements(request: Request, driverId: string) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  let driver: Row | null
  try {
    driver = await assertDriver(context.companyId, driverId)
  } catch (err) {
    return apiError(500, err instanceof Error ? err.message : 'Driver could not be loaded')
  }
  if (!driver) return apiError(404, 'Driver not found', 'not_found')

  const keys = Array.isArray(input.definitionKeys)
    ? input.definitionKeys.map(String).filter(Boolean)
    : []
  if (keys.length === 0) return apiError(400, 'definitionKeys required')

  const channels = Array.isArray(input.channels)
    ? input.channels.map(String).filter(Boolean)
    : ['in_app', 'email']
  const dueAt = input.dueAt
    ? String(input.dueAt).slice(0, 10)
    : null
  const message = input.message ? String(input.message) : null
  const mode = String(input.mode ?? 'request')
  const minHours = Number(input.minHoursSinceLastRequest ?? 0)
  const now = new Date()
  const actorName = String(input.actorName ?? 'Admin')

  const applied: string[] = []
  const skipped: string[] = []

  for (const key of keys) {
    let req: Row
    try {
      req = await ensureRequirement(context.companyId, driverId, key, context.user.id)
    } catch (err) {
      return apiError(400, err instanceof Error ? err.message : `Could not create requirement ${key}`)
    }
    const lastAt = req.last_requested_at ? new Date(String(req.last_requested_at)) : null
    if (
      mode === 'resend' &&
      minHours > 0 &&
      lastAt &&
      now.getTime() - lastAt.getTime() < minHours * 3600_000
    ) {
      skipped.push(key)
      continue
    }

    try {
      await applyRequirementRequest({
        companyId: context.companyId,
        driverId,
        userId: context.user.id,
        definitionKey: key,
        channels,
        dueAt,
        message,
        actorName,
        mode: mode === 'resend' ? 'resend' : 'request',
      })
      applied.push(key)
    } catch (err) {
      return apiError(400, err instanceof Error ? err.message : 'Request failed')
    }
  }

  const { data: states } = await admin
    .from('driver_requirements')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)

  return json({
    driverId,
    sentAt: now.toISOString(),
    count: applied.length,
    skipped,
    requirements: (states ?? []).map((row) => toCamelState(row as Row)),
  })
}

export async function patchDriverRequirement(
  request: Request,
  driverId: string,
  definitionKey: string,
) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  let driver: Row | null
  try {
    driver = await assertDriver(context.companyId, driverId)
  } catch (err) {
    return apiError(500, err instanceof Error ? err.message : 'Driver could not be loaded')
  }
  if (!driver) return apiError(404, 'Driver not found', 'not_found')

  const req = await ensureRequirement(context.companyId, driverId, definitionKey, context.user.id)
  const action = String(input.action ?? '')
  const now = new Date().toISOString()
  const patch: Row = {
    updated_at: now,
    updated_by: context.user.id,
  }

  if (action === 'mark_not_applicable') {
    patch.status_override = 'not_applicable'
  } else if (action === 'waive') {
    patch.status_override = 'waived'
  } else if (action === 'assign_training') {
    patch.status_override = 'training_assigned'
    patch.assigned_to_name = String(input.trainer ?? input.actorName ?? 'Trainer')
    patch.due_at = input.deadline ? String(input.deadline) : req.due_at
  } else if (action === 'reject') {
    patch.status_override = 'rejected'
    patch.rejection_reason = String(input.reasonCode ?? input.reason ?? 'rejected')
    patch.due_at = input.deadline ? String(input.deadline) : req.due_at
    patch.internal_note = input.instructions ? String(input.instructions) : req.internal_note
  } else if (action === 'submit_evidence') {
    patch.status_override = 'submitted'
  } else if (action === 'approve') {
    patch.status_override = 'approved'
  } else if (action === 'note') {
    patch.internal_note = String(input.note ?? '')
  } else if (action === 'change_due_date') {
    patch.due_at = String(input.dueAt ?? '')
  } else if (action === 'request_training') {
    patch.status_override = 'request_sent'
    patch.internal_note = input.note ? String(input.note) : 'Driver requested company training'
  } else {
    return apiError(400, 'Unknown action')
  }

  const { error } = await admin.from('driver_requirements').update(patch).eq('id', req.id)
  if (error) return apiError(400, error.message)

  // Reject linked document evidence when a document requirement is rejected
  if (action === 'reject' && requirementTypeFor(definitionKey) === 'document') {
    await admin
      .from('driver_documents')
      .update({
        verification_status: 'rejected',
        rejection_reason: String(input.instructions ?? input.reasonCode ?? 'Rejected'),
        updated_at: now,
        updated_by: context.user.id,
      })
      .eq('company_id', context.companyId)
      .eq('driver_id', driverId)
      .eq('requirement_type', definitionKey)
  }

  await admin.from('driver_requirement_requests').insert({
    company_id: context.companyId,
    driver_id: driverId,
    requirement_id: req.id,
    definition_key: definitionKey,
    requested_by: context.user.id,
    requested_by_name: String(input.actorName ?? 'Admin'),
    channels: action === 'reject' || action === 'submit_evidence' ? ['in_app', 'email'] : [],
    status: action === 'reject' || action === 'submit_evidence' ? 'sent' : 'completed',
    message:
      action === 'reject'
        ? String(input.instructions ?? '')
        : action === 'submit_evidence'
          ? String(input.message ?? 'Evidence submitted for review')
          : `Action: ${action}`,
    due_at: patch.due_at ?? null,
    sent_at: now,
  })

  const driverName =
    [driver.first_name, driver.last_name].filter(Boolean).join(' ').trim() || 'Driver'
  const actionUrl = `/drivers/${driverId}?tab=Eligibility`
  const label = String(input.label ?? definitionKey.replace(/_/g, ' '))

  if (action === 'submit_evidence') {
    await notifyCompanyAdmins({
      companyId: context.companyId,
      type: DRIVER_ONBOARDING_NOTIFICATION.evidenceSubmitted,
      title: 'Driver evidence ready for review',
      body: `${driverName} uploaded ${label}. Submitted for admin review.`,
      severity: 'attention',
      actionUrl,
      sourceEntityId: driverId,
      excludeUserId: context.user.id,
    })
  } else if (action === 'reject') {
    // Driver-facing notification would go here; admins already performed the action.
  } else if (action === 'request_training') {
    await notifyCompanyAdmins({
      companyId: context.companyId,
      type: DRIVER_ONBOARDING_NOTIFICATION.trainingRequested,
      title: 'Driver requested training',
      body: `${driverName} asked for company training for ${label}.`,
      severity: 'attention',
      actionUrl,
      sourceEntityId: driverId,
      excludeUserId: context.user.id,
    })
  } else if (action === 'assign_training') {
    // Do not notify admins on assign — they initiated it. Create Training Centre row + notify driver.
    try {
      await ensureTrainingAssignmentRow({
        companyId: context.companyId,
        driverId,
        trainingKey: definitionKey,
        userId: context.user.id,
        assignedByName: String(input.trainer ?? input.actorName ?? 'Training lead'),
        dueAt: patch.due_at ? String(patch.due_at) : null,
      })
      await notifyDriverTrainingAssigned({
        companyId: context.companyId,
        driverId,
        label,
        dueAt: patch.due_at ? String(patch.due_at) : null,
      })
    } catch (err) {
      console.error('assign_training materialise failed', err)
    }
  } else if (action === 'approve' || action === 'waive' || action === 'mark_not_applicable') {
    const { data: open } = await admin
      .from('driver_requirements')
      .select('definition_key, status_override')
      .eq('company_id', context.companyId)
      .eq('driver_id', driverId)
    const blocking = (open ?? []).filter(
      (row) =>
        row.status_override &&
        !['approved', 'completed', 'waived', 'not_applicable', 'expiring_soon'].includes(
          String(row.status_override),
        ),
    )
    if (blocking.length === 0) {
      await notifyCompanyAdmins({
        companyId: context.companyId,
        type: DRIVER_ONBOARDING_NOTIFICATION.readyForActivation,
        title: 'Driver ready for activation',
        body: `${driverName} has completed all tracked onboarding requirements.`,
        severity: 'info',
        actionUrl,
        sourceEntityId: driverId,
      })
    } else if (action === 'approve') {
      await notifyCompanyAdmins({
        companyId: context.companyId,
        type: DRIVER_ONBOARDING_NOTIFICATION.evidenceApproved,
        title: 'Onboarding evidence approved',
        body: `${label} approved for ${driverName}.`,
        severity: 'info',
        actionUrl,
        sourceEntityId: driverId,
        excludeUserId: context.user.id,
      })
    }
  }

  const { data: refreshed } = await admin
    .from('driver_requirements')
    .select('*')
    .eq('id', req.id)
    .maybeSingle()

  return json({ requirement: refreshed ? toCamelState(refreshed as Row) : null })
}

export async function driverRequirementHistory(
  request: Request,
  driverId: string,
  definitionKey: string,
) {
  const context = await authenticate(request)
  const driver = await assertDriver(context.companyId, driverId)
  if (!driver) return apiError(404, 'Driver not found', 'not_found')

  const { data, error } = await admin
    .from('driver_requirement_requests')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)
    .eq('definition_key', definitionKey)
    .order('sent_at', { ascending: false })
    .limit(50)
  if (error) return apiError(500, error.message)

  return json({
    driverId,
    definitionKey,
    history: (data ?? []).map((row) => ({
      id: row.id,
      channels: row.channels ?? [],
      status: row.status,
      message: row.message,
      dueAt: row.due_at,
      sentAt: row.sent_at,
      openedAt: row.opened_at,
      requestedByName: row.requested_by_name,
      reminderCount: row.reminder_count ?? 0,
      lastReminderAt: row.last_reminder_at,
    })),
  })
}
