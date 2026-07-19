/** Seeds a usable Command demo company after first bootstrap. */
import { admin } from './supabase.ts'

export async function seedDemoCompany(companyId: string, userId: string) {
  const { count } = await admin
    .from('depots')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
  if ((count ?? 0) > 0) return { seeded: false }

  const today = new Date().toISOString().slice(0, 10)
  const signOn = `${today}T07:30:00.000Z`
  const signOff = `${today}T16:30:00.000Z`
  const pickup = `${today}T08:15:00.000Z`
  const arrival = `${today}T08:45:00.000Z`

  const { data: depot, error: depotError } = await admin
    .from('depots')
    .insert({
      company_id: companyId,
      name: 'North Depot',
      code: 'NORTH',
      address: { line1: '12 Yard Road', city: 'Leeds', postcode: 'LS1 1AA' },
      latitude: 53.8008,
      longitude: -1.5491,
      status: 'active',
      created_by: userId,
      updated_by: userId,
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (depotError || !depot) throw new Error(depotError?.message ?? 'Depot seed failed')

  const staffRows = [
    { first_name: 'Jordan', last_name: 'Ellis', employee_number: 'EMP-101', job_title: 'Driver' },
    { first_name: 'Sam', last_name: 'Okoro', employee_number: 'EMP-102', job_title: 'Driver' },
    { first_name: 'Riley', last_name: 'Chen', employee_number: 'EMP-103', job_title: 'Driver' },
  ]
  const { data: staff, error: staffError } = await admin
    .from('staff_members')
    .insert(
      staffRows.map((row) => ({
        company_id: companyId,
        ...row,
        primary_depot_id: depot.id,
        employment_status: 'active',
        status: 'active',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      })),
    )
    .select('id, first_name')
  if (staffError || !staff?.length) throw new Error(staffError?.message ?? 'Staff seed failed')

  const licenceExpiry = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10)
  const { data: drivers, error: driverError } = await admin
    .from('drivers')
    .insert(
      staff.map((member, index) => ({
        company_id: companyId,
        staff_id: member.id,
        driver_number: `DRV-10${index + 1}`,
        status: 'active',
        primary_depot_id: depot.id,
        employment_type: 'employee',
        licence_country: 'GB',
        licence_expiry_date: licenceExpiry,
        vehicle_categories: ['D1', 'B'],
        start_date: '2024-01-15',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      })),
    )
    .select('id, driver_number')
  if (driverError || !drivers?.length) throw new Error(driverError?.message ?? 'Driver seed failed')

  const { data: vehicles, error: vehicleError } = await admin
    .from('vehicles')
    .insert([
      {
        company_id: companyId,
        fleet_number: 'F-201',
        registration: 'YX71 ABC',
        make: 'Ford',
        model: 'Transit Custom',
        year: 2021,
        vehicle_class: 'minibus',
        fuel_type: 'diesel',
        colour: 'White',
        seat_capacity: 8,
        wheelchair_capacity: 0,
        primary_depot_id: depot.id,
        operational_status: 'available',
        ownership_type: 'owned',
        commissioned_at: '2021-06-01T00:00:00.000Z',
        status: 'active',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      },
      {
        company_id: companyId,
        fleet_number: 'F-202',
        registration: 'YX72 DEF',
        make: 'Volkswagen',
        model: 'Crafter',
        year: 2022,
        vehicle_class: 'accessible',
        fuel_type: 'diesel',
        colour: 'Silver',
        seat_capacity: 12,
        wheelchair_capacity: 2,
        primary_depot_id: depot.id,
        operational_status: 'in_service',
        ownership_type: 'owned',
        commissioned_at: '2022-03-01T00:00:00.000Z',
        status: 'active',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      },
      {
        company_id: companyId,
        fleet_number: 'F-203',
        registration: 'YX69 GHI',
        make: 'Mercedes',
        model: 'Sprinter',
        year: 2019,
        vehicle_class: 'minibus',
        fuel_type: 'diesel',
        colour: 'Blue',
        seat_capacity: 16,
        wheelchair_capacity: 0,
        primary_depot_id: depot.id,
        operational_status: 'vor',
        ownership_type: 'leased',
        commissioned_at: '2019-09-01T00:00:00.000Z',
        status: 'active',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      },
    ])
    .select('id, registration, operational_status')
  if (vehicleError || !vehicles?.length) throw new Error(vehicleError?.message ?? 'Vehicle seed failed')

  const { data: customer, error: customerError } = await admin
    .from('customers')
    .insert({
      company_id: companyId,
      customer_type: 'local_authority',
      legal_name: 'Leeds City Council',
      trading_name: 'Leeds City Council',
      billing_address: { line1: 'Civic Hall', city: 'Leeds', postcode: 'LS1 1UR' },
      status: 'active',
      payment_terms: '30 days',
      purchase_order_required: true,
      created_by: userId,
      updated_by: userId,
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (customerError || !customer) throw new Error(customerError?.message ?? 'Customer seed failed')

  const { data: passengers, error: passengerError } = await admin
    .from('passengers')
    .insert([
      {
        company_id: companyId,
        customer_id: customer.id,
        first_name: 'Amelia',
        last_name: 'Wright',
        preferred_name: 'Amy',
        status: 'active',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      },
      {
        company_id: companyId,
        customer_id: customer.id,
        first_name: 'Noah',
        last_name: 'Patel',
        status: 'active',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      },
    ])
    .select('id')
  if (passengerError || !passengers?.length) throw new Error(passengerError?.message ?? 'Passenger seed failed')

  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .insert({
      company_id: companyId,
      customer_id: customer.id,
      booking_reference: 'BK-1001',
      booking_type: 'single',
      priority: 'normal',
      passenger_ids: passengers.map((p) => p.id),
      requested_date: today,
      status: 'assigned',
      source: 'command',
      notes: 'School morning pickup',
      depot_id: depot.id,
      created_by: userId,
      updated_by: userId,
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (bookingError || !booking) throw new Error(bookingError?.message ?? 'Booking seed failed')

  const { data: trip, error: tripError } = await admin
    .from('trips')
    .insert({
      company_id: companyId,
      booking_id: booking.id,
      trip_reference: 'TR-1001',
      service_date: today,
      planned_pickup_at: pickup,
      planned_arrival_at: arrival,
      pickup_location: { name: '12 Oak Avenue', postcode: 'LS6 2AB' },
      destination_location: { name: 'Greenfield Primary', postcode: 'LS6 3CD' },
      passenger_ids: passengers.map((p) => p.id),
      status: 'assigned',
      priority: 'normal',
      depot_id: depot.id,
      created_by: userId,
      updated_by: userId,
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (tripError || !trip) throw new Error(tripError?.message ?? 'Trip seed failed')

  const activeVehicle = vehicles.find((v) => v.operational_status === 'in_service') ?? vehicles[0]
  const { data: run, error: runError } = await admin
    .from('runs')
    .insert({
      company_id: companyId,
      run_reference: 'RUN-1001',
      service_date: today,
      depot_id: depot.id,
      planned_start_at: signOn,
      planned_end_at: signOff,
      status: 'assigned',
      driver_id: drivers[0].id,
      vehicle_id: activeVehicle.id,
      created_by: userId,
      updated_by: userId,
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (runError || !run) throw new Error(runError?.message ?? 'Run seed failed')

  await admin.from('run_trips').insert({ run_id: run.id, trip_id: trip.id, sequence: 1, planned_travel_minutes: 30 })
  await admin.from('trip_assignments').insert({
    company_id: companyId,
    trip_id: trip.id,
    run_id: run.id,
    driver_id: drivers[0].id,
    vehicle_id: activeVehicle.id,
    assigned_by: userId,
    status: 'active',
    created_by: userId,
    updated_by: userId,
    source_app: 'COMMAND',
  })

  const { data: duty, error: dutyError } = await admin
    .from('duties')
    .insert({
      company_id: companyId,
      driver_id: drivers[0].id,
      depot_id: depot.id,
      vehicle_id: activeVehicle.id,
      service_date: today,
      planned_sign_on_at: signOn,
      planned_sign_off_at: signOff,
      status: 'planned',
      publication_status: 'published',
      published_at: new Date().toISOString(),
      published_by: userId,
      acknowledgement_required: true,
      acknowledgement_deadline: new Date(`${today}T20:00:00.000Z`).toISOString(),
      driver_lifecycle_status: 'published',
      created_by: userId,
      updated_by: userId,
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (dutyError || !duty) throw new Error(dutyError?.message ?? 'Duty seed failed')
  await admin.from('duty_runs').insert({ duty_id: duty.id, run_id: run.id, sequence: 1 })
  await admin.from('duty_assignment_events').insert({
    company_id: companyId,
    duty_id: duty.id,
    event_type: 'published',
    actor_user_id: userId,
    payload: { seed: true },
    source_app: 'COMMAND',
  })

  const vorVehicle = vehicles.find((v) => v.operational_status === 'vor')
  if (vorVehicle) {
    const { data: defect } = await admin
      .from('defects')
      .insert({
        company_id: companyId,
        vehicle_id: vorVehicle.id,
        defect_reference: 'DEF-1001',
        source_type: 'command',
        reported_by: userId,
        category: 'brakes',
        component: 'rear_brakes',
        severity: 'critical',
        description: 'Rear brake warning light illuminated during yard check',
        status: 'repair_required',
        operational_decision: 'vor',
        depot_id: depot.id,
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
        occurred_at: new Date().toISOString(),
        received_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (defect) {
      await admin.from('vor_cases').insert({
        company_id: companyId,
        vehicle_id: vorVehicle.id,
        status: 'active',
        reason_code: 'brake_defect',
        source_defect_id: defect.id,
        declared_by: userId,
        physical_location: 'North Depot workshop',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      })
    }
  }

  await admin.from('operational_exceptions').insert({
    company_id: companyId,
    type: 'vehicle_vor',
    severity: 'high',
    status: 'open',
    source_entity_type: 'vehicle',
    source_entity_id: vorVehicle?.id ?? null,
    title: 'VOR vehicle needs replacement before afternoon school runs',
    description: 'F-203 is VOR for a brake defect. Dispatch should reassign affected work.',
    detected_at: new Date().toISOString(),
    owner_id: userId,
    created_by: userId,
    updated_by: userId,
    source_app: 'SYSTEM',
  })

  await admin.from('notifications').insert({
    company_id: companyId,
    recipient_user_id: userId,
    notification_type: 'vehicle_vor',
    title: 'Vehicle marked VOR',
    body: 'YX69 GHI cannot enter service until brakes are cleared.',
    severity: 'critical',
    source_entity_type: 'vehicle',
    source_entity_id: vorVehicle?.id ?? null,
    action_url: '/vehicles/vor',
    status: 'unread',
  })

  await admin.from('command_page_snapshots').upsert({
    company_id: companyId,
    path: '/',
    title: 'Operational overview',
    summary: 'Demo company seeded with depot, drivers, vehicles and today\'s assigned work.',
    items: [],
    metrics: { seeded: true },
    updated_at: new Date().toISOString(),
  })

  await admin.from('audit_events').insert({
    company_id: companyId,
    actor_type: 'system',
    actor_id: userId,
    action: 'company.demo_seeded',
    entity_type: 'company',
    entity_id: companyId,
    source_app: 'SYSTEM',
    after_snapshot: {
      depotId: depot.id,
      drivers: drivers.length,
      vehicles: vehicles.length,
      bookingId: booking.id,
    },
  })

  return { seeded: true, depotId: depot.id }
}
