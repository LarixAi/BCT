/** Driver activation requirements — request, resend, assign, waive, history. */
import { admin, authenticate } from './supabase.ts'
import { apiError, json, readJson } from './http.ts'
import {
  DRIVER_ONBOARDING_NOTIFICATION,
  notifyCompanyAdmins,
} from './notifications.ts'

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
    .select('id, first_name, last_name')
    .eq('company_id', companyId)
    .eq('id', driverId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return data as Row
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
  const driver = await assertDriver(context.companyId, driverId)
  if (!driver) return apiError(404, 'Driver not found', 'not_found')

  const keys = Array.isArray(input.definitionKeys)
    ? input.definitionKeys.map(String).filter(Boolean)
    : []
  if (keys.length === 0) return apiError(400, 'definitionKeys required')

  const channels = Array.isArray(input.channels)
    ? input.channels.map(String).filter(Boolean)
    : ['in_app', 'email']
  const dueAt = input.dueAt ? String(input.dueAt) : null
  const message = input.message ? String(input.message) : null
  const mode = String(input.mode ?? 'request')
  const minHours = Number(input.minHoursSinceLastRequest ?? 0)
  const now = new Date()
  const actorName = String(input.actorName ?? 'Admin')

  const applied: string[] = []
  const skipped: string[] = []

  for (const key of keys) {
    const req = await ensureRequirement(context.companyId, driverId, key, context.user.id)
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

    const isReminder = mode === 'resend' || Number(req.request_count ?? 0) > 0
    const patch: Row = {
      last_requested_at: now.toISOString(),
      last_requested_by: context.user.id,
      last_requested_channels: channels,
      request_count: Number(req.request_count ?? 0) + 1,
      due_at: dueAt,
      status_override: 'request_sent',
      updated_at: now.toISOString(),
      updated_by: context.user.id,
    }
    if (isReminder) {
      patch.reminder_count = Number(req.reminder_count ?? 0) + 1
      patch.last_reminder_at = now.toISOString()
    }

    const { error: updateError } = await admin
      .from('driver_requirements')
      .update(patch)
      .eq('id', req.id)
    if (updateError) return apiError(400, updateError.message)

    await admin.from('driver_requirement_requests').insert({
      company_id: context.companyId,
      driver_id: driverId,
      requirement_id: req.id,
      definition_key: key,
      requested_by: context.user.id,
      requested_by_name: actorName,
      channels,
      status: 'sent',
      message,
      due_at: dueAt,
      sent_at: now.toISOString(),
      delivered_at: now.toISOString(),
      reminder_count: isReminder ? 1 : 0,
      last_reminder_at: isReminder ? now.toISOString() : null,
    })
    applied.push(key)
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
  const driver = await assertDriver(context.companyId, driverId)
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
    // Do not notify admins on assign — they initiated it.
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
