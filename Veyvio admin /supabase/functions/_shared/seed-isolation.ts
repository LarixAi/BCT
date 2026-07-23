/**
 * Durable Org A / Org B fixtures for cross-tenant isolation proof.
 * Idempotent: reuses existing isolation companies when present.
 */
import { admin } from './supabase.ts'

const ISOLATION_PASSWORD = Deno.env.get('VEYVIO_ISOLATION_PASSWORD') ?? 'VeyvioIsolation1!'

type IsolationOrg = {
  label: 'A' | 'B'
  email: string
  companyName: string
  depotCode: string
  registration: string
  driverNumber: string
}

const ORGS: IsolationOrg[] = [
  {
    label: 'A',
    email: 'isolation-a@veyvio.test',
    companyName: 'Isolation Transport A Ltd',
    depotCode: 'ISO-A',
    registration: 'ISO1 AAA',
    driverNumber: 'ISO-DRV-A1',
  },
  {
    label: 'B',
    email: 'isolation-b@veyvio.test',
    companyName: 'Isolation Transport B Ltd',
    depotCode: 'ISO-B',
    registration: 'ISO2 BBB',
    driverNumber: 'ISO-DRV-B1',
  },
]

async function ensureAuthUser(email: string, firstName: string, lastName: string) {
  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const existing = listed?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password: ISOLATION_PASSWORD })
    return existing.id
  }
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: ISOLATION_PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  })
  if (error || !created.user) throw new Error(error?.message ?? `Could not create ${email}`)
  return created.user.id
}

async function seedOne(org: IsolationOrg) {
  const userId = await ensureAuthUser(org.email, 'Isolation', org.label)

  await admin.from('users').upsert({
    id: userId,
    email: org.email,
    first_name: 'Isolation',
    last_name: org.label,
  }, { onConflict: 'id' })

  let { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('trading_name', org.companyName)
    .maybeSingle()

  if (!company) {
    const { data: created, error } = await admin
      .from('companies')
      .insert({
        legal_name: org.companyName,
        trading_name: org.companyName,
        status: 'active',
        tenant_status: 'ACTIVE',
        subscription_status: 'active',
        timezone: 'Europe/London',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
        activated_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (error || !created) throw new Error(error?.message ?? 'Company create failed')
    company = created
    await admin.rpc('ensure_default_company_roles', {
      p_company_id: company.id,
      p_actor: userId,
    })
    await admin.from('company_subscriptions').upsert({
      company_id: company.id,
      status: 'active',
      plan_code: 'professional',
    }, { onConflict: 'company_id' })
  }

  const companyId = company.id as string

  const { data: adminRole } = await admin
    .from('roles')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', 'company_administrator')
    .maybeSingle()

  const { data: membership } = await admin
    .from('company_memberships')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership) {
    await admin.from('company_memberships').insert({
      user_id: userId,
      company_id: companyId,
      role_ids: adminRole ? [adminRole.id] : [],
      status: 'active',
      accepted_at: new Date().toISOString(),
      created_by: userId,
      updated_by: userId,
      source_app: 'COMMAND',
    })
  }

  let { data: depot } = await admin
    .from('depots')
    .select('id')
    .eq('company_id', companyId)
    .eq('code', org.depotCode)
    .maybeSingle()

  if (!depot) {
    const { data: createdDepot, error } = await admin
      .from('depots')
      .insert({
        company_id: companyId,
        name: `Isolation Depot ${org.label}`,
        code: org.depotCode,
        address: { line1: `${org.label} Yard`, city: 'Leeds', postcode: 'LS1 1AA' },
        status: 'active',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      })
      .select('id')
      .single()
    if (error || !createdDepot) throw new Error(error?.message ?? 'Depot seed failed')
    depot = createdDepot
  }

  let { data: vehicle } = await admin
    .from('vehicles')
    .select('id, registration')
    .eq('company_id', companyId)
    .eq('registration', org.registration)
    .maybeSingle()

  if (!vehicle) {
    const { data: createdVehicle, error } = await admin
      .from('vehicles')
      .insert({
        company_id: companyId,
        fleet_number: `ISO-${org.label}1`,
        registration: org.registration,
        make: 'Ford',
        model: 'Transit',
        year: 2022,
        vehicle_class: 'minibus',
        fuel_type: 'diesel',
        seat_capacity: 8,
        wheelchair_capacity: 0,
        primary_depot_id: depot.id,
        operational_status: 'available',
        ownership_type: 'owned',
        status: 'active',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      })
      .select('id, registration')
      .single()
    if (error || !createdVehicle) throw new Error(error?.message ?? 'Vehicle seed failed')
    vehicle = createdVehicle
  }

  let { data: driver } = await admin
    .from('drivers')
    .select('id, driver_number')
    .eq('company_id', companyId)
    .eq('driver_number', org.driverNumber)
    .maybeSingle()

  if (!driver) {
    const { data: staff, error: staffError } = await admin
      .from('staff_members')
      .insert({
        company_id: companyId,
        first_name: 'Iso',
        last_name: org.label,
        employee_number: `ISO-EMP-${org.label}`,
        job_title: 'Driver',
        primary_depot_id: depot.id,
        employment_status: 'active',
        status: 'active',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      })
      .select('id')
      .single()
    if (staffError || !staff) throw new Error(staffError?.message ?? 'Staff seed failed')

    const { data: createdDriver, error } = await admin
      .from('drivers')
      .insert({
        company_id: companyId,
        staff_id: staff.id,
        driver_number: org.driverNumber,
        status: 'active',
        primary_depot_id: depot.id,
        employment_type: 'employee',
        licence_country: 'GB',
        licence_expiry_date: '2030-01-01',
        vehicle_categories: ['D1'],
        start_date: '2024-01-01',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      })
      .select('id, driver_number')
      .single()
    if (error || !createdDriver) throw new Error(error?.message ?? 'Driver seed failed')
    driver = createdDriver
  }

  let { data: duty } = await admin
    .from('duties')
    .select('id')
    .eq('company_id', companyId)
    .eq('driver_id', driver.id)
    .limit(1)
    .maybeSingle()

  if (!duty) {
    const today = new Date().toISOString().slice(0, 10)
    const { data: createdDuty, error } = await admin
      .from('duties')
      .insert({
        company_id: companyId,
        driver_id: driver.id,
        depot_id: depot.id,
        vehicle_id: vehicle.id,
        service_date: today,
        status: 'planned',
        planned_sign_on_at: `${today}T07:00:00.000Z`,
        planned_sign_off_at: `${today}T16:00:00.000Z`,
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      })
      .select('id')
      .single()
    if (!error && createdDuty) duty = createdDuty
  } else {
    await admin
      .from('duties')
      .update({
        vehicle_id: vehicle.id,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', duty.id)
      .eq('company_id', companyId)
  }

  let { data: defect } = await admin
    .from('defects')
    .select('id')
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicle.id)
    .eq('description', `Isolation probe ${org.label}`)
    .maybeSingle()

  if (!defect) {
    const { data: createdDefect } = await admin
      .from('defects')
      .insert({
        company_id: companyId,
        vehicle_id: vehicle.id,
        defect_reference: `ISO-DEF-${org.label}`,
        description: `Isolation probe ${org.label}`,
        severity: 'attention',
        status: 'reported',
        reported_at: new Date().toISOString(),
        reported_by: userId,
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      })
      .select('id')
      .maybeSingle()
    defect = createdDefect
  }

  // Bucket allows images/PDF/octet-stream — not text/plain.
  const probePath = `${companyId}/isolation-probe-${org.label}.bin`
  const { error: probeError } = await admin.storage
    .from('driver-documents')
    .upload(probePath, new TextEncoder().encode(`isolation-${org.label}`), {
      upsert: true,
      contentType: 'application/octet-stream',
    })
  if (probeError) {
    throw new Error(`Isolation storage probe failed for ${org.label}: ${probeError.message}`)
  }

  await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      active_company_id: companyId,
      active_tenant_id: companyId,
      company_ids: [companyId],
    },
  })

  return {
    label: org.label,
    email: org.email,
    password: ISOLATION_PASSWORD,
    companyId,
    depotId: String(depot.id),
    vehicleId: String(vehicle.id),
    vehicleRegistration: String(vehicle.registration),
    driverId: String(driver.id),
    driverNumber: String(driver.driver_number),
    dutyId: duty?.id ? String(duty.id) : null,
    defectId: defect?.id ? String(defect.id) : null,
    storageProbePath: probePath,
  }
}

export async function seedIsolationTenants() {
  const orgs = []
  for (const org of ORGS) {
    orgs.push(await seedOne(org))
  }
  return { seeded: true, orgs }
}
