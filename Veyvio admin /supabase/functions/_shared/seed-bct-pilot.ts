/**
 * BCT Gate 1 pilot driver fixture — auth user, driver_app_accounts, published duty for today.
 * Idempotent; safe to re-run before pilot smoke (resets acknowledgement for today's duty).
 */
import { admin } from './supabase.ts'

const DEFAULT_EMAIL = 'pilot-driver@veyvio.test'
const DEFAULT_PASSWORD = 'VeyvioPilot1!'

async function withAuthAdminRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const message = lastError.message.toLowerCase()
      if (!message.includes('jwt') && !message.includes('keyfunc')) throw lastError
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 400))
    }
  }
  throw new Error(`${label}: ${lastError?.message ?? 'auth admin request failed'}`)
}

async function ensureAuthUser(email: string, firstName: string, lastName: string, password: string) {
  const normalised = email.toLowerCase()

  const { data: profile } = await admin.from('users').select('id').ilike('email', normalised).maybeSingle()
  if (profile?.id) {
    await withAuthAdminRetry('pilot password sync', () =>
      admin.auth.admin.updateUserById(String(profile.id), {
        password,
        email_confirm: true,
      }).then(({ error }) => {
        if (error) throw new Error(error.message)
      }))
    return String(profile.id)
  }

  for (let page = 1; page <= 10; page += 1) {
    const { data: listed } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    const existing = listed?.users?.find((u) => u.email?.toLowerCase() === normalised)
    if (existing) {
      await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true })
      return existing.id
    }
    if (!listed?.users?.length || listed.users.length < 200) break
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  })
  if (!error && created.user) return created.user.id

  if (error?.message?.toLowerCase().includes('already been registered')) {
    const { data: retryProfile } = await admin.from('users').select('id').ilike('email', normalised).maybeSingle()
    if (retryProfile?.id) {
      await admin.auth.admin.updateUserById(String(retryProfile.id), { password, email_confirm: true })
      return String(retryProfile.id)
    }
  }

  throw new Error(error?.message ?? `Could not create ${email}`)
}

export async function seedBctPilotDriver() {
  const email = (Deno.env.get('VEYVIO_PILOT_EMAIL') ?? DEFAULT_EMAIL).trim().toLowerCase()
  const password = Deno.env.get('VEYVIO_PILOT_PASSWORD') ?? DEFAULT_PASSWORD

  const userId = await ensureAuthUser(email, 'BCT', 'Pilot', password)

  await admin.from('users').upsert(
    {
      id: userId,
      email,
      first_name: 'BCT',
      last_name: 'Pilot',
    },
    { onConflict: 'id' },
  )

  const { data: company } = await admin
    .from('companies')
    .select('id, trading_name')
    .or('external_reference.eq.BCT,trading_name.ilike.%Brent Community Transport%')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!company?.id) throw new Error('BCT company not found — run BCT yard seed migrations first')

  const companyId = String(company.id)

  const { data: depot } = await admin
    .from('depots')
    .select('id, code')
    .eq('company_id', companyId)
    .eq('code', 'BCT-MAIN')
    .maybeSingle()

  if (!depot?.id) throw new Error('BCT Main Depot (BCT-MAIN) not found')

  const depotId = String(depot.id)

  let { data: vehicle } = await admin
    .from('vehicles')
    .select('id, registration, fleet_number')
    .eq('company_id', companyId)
    .eq('fleet_number', 'BCT-01')
    .maybeSingle()

  if (!vehicle) {
    const { data: fallback } = await admin
      .from('vehicles')
      .select('id, registration, fleet_number')
      .eq('company_id', companyId)
      .eq('primary_depot_id', depotId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    vehicle = fallback
  }

  if (!vehicle?.id) {
    throw new Error('No BCT pilot vehicle — run migration 202607250005_bct_pilot_vehicle_seed.sql')
  }

  const vehicleId = String(vehicle.id)

  await admin.rpc('ensure_default_company_roles', {
    p_company_id: companyId,
    p_actor: userId,
  })

  const { data: driverRole } = await admin
    .from('roles')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', 'driver')
    .maybeSingle()

  let { data: membership } = await admin
    .from('company_memberships')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership) {
    const { data: createdMembership, error } = await admin
      .from('company_memberships')
      .insert({
        user_id: userId,
        company_id: companyId,
        role_ids: driverRole?.id ? [driverRole.id] : [],
        status: 'active',
        accepted_at: new Date().toISOString(),
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      })
      .select('id')
      .single()
    if (error || !createdMembership) throw new Error(error?.message ?? 'BCT pilot membership failed')
    membership = createdMembership
  }

  const membershipId = String(membership.id)

  await admin.from('depot_access').upsert(
    {
      membership_id: membershipId,
      depot_id: depotId,
      access_level: 'operate',
    },
    { onConflict: 'membership_id,depot_id' },
  )

  let { data: driver } = await admin
    .from('drivers')
    .select('id, driver_number')
    .eq('company_id', companyId)
    .eq('driver_number', 'BCT-PILOT-01')
    .maybeSingle()

  if (!driver) {
    let staffId: string | null = null
    const { data: existingStaff } = await admin
      .from('staff_members')
      .select('id')
      .eq('company_id', companyId)
      .eq('employee_number', 'BCT-PILOT-01')
      .maybeSingle()
    staffId = existingStaff?.id ? String(existingStaff.id) : null

    if (!staffId) {
      const { data: staff, error: staffError } = await admin
        .from('staff_members')
        .insert({
          company_id: companyId,
          first_name: 'BCT',
          last_name: 'Pilot',
          employee_number: 'BCT-PILOT-01',
          job_title: 'Driver',
          primary_depot_id: depotId,
          employment_status: 'active',
          status: 'active',
          created_by: userId,
          updated_by: userId,
          source_app: 'COMMAND',
        })
        .select('id')
        .single()
      if (staffError || !staff) throw new Error(staffError?.message ?? 'BCT pilot staff seed failed')
      staffId = String(staff.id)
    }

    const { data: createdDriver, error } = await admin
      .from('drivers')
      .insert({
        company_id: companyId,
        staff_id: staffId,
        driver_number: 'BCT-PILOT-01',
        status: 'active',
        primary_depot_id: depotId,
        employment_type: 'employee',
        licence_country: 'GB',
        licence_expiry_date: '2030-12-31',
        vehicle_categories: ['D1', 'B'],
        start_date: '2024-01-01',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      })
      .select('id, driver_number')
      .single()
    if (error || !createdDriver) throw new Error(error?.message ?? 'BCT pilot driver seed failed')
    driver = createdDriver
  }

  const driverId = String(driver.id)

  await admin.from('driver_app_accounts').upsert(
    {
      company_id: companyId,
      driver_id: driverId,
      user_id: userId,
      membership_id: membershipId,
      account_status: 'active',
      registration_completed_at: new Date().toISOString(),
      created_by: userId,
      updated_by: userId,
      source_app: 'COMMAND',
    },
    { onConflict: 'driver_id' },
  )

  const today = new Date().toISOString().slice(0, 10)
  const plannedSignOn = `${today}T06:30:00.000Z`
  const plannedSignOff = `${today}T15:30:00.000Z`

  let { data: duty } = await admin
    .from('duties')
    .select('id')
    .eq('company_id', companyId)
    .eq('driver_id', driverId)
    .eq('service_date', today)
    .maybeSingle()

  if (!duty) {
    const { data: createdDuty, error } = await admin
      .from('duties')
      .insert({
        company_id: companyId,
        driver_id: driverId,
        depot_id: depotId,
        vehicle_id: vehicleId,
        service_date: today,
        status: 'planned',
        planned_sign_on_at: plannedSignOn,
        planned_sign_off_at: plannedSignOff,
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      })
      .select('id')
      .single()
    if (error || !createdDuty) throw new Error(error?.message ?? 'BCT pilot duty seed failed')
    duty = createdDuty
  } else {
    await admin
      .from('duties')
      .update({
        vehicle_id: vehicleId,
        depot_id: depotId,
        planned_sign_on_at: plannedSignOn,
        planned_sign_off_at: plannedSignOff,
        actual_sign_on_at: null,
        actual_sign_off_at: null,
        status: 'planned',
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', duty.id)
      .eq('company_id', companyId)
  }

  const dutyId = String(duty.id)

  await admin.from('duty_acknowledgements').delete().eq('duty_id', dutyId).eq('company_id', companyId)

  const publishedAt = new Date().toISOString()
  await admin
    .from('duties')
    .update({
      vehicle_id: vehicleId,
      publication_status: 'published',
      published_at: publishedAt,
      published_by: userId,
      driver_lifecycle_status: 'published',
      acknowledgement_required: true,
      version: 1,
      updated_by: userId,
      updated_at: publishedAt,
    })
    .eq('id', dutyId)
    .eq('company_id', companyId)

  await withAuthAdminRetry('pilot company context', async () => {
    const { data: existing } = await admin.auth.admin.getUserById(userId)
    const appMeta = { ...(existing.user?.app_metadata ?? {}) }
    const alreadyActive =
      String(appMeta.active_company_id ?? '') === companyId &&
      String(appMeta.active_tenant_id ?? '') === companyId
    if (alreadyActive) return

    const { error } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...appMeta,
        active_company_id: companyId,
        active_tenant_id: companyId,
        company_ids: [...new Set([...(appMeta.company_ids as string[] | undefined ?? []), companyId])],
      },
    })
    if (error) throw new Error(error.message)
  })

  return {
    seeded: true,
    email,
    password,
    companyId,
    companyName: company.trading_name ?? 'Brent Community Transport',
    depotId,
    vehicleId,
    vehicleRegistration: String(vehicle.registration ?? ''),
    fleetNumber: String(vehicle.fleet_number ?? ''),
    driverId,
    driverNumber: String(driver.driver_number ?? 'BCT-PILOT-01'),
    dutyId,
    serviceDate: today,
  }
}
