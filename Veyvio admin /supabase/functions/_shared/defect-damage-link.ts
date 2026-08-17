/**
 * Unifies operational `defects` with long-lived `vehicle_damage_cases` (Blueprint A §8.6).
 */
import { companyScopedServiceDbForCompany } from './db-authority.ts'

type Row = Record<string, unknown>

function damageLinkDb(companyId: string) {
  return companyScopedServiceDbForCompany(companyId, 'defect_damage_link')
}

function buildDamageReference(year: number, caseSeq: number, observationSeq: number): string {
  return `BD-${year}-${String(caseSeq).padStart(5, '0')}-${String(observationSeq).padStart(2, '0')}`
}

function mapDefectSeverityToDamageSeverity(severity: string): string {
  const normalized = String(severity ?? 'major').toLowerCase()
  if (normalized === 'critical' || normalized === 'dangerous') return 'critical'
  if (normalized === 'minor' || normalized === 'attention') return 'minor_operational'
  return 'major'
}

function isBodyworkDefectCategory(category: string): boolean {
  const value = category.toLowerCase()
  return value === 'bodywork' || value === 'driver_reported'
}

async function nextInspectionReference(companyId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `BI-${year}-`
  const { count } = await damageLinkDb(companyId)
    .from('body_inspections')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .like('reference_number', `${prefix}%`)
  const seq = (count ?? 0) + 1
  return `${prefix}${String(seq).padStart(5, '0')}`
}

async function nextDamageCaseReference(companyId: string): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await damageLinkDb(companyId)
    .from('vehicle_damage_cases')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
  const seq = (count ?? 0) + 1
  return buildDamageReference(year, seq, 1)
}

async function loadDefect(companyId: string, defectId: string): Promise<Row | null> {
  const { data, error } = await damageLinkDb(companyId)
    .from('defects')
    .select(
      'id, company_id, vehicle_id, defect_reference, category, component, severity, description, location_on_vehicle, reported_at, reported_by, created_by, evidence, damage_case_id',
    )
    .eq('company_id', companyId)
    .eq('id', defectId)
    .maybeSingle()
  if (error || !data) return null
  return data as Row
}

export async function linkBodyworkDefectToDamageCase(input: {
  companyId: string
  defectId: string
  driverId?: string | null
  userId?: string | null
  zone?: string | null
  damageType?: string | null
  severity?: string | null
}): Promise<{ damageCaseId: string | null; linked: boolean }> {
  const companyId = input.companyId
  const defect = await loadDefect(companyId, input.defectId)
  if (!defect) return { damageCaseId: null, linked: false }

  if (defect.damage_case_id) {
    return { damageCaseId: String(defect.damage_case_id), linked: false }
  }

  const category = String(defect.category ?? '')
  if (!isBodyworkDefectCategory(category)) {
    return { damageCaseId: null, linked: false }
  }

  const vehicleId = String(defect.vehicle_id ?? '')
  if (!vehicleId) return { damageCaseId: null, linked: false }

  const evidence = (defect.evidence as Row | null) ?? {}
  const zone = String(input.zone ?? defect.location_on_vehicle ?? evidence.zone ?? 'unknown')
  const damageType = String(input.damageType ?? defect.component ?? evidence.damageType ?? 'bodywork')
  const severity = mapDefectSeverityToDamageSeverity(String(input.severity ?? defect.severity ?? 'major'))
  const description = String(defect.description ?? 'Driver-reported bodywork damage')
  const actorUserId = input.userId
    ? String(input.userId)
    : defect.created_by
      ? String(defect.created_by)
      : defect.reported_by
        ? String(defect.reported_by)
        : null
  const reportedAt = String(defect.reported_at ?? new Date().toISOString())
  const clientInspectionId = `defect_${input.defectId}`

  let inspectionId: string | null = null
  const { data: existingInspection } = await damageLinkDb(companyId)
    .from('body_inspections')
    .select('id')
    .eq('company_id', input.companyId)
    .eq('client_inspection_id', clientInspectionId)
    .maybeSingle()
  if (existingInspection?.id) {
    inspectionId = String(existingInspection.id)
  } else {
    const inspectionRef = await nextInspectionReference(input.companyId)
    const { data: inspection, error: inspectionError } = await damageLinkDb(companyId)
      .from('body_inspections')
      .insert({
        company_id: input.companyId,
        vehicle_id: vehicleId,
        reference_number: inspectionRef,
        client_inspection_id: clientInspectionId,
        inspection_type: 'driver_bodywork_report',
        inspection_reason: 'Driver-reported bodywork damage',
        status: 'submitted',
        inspection_started_at: reportedAt,
        inspection_submitted_at: reportedAt,
        driver_id: input.driverId ?? null,
        source_app: 'DRIVER',
        notes: description.slice(0, 500),
        created_by: actorUserId,
        updated_by: actorUserId,
      })
      .select('id')
      .single()
    if (inspectionError || !inspection) {
      console.error('driver bodywork inspection create failed', inspectionError?.message)
      return { damageCaseId: null, linked: false }
    }
    inspectionId = String(inspection.id)
  }

  const { data: existingCase } = await damageLinkDb(companyId)
    .from('vehicle_damage_cases')
    .select('id')
    .eq('company_id', input.companyId)
    .eq('linked_defect_id', input.defectId)
    .maybeSingle()
  if (existingCase?.id) {
    await damageLinkDb(companyId)
      .from('defects')
      .update({ damage_case_id: existingCase.id, updated_at: new Date().toISOString() })
      .eq('company_id', input.companyId)
      .eq('id', input.defectId)
    return { damageCaseId: String(existingCase.id), linked: false }
  }

  const referenceNumber = await nextDamageCaseReference(input.companyId)
  const isCritical = severity === 'critical'
  const { data: damageCase, error: caseError } = await damageLinkDb(companyId)
    .from('vehicle_damage_cases')
    .insert({
      company_id: input.companyId,
      vehicle_id: vehicleId,
      reference_number: referenceNumber,
      linked_defect_id: input.defectId,
      first_detected_inspection_id: inspectionId,
      first_detected_at: reportedAt,
      damage_type: damageType,
      vehicle_zone: zone,
      severity,
      description,
      status: isCritical ? 'under_review' : 'provisional',
      requires_investigation: isCritical || severity === 'major',
      requires_repair: isCritical || severity === 'major',
      vor_triggered: isCritical,
      created_by: actorUserId,
      updated_by: actorUserId,
    })
    .select('id')
    .single()

  if (caseError || !damageCase) {
    console.error('vehicle_damage_cases create from defect failed', caseError?.message)
    return { damageCaseId: null, linked: false }
  }

  const damageCaseId = String(damageCase.id)

  await damageLinkDb(companyId).from('damage_observations').insert({
    company_id: input.companyId,
    damage_case_id: damageCaseId,
    inspection_id: inspectionId,
    observation_type: 'sighting',
    condition_change: 'new_separate',
    severity_at_observation: severity,
    classification: 'new_separate',
    notes: description,
    observed_by: actorUserId,
    observed_by_name: 'Driver',
    observed_at: reportedAt,
  })

  const photoDataUrl =
    typeof evidence.photoDataUrl === 'string' && evidence.photoDataUrl.startsWith('data:')
      ? evidence.photoDataUrl
      : null
  const photoPath = evidence.photoPath ? String(evidence.photoPath) : null
  if (photoDataUrl || photoPath) {
    await damageLinkDb(companyId).from('body_inspection_media').insert({
      company_id: input.companyId,
      inspection_id: inspectionId,
      vehicle_id: vehicleId,
      damage_case_id: damageCaseId,
      media_type: 'photo',
      view_category: zone,
      storage_key: photoPath ?? `defect:${input.defectId}`,
      capture_source: 'offline_sync',
      captured_at: reportedAt,
      captured_by_user_id: actorUserId,
      metadata: {
        dataUrlPreview: photoDataUrl ? photoDataUrl.slice(0, 120_000) : null,
        source: 'driver_defect',
        defectId: input.defectId,
        vehicleCheckId: evidence.vehicleCheckId ?? null,
      },
    })
  }

  await damageLinkDb(companyId)
    .from('defects')
    .update({
      damage_case_id: damageCaseId,
      updated_at: new Date().toISOString(),
      updated_by: actorUserId,
    })
    .eq('company_id', input.companyId)
    .eq('id', input.defectId)

  return { damageCaseId, linked: true }
}
