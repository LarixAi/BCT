/**
 * Gate 2 — vehicle reports Command API helpers.
 *
 * PROD-1 Batch 04 — authority declaration / bare-admin removal.
 * Not UserScopedDb / RLS cutover. Reads/writes still use company-scoped service-role
 * via companyScopedServiceDb; company_id filters remain defence-in-depth.
 */
import { type RequestContext } from './supabase.ts'
import { companyScopedServiceDb } from './db-authority.ts'
import { apiError, json, readJson, toCamelCase } from './http.ts'
import { emitDomainEvent } from './domain-events.ts'
import { writeImmutableAudit } from './audit-service.ts'

type Row = Record<string, unknown>

function reportsDb(context: RequestContext) {
  return companyScopedServiceDb(context, 'vehicle_reports')
}

function mapReport(row: Row, extras: { evidence?: Row[]; timeline?: Row[]; vehicle?: Row } = {}) {
  const vehicle = extras.vehicle ?? {}
  return toCamelCase({
    ...row,
    registration_number: vehicle.registration ?? row.registration_number ?? null,
    fleet_number: vehicle.fleet_number ?? null,
    depot_name: null,
    evidence: extras.evidence ?? [],
    timeline: extras.timeline ?? [],
    sla_status: 'ok',
    next_action: row.status === 'closed' ? 'None' : 'Review',
  })
}

export async function listVehicleReports(context: RequestContext, request: Request) {
  const url = new URL(request.url)
  const vehicleId = url.searchParams.get('vehicleId')
  let query = reportsDb(context)
    .from('vehicle_reports')
    .select('*')
    .eq('company_id', context.companyId)
    .order('reported_at', { ascending: false })
    .limit(100)
  if (vehicleId) query = query.eq('vehicle_id', vehicleId)

  const { data, error } = await query
  if (error) return apiError(500, error.message)

  const vehicleIds = [...new Set((data ?? []).map((r) => String(r.vehicle_id)))]
  const { data: vehicles } = vehicleIds.length
    ? await reportsDb(context).from('vehicles').select('id, registration, fleet_number').in('id', vehicleIds)
    : { data: [] as Row[] }
  const byId = new Map((vehicles ?? []).map((v) => [String(v.id), v]))

  return json((data ?? []).map((row) => mapReport(row, { vehicle: byId.get(String(row.vehicle_id)) })))
}

export async function getVehicleReport(context: RequestContext, reportId: string) {
  const { data, error } = await reportsDb(context)
    .from('vehicle_reports')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('id', reportId)
    .maybeSingle()
  if (error) return apiError(500, error.message)
  if (!data) return apiError(404, 'Vehicle report not found', 'not_found')

  const [{ data: evidence }, { data: timeline }, { data: vehicle }] = await Promise.all([
    reportsDb(context).from('vehicle_report_evidence').select('*').eq('report_id', reportId).eq('company_id', context.companyId),
    reportsDb(context)
      .from('vehicle_report_status_history')
      .select('*')
      .eq('report_id', reportId)
      .eq('company_id', context.companyId)
      .order('occurred_at', { ascending: true }),
    reportsDb(context)
      .from('vehicles')
      .select('id, registration, fleet_number')
      .eq('id', data.vehicle_id)
      .maybeSingle(),
  ])

  return json(
    mapReport(data, {
      evidence: evidence ?? [],
      timeline: timeline ?? [],
      vehicle: vehicle ?? undefined,
    }),
  )
}

export async function createVehicleReport(context: RequestContext, request: Request) {
  const input = await readJson<Row>(request)
  const vehicleId = String(input.vehicleId ?? '')
  if (!vehicleId || !input.reportType || !input.title || !input.description) {
    return apiError(400, 'vehicleId, reportType, title and description are required', 'invalid_input')
  }

  const { data: vehicle } = await reportsDb(context)
    .from('vehicles')
    .select('id, registration, fleet_number, depot_id, operational_status')
    .eq('company_id', context.companyId)
    .eq('id', vehicleId)
    .maybeSingle()
  if (!vehicle) return apiError(404, 'Vehicle not found', 'not_found')

  const reference = `VR-${Date.now().toString(36).toUpperCase()}`
  const { data, error } = await reportsDb(context)
    .from('vehicle_reports')
    .insert({
      company_id: context.companyId,
      depot_id: input.depotId ?? vehicle.depot_id ?? null,
      vehicle_id: vehicleId,
      reference,
      report_type: String(input.reportType),
      report_category: input.reportCategory ? String(input.reportCategory) : null,
      severity: String(input.severity ?? 'moderate'),
      stage: 'reported',
      status: 'awaiting_review',
      vehicle_operational_status: vehicle.operational_status ?? null,
      title: String(input.title),
      description: String(input.description),
      vehicle_area: input.vehicleArea ? String(input.vehicleArea) : null,
      reported_by: String(input.reportedBy ?? context.user.email ?? 'staff'),
      reported_by_role: String(input.reportedByRole ?? 'staff'),
      mileage: input.mileage ?? null,
      location: input.location ? String(input.location) : null,
      passengers_onboard: Boolean(input.passengersOnboard),
      safe_to_move: input.safeToMove ?? null,
      vor_required: Boolean(input.vorRequired),
      created_by: context.user.id,
      updated_by: context.user.id,
    })
    .select('*')
    .single()

  if (error || !data) return apiError(500, error?.message ?? 'Report could not be created')

  await reportsDb(context).from('vehicle_report_status_history').insert({
    company_id: context.companyId,
    report_id: data.id,
    action: 'reported',
    actor_name: String(input.reportedBy ?? context.user.email ?? 'staff'),
    detail: 'Report created',
  })

  await writeImmutableAudit({
    companyId: context.companyId,
    actorUserId: context.user.id,
    action: 'vehicle_report.created',
    entityType: 'vehicle_report',
    entityId: String(data.id),
    afterSnapshot: { reference, vehicleId },
  }).catch(() => undefined)

  await emitDomainEvent({
    companyId: context.companyId,
    eventType: 'vehicle_report.created',
    entityType: 'vehicle_report',
    entityId: String(data.id),
    actorUserId: context.user.id,
    payload: { vehicleId, reportType: input.reportType },
  }).catch(() => undefined)

  return json(mapReport(data, { vehicle }), 201)
}

export async function reviewVehicleReport(
  context: RequestContext,
  reportId: string,
  request: Request,
) {
  const input = await readJson<Row>(request)
  const { data: existing } = await reportsDb(context)
    .from('vehicle_reports')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('id', reportId)
    .maybeSingle()
  if (!existing) return apiError(404, 'Vehicle report not found', 'not_found')

  const patch: Row = {
    updated_at: new Date().toISOString(),
    updated_by: context.user.id,
  }
  if (input.status) patch.status = String(input.status)
  if (input.stage) patch.stage = String(input.stage)
  if (input.resolution !== undefined) patch.resolution = input.resolution
  if (input.rootCause !== undefined) patch.root_cause = input.rootCause
  if (input.assignedOwner !== undefined) patch.assigned_owner = input.assignedOwner
  if (String(input.status) === 'closed') {
    patch.closed_at = new Date().toISOString()
    patch.verified_by = String(input.verifiedBy ?? context.user.email ?? 'staff')
    patch.verified_at = new Date().toISOString()
  }

  const { data, error } = await reportsDb(context)
    .from('vehicle_reports')
    .update(patch)
    .eq('id', reportId)
    .eq('company_id', context.companyId)
    .select('*')
    .single()
  if (error || !data) return apiError(500, error?.message ?? 'Report could not be updated')

  await reportsDb(context).from('vehicle_report_status_history').insert({
    company_id: context.companyId,
    report_id: reportId,
    action: String(input.status ?? input.stage ?? 'reviewed'),
    actor_name: String(input.verifiedBy ?? context.user.email ?? 'staff'),
    detail: input.resolution ? String(input.resolution) : null,
  })

  await emitDomainEvent({
    companyId: context.companyId,
    eventType: 'vehicle_report.reviewed',
    entityType: 'vehicle_report',
    entityId: reportId,
    actorUserId: context.user.id,
    payload: { status: data.status, stage: data.stage },
  }).catch(() => undefined)

  return json(mapReport(data))
}

export async function vehicleReportsHub(context: RequestContext) {
  const { data, error } = await reportsDb(context)
    .from('vehicle_reports')
    .select('id, status, stage, severity, report_type, vehicle_id, title, reported_at')
    .eq('company_id', context.companyId)
    .order('reported_at', { ascending: false })
    .limit(200)
  if (error) return apiError(500, error.message)

  const rows = data ?? []
  const open = rows.filter((r) => String(r.status) !== 'closed')
  return json({
    openCount: open.length,
    criticalCount: open.filter((r) => String(r.severity) === 'critical').length,
    awaitingReview: open.filter((r) => String(r.status) === 'awaiting_review').length,
    recent: rows.slice(0, 20).map((r) => toCamelCase(r)),
  })
}
