/**
 * Body Condition Inspection — persistence, hub projections, and yard mutation handlers.
 */
import { admin } from './supabase.ts'
import { apiError, json } from './http.ts'

function buildDamageReference(year: number, caseSeq: number, observationSeq: number): string {
  return `BD-${year}-${String(caseSeq).padStart(5, '0')}-${String(observationSeq).padStart(2, '0')}`
}

type Row = Record<string, unknown>

type AuthContext = {
  companyId: string
  user: { id: string; email?: string | null }
}

async function writeAuditEvent(
  companyId: string,
  entityType: string,
  entityId: string,
  action: string,
  actor: AuthContext,
  actorName: string,
  previousValue?: unknown,
  newValue?: unknown,
  reason?: string,
) {
  try {
    await admin.from('body_condition_audit_events').insert({
      company_id: companyId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      actor_user_id: actor.user.id,
      actor_name: actorName,
      previous_value: previousValue ?? null,
      new_value: newValue ?? null,
      reason: reason ?? null,
    })
  } catch (error) {
    console.error('body condition audit write failed', error)
  }
}

async function nextInspectionReference(companyId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `BI-${year}-`
  const { count } = await admin
    .from('body_inspections')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .like('reference_number', `${prefix}%`)
  const seq = (count ?? 0) + 1
  return `${prefix}${String(seq).padStart(5, '0')}`
}

async function nextDamageCaseReference(companyId: string): Promise<{ ref: string; seq: number }> {
  const year = new Date().getFullYear()
  const { count } = await admin
    .from('vehicle_damage_cases')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
  const seq = (count ?? 0) + 1
  return { ref: buildDamageReference(year, seq, 1), seq }
}

async function assertVehicleInCompany(companyId: string, vehicleId: string) {
  const { data, error } = await admin
    .from('vehicles')
    .select('id, registration, primary_depot_id, operational_status')
    .eq('company_id', companyId)
    .eq('id', vehicleId)
    .maybeSingle()
  if (error || !data) return null
  return data as Row
}

/** Yard offline queue sends client inspection ids (insp_*) until remapped — resolve to server row. */
async function resolveBodyInspection(
  companyId: string,
  inspectionId: string,
  select = 'id, vehicle_id, company_id',
) {
  const { data: byId, error: byIdError } = await admin
    .from('body_inspections')
    .select(select)
    .eq('company_id', companyId)
    .eq('id', inspectionId)
    .maybeSingle()
  if (!byIdError && byId) return byId as Row

  const { data: byClient, error: byClientError } = await admin
    .from('body_inspections')
    .select(select)
    .eq('company_id', companyId)
    .eq('client_inspection_id', inspectionId)
    .maybeSingle()
  if (!byClientError && byClient) return byClient as Row
  return null
}

function mapSeverityToLegacy(severity: string): string {
  if (severity === 'critical') return 'safety_critical'
  if (severity === 'major' || severity === 'minor_operational') return 'operational'
  return 'cosmetic'
}

function mapLegacySeverity(severity: string): string {
  if (severity === 'safety_critical') return 'critical'
  if (severity === 'operational') return 'major'
  return 'cosmetic'
}

export async function startBodyInspectionMutation(
  context: AuthContext,
  payload: Row,
  actorName: string,
) {
  const vehicleId = String(payload.vehicleId ?? '')
  const clientInspectionId = payload.inspectionId ? String(payload.inspectionId) : null
  const inspectionType = String(payload.inspectionType ?? 'routine').replace(/-/g, '_')
  if (!vehicleId) return apiError(400, 'vehicleId is required')

  const vehicle = await assertVehicleInCompany(context.companyId, vehicleId)
  if (!vehicle) return apiError(404, 'Vehicle not found')

  if (clientInspectionId) {
    const { data: existing } = await admin
      .from('body_inspections')
      .select('id')
      .eq('company_id', context.companyId)
      .eq('client_inspection_id', clientInspectionId)
      .maybeSingle()
    if (existing) return json({ ok: true, serverId: String(existing.id) })
  }

  const referenceNumber = await nextInspectionReference(context.companyId)
  const now = new Date().toISOString()

  const { data, error } = await admin
    .from('body_inspections')
    .insert({
      company_id: context.companyId,
      depot_id: vehicle.primary_depot_id ?? null,
      vehicle_id: vehicleId,
      client_inspection_id: clientInspectionId,
      reference_number: referenceNumber,
      inspection_type: inspectionType,
      inspection_reason: payload.inspectionReason ? String(payload.inspectionReason) : inspectionType,
      status: 'in_progress',
      inspection_started_at: payload.startedAt ? String(payload.startedAt) : now,
      inspector_user_id: context.user.id,
      mileage: payload.mileage != null ? Number(payload.mileage) : null,
      parking_bay_label: payload.location ? String(payload.location) : null,
      source_app: 'YARD',
      created_by: context.user.id,
      updated_by: context.user.id,
    })
    .select('id')
    .single()

  if (error) {
    if (String(error.code) === '23505' && clientInspectionId) {
      const { data: dup } = await admin
        .from('body_inspections')
        .select('id')
        .eq('company_id', context.companyId)
        .eq('client_inspection_id', clientInspectionId)
        .maybeSingle()
      if (dup) return json({ ok: true, serverId: String(dup.id) })
    }
    return apiError(500, error.message, 'database_error')
  }

  const id = String((data as Row).id)
  await writeAuditEvent(context.companyId, 'body_inspection', id, 'started', context, actorName, null, {
    inspectionType,
    vehicleId,
  })
  return json({ ok: true, serverId: id })
}

export async function addBodyInspectionMediaMutation(
  context: AuthContext,
  payload: Row,
  actorName: string,
) {
  const inspectionId = String(payload.inspectionId ?? '')
  const mediaId = payload.mediaId ? String(payload.mediaId) : null
  if (!inspectionId) return apiError(400, 'inspectionId is required')

  const inspection = await resolveBodyInspection(context.companyId, inspectionId, 'id, vehicle_id, company_id')
  if (!inspection) return apiError(404, 'Inspection not found')
  const serverInspectionId = String(inspection.id)

  const media = (payload.media ?? payload) as Row
  const dataUrl = typeof media.dataUrl === 'string' ? media.dataUrl : null
  const checksum = typeof media.checksum === 'string' ? media.checksum : null
  const now = new Date().toISOString()

  const { data, error } = await admin
    .from('body_inspection_media')
    .insert({
      id: mediaId && /^[0-9a-f-]{36}$/i.test(mediaId) ? mediaId : undefined,
      company_id: context.companyId,
      inspection_id: serverInspectionId,
      vehicle_id: String(inspection.vehicle_id),
      media_type: String(media.mediaType ?? 'photo'),
      view_category: media.captureSlotId ? String(media.captureSlotId) : media.vehicleZoneId ? String(media.vehicleZoneId) : null,
      storage_key: dataUrl && dataUrl.length < 500 ? dataUrl : null,
      mime_type: dataUrl?.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
      checksum,
      captured_at: media.capturedAt ? String(media.capturedAt) : now,
      uploaded_at: now,
      captured_by_user_id: context.user.id,
      capture_source: media.offlineCapture ? 'offline_sync' : media.captureSource ? String(media.captureSource) : 'live_camera',
      metadata: {
        vehicleZoneId: media.vehicleZoneId ?? null,
        captureSlotId: media.captureSlotId ?? null,
        evidenceRole: media.evidenceRole ?? null,
        dataUrlPreview: dataUrl && dataUrl.length <= 120_000 ? dataUrl : null,
        thumbnailDataUrl: media.thumbnailDataUrl ?? null,
        qualityStatus: media.qualityStatus ?? 'accepted',
      },
    })
    .select('id')
    .single()

  if (error) return apiError(500, error.message, 'database_error')
  return json({ ok: true, serverId: String((data as Row).id) })
}

export async function completeBodyInspectionMutation(
  context: AuthContext,
  payload: Row,
  actorName: string,
) {
  const inspectionId = String(payload.inspectionId ?? '')
  if (!inspectionId) return apiError(400, 'inspectionId is required')

  const inspection = await resolveBodyInspection(
    context.companyId,
    inspectionId,
    'id, vehicle_id, status, inspection_type',
  )
  if (!inspection) return apiError(404, 'Inspection not found')
  const serverInspectionId = String(inspection.id)

  const now = new Date().toISOString()
  const awaitingApproval = payload.awaitingApproval === true || payload.status === 'awaiting_approval'
  const nextStatus = awaitingApproval ? 'awaiting_review' : 'submitted'
  const recommendedStatus = String(payload.recommendedVehicleStatus ?? 'good')

  const { error } = await admin
    .from('body_inspections')
    .update({
      status: nextStatus,
      inspection_submitted_at: now,
      inspection_completed_at: now,
      recommended_vehicle_status: recommendedStatus,
      overall_condition: payload.overallCondition ? String(payload.overallCondition) : null,
      notes: payload.notes ? String(payload.notes) : null,
      updated_at: now,
      updated_by: context.user.id,
    })
    .eq('id', serverInspectionId)
    .eq('company_id', context.companyId)

  if (error) return apiError(500, error.message, 'database_error')

  await writeAuditEvent(
    context.companyId,
    'body_inspection',
    serverInspectionId,
    'completed',
    context,
    actorName,
    { status: inspection.status },
    { status: nextStatus, recommendedStatus },
  )

  return json({ ok: true, serverId: serverInspectionId })
}

export async function approveBodyInspectionMutation(
  context: AuthContext,
  payload: Row,
  actorName: string,
) {
  const inspectionId = String(payload.inspectionId ?? '')
  if (!inspectionId) return apiError(400, 'inspectionId is required')

  const inspection = await resolveBodyInspection(
    context.companyId,
    inspectionId,
    'id, vehicle_id, recommended_vehicle_status',
  )
  if (!inspection) return apiError(404, 'Inspection not found')
  const serverInspectionId = String(inspection.id)

  const now = new Date().toISOString()
  const approvedStatus = String(payload.approvedVehicleStatus ?? inspection.recommended_vehicle_status ?? 'good')

  await admin
    .from('body_inspections')
    .update({
      status: 'approved',
      approved_vehicle_status: approvedStatus,
      reviewer_user_id: context.user.id,
      inspection_completed_at: now,
      updated_at: now,
      updated_by: context.user.id,
    })
    .eq('id', serverInspectionId)
    .eq('company_id', context.companyId)

  await admin.from('inspection_reviews').insert({
    company_id: context.companyId,
    inspection_id: serverInspectionId,
    reviewer_id: context.user.id,
    reviewer_name: actorName,
    review_decision: 'approved',
    vehicle_status_decision: approvedStatus,
    comments: payload.comments ? String(payload.comments) : null,
    reviewed_at: now,
  })

  if (approvedStatus === 'vor') {
    await admin
      .from('vehicles')
      .update({ operational_status: 'vor', updated_at: now })
      .eq('company_id', context.companyId)
      .eq('id', String(inspection.vehicle_id))
  }

  await writeAuditEvent(context.companyId, 'body_inspection', serverInspectionId, 'approved', context, actorName)
  return json({ ok: true, serverId: serverInspectionId })
}

export async function reportDamageMutation(context: AuthContext, payload: Row, actorName: string) {
  const vehicleId = String(payload.vehicleId ?? '')
  const inspectionId = String(payload.inspectionId ?? '')
  const zoneId = String(payload.zoneId ?? '')
  if (!vehicleId || !inspectionId) return apiError(400, 'vehicleId and inspectionId are required')

  const vehicle = await assertVehicleInCompany(context.companyId, vehicleId)
  if (!vehicle) return apiError(404, 'Vehicle not found')

  const inspection = await resolveBodyInspection(context.companyId, inspectionId, 'id')
  if (!inspection) return apiError(404, 'Inspection not found')
  const serverInspectionId = String(inspection.id)

  const severity = mapLegacySeverity(String(payload.severity ?? 'cosmetic'))
  const damageType = String(payload.damageType ?? 'scratch')
  const classification = String(payload.classification ?? 'new_separate')
  const isExisting = classification.includes('existing') || classification === 'same_unchanged'
  const now = new Date().toISOString()

  let damageCaseId = payload.damageCaseId ? String(payload.damageCaseId) : null
  let referenceNumber = ''

  if (!damageCaseId) {
    const { ref, seq } = await nextDamageCaseReference(context.companyId)
    referenceNumber = ref
    const { data: caseRow, error: caseError } = await admin
      .from('vehicle_damage_cases')
      .insert({
        company_id: context.companyId,
        vehicle_id: vehicleId,
        reference_number: referenceNumber,
        first_detected_inspection_id: serverInspectionId,
        first_detected_at: now,
        damage_type: damageType,
        vehicle_zone: zoneId || 'unknown',
        severity,
        description: payload.description ? String(payload.description) : null,
        status: 'provisional',
        is_existing_damage: isExisting,
        requires_investigation: severity === 'major' || severity === 'critical',
        requires_repair: severity === 'major' || severity === 'critical',
        vor_triggered: severity === 'critical',
        created_by: context.user.id,
        updated_by: context.user.id,
      })
      .select('id')
      .single()
    if (caseError) return apiError(500, caseError.message, 'database_error')
    damageCaseId = String((caseRow as Row).id)

    if (payload.diagramView && payload.xCoordinate != null && payload.yCoordinate != null) {
      await admin.from('vehicle_condition_markers').insert({
        company_id: context.companyId,
        damage_case_id: damageCaseId,
        diagram_view: String(payload.diagramView),
        zone_code: zoneId || 'unknown',
        x_coordinate: Number(payload.xCoordinate),
        y_coordinate: Number(payload.yCoordinate),
        width: payload.width != null ? Number(payload.width) : null,
        height: payload.height != null ? Number(payload.height) : null,
      })
    }
  }

  const { data: obs, error: obsError } = await admin
    .from('damage_observations')
    .insert({
      company_id: context.companyId,
      damage_case_id: damageCaseId,
      inspection_id: serverInspectionId,
      observation_type: 'sighting',
      condition_change: classification,
      severity_at_observation: severity,
      classification,
      notes: payload.description ? String(payload.description) : null,
      observed_by: context.user.id,
      observed_by_name: actorName,
      observed_at: now,
    })
    .select('id')
    .single()

  if (obsError) return apiError(500, obsError.message, 'database_error')

  if (severity === 'critical') {
    await admin
      .from('vehicles')
      .update({ operational_status: 'vor', updated_at: now })
      .eq('company_id', context.companyId)
      .eq('id', vehicleId)
    await admin
      .from('vehicle_damage_cases')
      .update({ vor_triggered: true, status: 'under_review', updated_at: now })
      .eq('id', damageCaseId)
  }

  await writeAuditEvent(context.companyId, 'damage_case', damageCaseId!, 'reported', context, actorName)
  return json({ ok: true, serverId: String((obs as Row).id), damageCaseId })
}

export async function reviewDamageMutation(context: AuthContext, payload: Row, actorName: string) {
  const observationId = String(payload.observationId ?? '')
  const decision = String(payload.decision ?? payload.classification ?? '')
  if (!observationId) return apiError(400, 'observationId is required')

  const { data: observation, error: loadError } = await admin
    .from('damage_observations')
    .select('id, damage_case_id, inspection_id, classification')
    .eq('company_id', context.companyId)
    .eq('id', observationId)
    .maybeSingle()
  if (loadError || !observation) return apiError(404, 'Observation not found')

  const now = new Date().toISOString()
  const caseStatus =
    decision.includes('existing') ? 'confirmed_existing' : decision.includes('new') ? 'confirmed_new' : 'under_review'

  await admin
    .from('damage_observations')
    .update({
      classification: decision,
      notes: payload.notes ? String(payload.notes) : null,
    })
    .eq('id', observationId)

  await admin
    .from('vehicle_damage_cases')
    .update({
      status: caseStatus,
      updated_at: now,
      updated_by: context.user.id,
    })
    .eq('id', String(observation.damage_case_id))

  await writeAuditEvent(
    context.companyId,
    'damage_observation',
    observationId,
    'reviewed',
    context,
    actorName,
    { classification: observation.classification },
    { classification: decision, caseStatus },
    payload.reason ? String(payload.reason) : undefined,
  )

  return json({ ok: true, serverId: observationId })
}

export async function requestRepairMutation(context: AuthContext, payload: Row, actorName: string) {
  const damageCaseId = String(payload.damageCaseId ?? payload.damageId ?? '')
  if (!damageCaseId) return apiError(400, 'damageCaseId is required')

  const workOrderRef = `WO-BC-${Date.now()}`
  const now = new Date().toISOString()

  const { error } = await admin
    .from('vehicle_damage_cases')
    .update({
      status: 'approved_for_repair',
      repair_work_order_id: workOrderRef,
      requires_repair: true,
      updated_at: now,
      updated_by: context.user.id,
    })
    .eq('company_id', context.companyId)
    .eq('id', damageCaseId)

  if (error) return apiError(500, error.message, 'database_error')
  await writeAuditEvent(context.companyId, 'damage_case', damageCaseId, 'repair_requested', context, actorName)
  return json({ ok: true, serverId: workOrderRef, damageCaseId })
}

export async function markVorFromDamageMutation(context: AuthContext, payload: Row, actorName: string) {
  const vehicleId = String(payload.vehicleId ?? '')
  const reason = String(payload.reason ?? 'Body condition — critical damage')
  if (!vehicleId) return apiError(400, 'vehicleId is required')

  const vehicle = await assertVehicleInCompany(context.companyId, vehicleId)
  if (!vehicle) return apiError(404, 'Vehicle not found')

  const now = new Date().toISOString()
  await admin
    .from('vehicles')
    .update({ operational_status: 'vor', updated_at: now })
    .eq('company_id', context.companyId)
    .eq('id', vehicleId)

  const { data: vorCase } = await admin
    .from('vor_cases')
    .insert({
      company_id: context.companyId,
      vehicle_id: vehicleId,
      status: 'active',
      reason_code: 'body_condition',
      source_inspection_id: payload.inspectionId ? String(payload.inspectionId) : null,
      declared_by: context.user.id,
      declared_at: now,
      physical_location: payload.location ? String(payload.location) : null,
      source_app: 'YARD',
      created_by: context.user.id,
      updated_by: context.user.id,
    })
    .select('id')
    .single()

  await writeAuditEvent(context.companyId, 'vehicle', vehicleId, 'marked_vor', context, actorName, null, {
    reason,
    vorCaseId: vorCase?.id,
  })
  return json({ ok: true, serverId: vorCase?.id ? String(vorCase.id) : vehicleId })
}

export async function submitConditionAcknowledgement(
  context: AuthContext,
  payload: Row,
  actorName: string,
) {
  const vehicleId = String(payload.vehicleId ?? '')
  const acknowledgementType = String(payload.acknowledgementType ?? '')
  if (!vehicleId || !acknowledgementType) {
    return apiError(400, 'vehicleId and acknowledgementType are required')
  }

  const vehicle = await assertVehicleInCompany(context.companyId, vehicleId)
  if (!vehicle) return apiError(404, 'Vehicle not found')

  const now = new Date().toISOString()
  const differs = ['condition_differs', 'new_damage_found'].includes(acknowledgementType)

  const { data, error } = await admin
    .from('condition_acknowledgements')
    .insert({
      company_id: context.companyId,
      vehicle_id: vehicleId,
      inspection_id: payload.inspectionId ? String(payload.inspectionId) : null,
      assignment_id: payload.assignmentId ? String(payload.assignmentId) : null,
      driver_id: payload.driverId ? String(payload.driverId) : null,
      acknowledgement_type: acknowledgementType,
      acknowledged_at: now,
      condition_difference_reported: differs,
      driver_statement: payload.statement ? String(payload.statement) : null,
      signature_method: payload.signatureMethod ? String(payload.signatureMethod) : 'app_confirm',
      device_id: payload.deviceId ? String(payload.deviceId) : null,
      created_by: context.user.id,
    })
    .select('id')
    .single()

  if (error) return apiError(500, error.message, 'database_error')

  if (differs && payload.createProvisionalReport !== false) {
    const inspectionType = 'reported_damage'
    const referenceNumber = await nextInspectionReference(context.companyId)
    const { data: insp } = await admin
      .from('body_inspections')
      .insert({
        company_id: context.companyId,
        depot_id: vehicle.primary_depot_id ?? null,
        vehicle_id: vehicleId,
        reference_number: referenceNumber,
        inspection_type: inspectionType,
        inspection_reason: 'driver_handover_difference',
        status: 'awaiting_review',
        inspection_started_at: now,
        inspection_submitted_at: now,
        inspector_user_id: context.user.id,
        driver_id: payload.driverId ? String(payload.driverId) : null,
        notes: payload.statement ? String(payload.statement) : 'Driver reported condition difference at handover',
        source_app: 'DRIVER',
        created_by: context.user.id,
        updated_by: context.user.id,
      })
      .select('id')
      .single()

    if (insp?.id) {
      await admin
        .from('condition_acknowledgements')
        .update({ inspection_id: String(insp.id) })
        .eq('id', String((data as Row).id))
    }
  }

  return json({ ok: true, serverId: String((data as Row).id) })
}

export async function applyBodyConditionYardMutation(
  type: string,
  context: AuthContext,
  payload: Row,
  actorName: string,
) {
  switch (type) {
    case 'inspection.start':
      return startBodyInspectionMutation(context, payload, actorName)
    case 'inspection.media':
      return addBodyInspectionMediaMutation(context, payload, actorName)
    case 'inspection.complete':
      return completeBodyInspectionMutation(context, payload, actorName)
    case 'inspection.approve':
      return approveBodyInspectionMutation(context, payload, actorName)
    case 'damage.report':
      return reportDamageMutation(context, payload, actorName)
    case 'damage.review':
      return reviewDamageMutation(context, payload, actorName)
    case 'repair.request':
      return requestRepairMutation(context, payload, actorName)
    case 'vehicle.mark_vor':
      return markVorFromDamageMutation(context, payload, actorName)
    default:
      return null
  }
}

function projectInspection(row: Row) {
  return {
    id: String(row.id),
    vehicleId: String(row.vehicle_id),
    inspectionType: String(row.inspection_type ?? 'routine').replace(/_/g, '-'),
    sourceApp: String(row.source_app ?? 'yard').toLowerCase(),
    status: String(row.status ?? 'draft').replace(/_/g, '-'),
    startedBy: row.inspector_user_id ? String(row.inspector_user_id) : 'Yard',
    startedAt: String(row.inspection_started_at ?? row.created_at),
    completedAt: row.inspection_completed_at ? String(row.inspection_completed_at) : undefined,
    approvedBy: row.reviewer_user_id ? String(row.reviewer_user_id) : undefined,
    approvedAt: row.inspection_completed_at ? String(row.inspection_completed_at) : undefined,
    mileage: row.mileage != null ? Number(row.mileage) : undefined,
    location: row.parking_bay_label ? String(row.parking_bay_label) : undefined,
    referenceNumber: String(row.reference_number ?? ''),
    recommendedVehicleStatus: row.recommended_vehicle_status ? String(row.recommended_vehicle_status) : undefined,
    approvedVehicleStatus: row.approved_vehicle_status ? String(row.approved_vehicle_status) : undefined,
  }
}

function projectDamageCase(row: Row) {
  return {
    id: String(row.id),
    vehicleId: String(row.vehicle_id),
    zoneId: String(row.vehicle_zone ?? 'unknown'),
    damageType: String(row.damage_type ?? 'other'),
    severity: mapSeverityToLegacy(String(row.severity ?? 'cosmetic')),
    status: String(row.status ?? 'provisional').replace(/_/g, '-'),
    origin: row.is_existing_damage ? 'existing_at_onboarding' : 'discovered_yard_check',
    title: `${String(row.damage_type ?? 'Damage')} — ${String(row.vehicle_zone ?? 'zone')}`,
    description: row.description ? String(row.description) : undefined,
    firstObservedAt: String(row.first_detected_at ?? row.created_at),
    firstObservationId: row.first_detected_inspection_id ? String(row.first_detected_inspection_id) : '',
    lastConfirmedAt: String(row.updated_at ?? row.first_detected_at),
    referenceNumber: String(row.reference_number ?? ''),
    repairWorkOrderId: row.repair_work_order_id ? String(row.repair_work_order_id) : undefined,
    vorTriggered: row.vor_triggered === true,
  }
}

function projectObservation(row: Row) {
  return {
    id: String(row.id),
    damageId: String(row.damage_case_id),
    inspectionId: String(row.inspection_id),
    vehicleId: '',
    zoneId: '',
    reportSource: 'yard_inspection',
    reportedBy: row.observed_by_name ? String(row.observed_by_name) : 'Yard',
    observedAt: String(row.observed_at),
    classification: String(row.classification ?? 'possible_new_review').replace(/_/g, '-'),
    severity: row.severity_at_observation ? mapSeverityToLegacy(String(row.severity_at_observation)) : undefined,
    description: row.notes ? String(row.notes) : undefined,
    mediaIds: [],
  }
}

function projectMedia(row: Row) {
  const meta = (row.metadata as Row | null) ?? {}
  const preview = typeof meta.dataUrlPreview === 'string' ? meta.dataUrlPreview : null
  const storageKey = row.storage_key ? String(row.storage_key) : null
  return {
    id: String(row.id),
    inspectionId: String(row.inspection_id),
    vehicleZoneId: meta.vehicleZoneId ? String(meta.vehicleZoneId) : undefined,
    captureSlotId: meta.captureSlotId ? String(meta.captureSlotId) : undefined,
    mediaType: String(row.media_type ?? 'photo'),
    dataUrl: preview ?? (storageKey?.startsWith('data:') ? storageKey : ''),
    thumbnailDataUrl: meta.thumbnailDataUrl ? String(meta.thumbnailDataUrl) : undefined,
    capturedAt: String(row.captured_at),
    uploadedAt: row.uploaded_at ? String(row.uploaded_at) : undefined,
    capturedBy: row.captured_by_user_id ? String(row.captured_by_user_id) : 'Yard',
    qualityStatus: meta.qualityStatus ? String(meta.qualityStatus) : 'accepted',
    offlineCapture: row.capture_source === 'offline_sync',
    evidenceRole: meta.evidenceRole ? String(meta.evidenceRole) : undefined,
    checksum: row.checksum ? String(row.checksum) : undefined,
  }
}

export async function loadBodyConditionForYardHub(companyId: string, depotId?: string | null) {
  try {
    let inspectionQuery = admin
      .from('body_inspections')
      .select('*')
      .eq('company_id', companyId)
      .order('inspection_started_at', { ascending: false })
      .limit(100)

    if (depotId) inspectionQuery = inspectionQuery.eq('depot_id', depotId)

    const [inspectionsRes, casesRes, observationsRes, mediaRes, ackRes] = await Promise.all([
      inspectionQuery,
      admin
        .from('vehicle_damage_cases')
        .select('*')
        .eq('company_id', companyId)
        .not('status', 'in', '("closed")')
        .order('first_detected_at', { ascending: false })
        .limit(80),
      admin
        .from('damage_observations')
        .select('*, vehicle_damage_cases!inner(vehicle_id, vehicle_zone)')
        .eq('company_id', companyId)
        .order('observed_at', { ascending: false })
        .limit(120),
      admin
        .from('body_inspection_media')
        .select('*')
        .eq('company_id', companyId)
        .is('withdrawn_at', null)
        .order('captured_at', { ascending: false })
        .limit(200),
      admin
        .from('condition_acknowledgements')
        .select('*')
        .eq('company_id', companyId)
        .order('acknowledged_at', { ascending: false })
        .limit(40),
    ])

    const inspections = (inspectionsRes.data ?? []).map(projectInspection)
    const damageCases = (casesRes.data ?? []).map(projectDamageCase)
    const damageObservations = (observationsRes.data ?? []).map((row: Row) => {
      const caseRow = (row.vehicle_damage_cases as Row | null) ?? {}
      const obs = projectObservation(row)
      obs.vehicleId = caseRow.vehicle_id ? String(caseRow.vehicle_id) : ''
      obs.zoneId = caseRow.vehicle_zone ? String(caseRow.vehicle_zone) : ''
      return obs
    })
    const inspectionMedia = (mediaRes.data ?? []).map(projectMedia)
    const acknowledgements = (ackRes.data ?? []).map((row: Row) => ({
      id: String(row.id),
      vehicleId: String(row.vehicle_id),
      inspectionId: row.inspection_id ? String(row.inspection_id) : undefined,
      driverId: row.driver_id ? String(row.driver_id) : undefined,
      acknowledgementType: String(row.acknowledgement_type),
      acknowledgedAt: String(row.acknowledged_at),
      conditionDifferenceReported: row.condition_difference_reported === true,
    }))

    return {
      inspections,
      damageRecords: damageCases,
      damageObservations,
      inspectionMedia,
      acknowledgements,
    }
  } catch (error) {
    console.error('loadBodyConditionForYardHub failed', error)
    return {
      inspections: [],
      damageRecords: [],
      damageObservations: [],
      inspectionMedia: [],
      acknowledgements: [],
    }
  }
}

export async function loadBodyConditionHub(companyId: string, depotId?: string | null) {
  const data = await loadBodyConditionForYardHub(companyId, depotId)
  const openCases = data.damageRecords.filter((c) => !['closed', 'repaired'].includes(c.status))
  const critical = openCases.filter((c) => c.severity === 'safety_critical')
  const awaitingReview = data.inspections.filter((i) =>
    ['awaiting-review', 'submitted', 'awaiting_review'].includes(i.status),
  )
  const vorVehicles = new Set(
    openCases.filter((c) => c.vorTriggered).map((c) => c.vehicleId),
  )

  const zoneCounts: Record<string, number> = {}
  for (const c of openCases) {
    zoneCounts[c.zoneId] = (zoneCounts[c.zoneId] ?? 0) + 1
  }
  const repeatZones = Object.entries(zoneCounts)
    .filter(([, n]) => n >= 2)
    .map(([zone]) => zone)

  return {
    operationalDate: new Date().toISOString().slice(0, 10),
    summary: {
      openDamageCases: openCases.length,
      criticalDamage: critical.length,
      awaitingReview: awaitingReview.length,
      vehiclesVor: vorVehicles.size,
      repeatZoneAlerts: repeatZones.length,
      inspectionsThisMonth: data.inspections.length,
      pendingAcknowledgements: data.acknowledgements.filter((a) => a.conditionDifferenceReported).length,
    },
    inspections: data.inspections,
    damageCases: data.damageRecords,
    observations: data.damageObservations,
    repeatZones,
    trendAlerts: repeatZones.map((zone) => ({
      id: `trend-${zone}`,
      severity: 'attention',
      title: `Repeated damage in ${zone}`,
      detail: `${zoneCounts[zone]} open cases in the same zone — review manoeuvring procedures.`,
    })),
  }
}

export async function bodyConditionHubRoute(request: Request, authenticate: (req: Request) => Promise<AuthContext & Row>) {
  const context = await authenticate(request)
  const url = new URL(request.url)
  const depotId = url.searchParams.get('depotId')
  return json(await loadBodyConditionHub(context.companyId, depotId))
}

export async function driverConditionAcknowledgementRoute(
  request: Request,
  authenticate: (req: Request) => Promise<AuthContext & Row>,
) {
  const context = await authenticate(request)
  const payload = await request.json()
  const actorName = context.user.email ?? 'Driver'
  return submitConditionAcknowledgement(context, payload as Row, actorName)
}
