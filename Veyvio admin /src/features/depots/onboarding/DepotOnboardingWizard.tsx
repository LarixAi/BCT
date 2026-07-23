import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import {
  DEFAULT_DEPOT_CAPACITY,
  DEFAULT_DEPOT_FACILITIES,
  DEPOT_STATUS_LABELS,
  DEPOT_WIZARD_STEP_INDEX,
  DEPOT_WIZARD_STEPS,
} from '@/lib/depots/constants'
import type { CreateDepotInput, DepotStatus, DepotWizardStepId, UpdateDepotInput } from '@/lib/depots/types'
import { nextDepotWizardStep, prevDepotWizardStep, validateDepotCapacity } from '@/lib/depots/wizard-steps'
import { DepotBackLink } from '../components/DepotProfileHeader'

export function DepotOnboardingWizard() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const isNew = !id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const stepParam = (params.get('step') as DepotWizardStepId | null) ?? 'basic'
  const [step, setStep] = useState<DepotWizardStepId>(
    DEPOT_WIZARD_STEP_INDEX[stepParam] != null ? stepParam : 'basic',
  )
  const [error, setError] = useState('')
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([])
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([])

  const { data: depot, isLoading } = useQuery({
    queryKey: ['depot-profile', id],
    queryFn: () => api.getDepotProfile(id!),
    enabled: Boolean(id),
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicle-profiles'],
    queryFn: () => api.getVehicleProfiles(),
  })

  const { data: drivers = [] } = useQuery({
    queryKey: ['driver-profiles'],
    queryFn: () => api.getDriverProfiles(),
  })

  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    timezone: 'Europe/London',
    status: 'planned' as DepotStatus,
    vehicleCapacity: String(DEFAULT_DEPOT_CAPACITY.vehicleCapacity),
    parkingBays: String(DEFAULT_DEPOT_CAPACITY.parkingBays),
    workshopBays: String(DEFAULT_DEPOT_CAPACITY.workshopBays),
    washBays: String(DEFAULT_DEPOT_CAPACITY.washBays),
    chargingPoints: String(DEFAULT_DEPOT_CAPACITY.chargingPoints),
    fuelPumps: String(DEFAULT_DEPOT_CAPACITY.fuelPumps),
    weekdayHours: '05:00–22:00',
    saturdayHours: '06:00–20:00',
    sundayHours: 'Closed',
    managerName: '',
    assistantManagerName: '',
    dispatchContact: '',
    yardSupervisor: '',
    emergencyContact: '',
    emergencyPhone: '',
    facilities: { ...DEFAULT_DEPOT_FACILITIES },
    compliance: {
      insurance: false,
      fireRisk: false,
      sitePlan: false,
      emergency: false,
      environmental: false,
    },
  })

  useEffect(() => {
    if (!depot) return
    setForm((f) => ({
      ...f,
      name: depot.name,
      code: depot.code,
      address: depot.address,
      phone: depot.phone ?? '',
      email: depot.email ?? '',
      timezone: depot.timezone,
      status: depot.status,
      vehicleCapacity: String(depot.capacity.vehicleCapacity),
      parkingBays: String(depot.capacity.parkingBays),
      workshopBays: String(depot.capacity.workshopBays),
      washBays: String(depot.capacity.washBays),
      chargingPoints: String(depot.capacity.chargingPoints),
      fuelPumps: String(depot.capacity.fuelPumps),
      weekdayHours: depot.openingHours.weekday,
      saturdayHours: depot.openingHours.saturday,
      sundayHours: depot.openingHours.sunday,
      managerName: depot.contacts.managerName ?? '',
      assistantManagerName: depot.contacts.assistantManagerName ?? '',
      dispatchContact: depot.contacts.dispatchContact ?? '',
      yardSupervisor: depot.contacts.yardSupervisor ?? '',
      emergencyContact: depot.contacts.emergencyContact ?? '',
      emergencyPhone: depot.contacts.emergencyPhone ?? '',
      facilities: { ...depot.facilities },
      compliance: {
        insurance: depot.complianceChecklist.find((c) => c.id === 'c-insurance')?.complete ?? false,
        fireRisk: depot.complianceChecklist.find((c) => c.id === 'c-fire')?.complete ?? false,
        sitePlan: depot.complianceChecklist.find((c) => c.id === 'c-site')?.complete ?? false,
        emergency: depot.complianceChecklist.find((c) => c.id === 'c-emergency')?.complete ?? false,
        environmental: depot.complianceChecklist.find((c) => c.id === 'c-env')?.complete ?? false,
      },
    }))
    setSelectedVehicleIds(vehicles.filter((v) => v.homeDepotId === depot.id).map((v) => v.id))
    setSelectedDriverIds(drivers.filter((d) => d.depotId === depot.id).map((d) => d.id))
  }, [depot, vehicles, drivers])

  const stepIdx = DEPOT_WIZARD_STEP_INDEX[step]

  function goStep(next: DepotWizardStepId, depotId?: string) {
    setStep(next)
    const targetId = depotId ?? id
    if (targetId) navigate(`/depots/${targetId}/onboarding?step=${next}`, { replace: true })
    else navigate(`/depots/new?step=${next}`, { replace: true })
  }

  function patchFromForm(): UpdateDepotInput {
    return {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      address: form.address.trim(),
      phone: form.phone || null,
      email: form.email || null,
      timezone: form.timezone,
      status: form.status,
      capacity: {
        vehicleCapacity: Number(form.vehicleCapacity) || DEFAULT_DEPOT_CAPACITY.vehicleCapacity,
        parkingBays: Number(form.parkingBays) || 0,
        workshopBays: Number(form.workshopBays) || 0,
        washBays: Number(form.washBays) || 0,
        chargingPoints: Number(form.chargingPoints) || 0,
        fuelPumps: Number(form.fuelPumps) || 0,
      },
      facilities: form.facilities,
      contacts: {
        managerName: form.managerName || null,
        assistantManagerName: form.assistantManagerName || null,
        dispatchContact: form.dispatchContact || null,
        yardSupervisor: form.yardSupervisor || null,
        emergencyContact: form.emergencyContact || null,
        emergencyPhone: form.emergencyPhone || null,
      },
      openingHours: {
        weekday: form.weekdayHours,
        saturday: form.saturdayHours,
        sunday: form.sundayHours,
      },
      complianceChecklist: [
        { id: 'c-insurance', label: 'Insurance on file', complete: form.compliance.insurance },
        { id: 'c-fire', label: 'Fire risk assessment', complete: form.compliance.fireRisk },
        { id: 'c-site', label: 'Site plan', complete: form.compliance.sitePlan },
        { id: 'c-emergency', label: 'Emergency procedures', complete: form.compliance.emergency },
        { id: 'c-env', label: 'Environmental permits', complete: form.compliance.environmental },
      ],
    }
  }

  const createDraft = useMutation({
    mutationFn: async () => {
      const input: CreateDepotInput = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address.trim(),
        phone: form.phone || null,
        email: form.email || null,
        timezone: form.timezone,
        status: 'planned',
      }
      return api.createDepot(input, actorName)
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['depot-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['depots'] })
      goStep('operations', created.id)
      setError('')
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not create depot'),
  })

  const saveStep = useMutation({
    mutationFn: async (next: DepotWizardStepId) => {
      if (!id) throw new Error('Depot not created yet')
      let profile = await api.updateDepot(id, patchFromForm(), actorName)

      if (step === 'assignment') {
        for (const vehicleId of selectedVehicleIds) {
          const v = vehicles.find((x) => x.id === vehicleId)
          if (v && v.homeDepotId !== id) {
            await api.updateVehicle(vehicleId, { homeDepotId: id, currentDepotId: id }, actorName)
          }
        }
        for (const driverId of selectedDriverIds) {
          const d = drivers.find((x) => x.id === driverId)
          if (d && d.depotId !== id) {
            await api.updateDriver(driverId, { depotId: id }, actorName)
          }
        }
        profile = await api.getDepotProfile(id)
      }

      return { profile, next }
    },
    onSuccess: ({ profile, next }) => {
      queryClient.setQueryData(['depot-profile', id], profile)
      queryClient.invalidateQueries({ queryKey: ['depot-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['driver-profiles'] })
      goStep(next, profile.id)
      setError('')
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not save step'),
  })

  const activate = useMutation({
    mutationFn: async (makeOperational: boolean) => {
      if (!id) throw new Error('Depot not created')
      const capacityError = validateDepotCapacity(
        selectedVehicleIds.length,
        Number(form.vehicleCapacity) || DEFAULT_DEPOT_CAPACITY.vehicleCapacity,
      )
      if (capacityError) throw new Error(capacityError)
      return api.updateDepot(
        id,
        {
          ...patchFromForm(),
          status: makeOperational ? 'operational' : 'planned',
        },
        actorName,
      )
    },
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: ['depot-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['depots'] })
      navigate(`/depots/${profile.id}`)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not finish'),
  })

  const pending = createDraft.isPending || saveStep.isPending || activate.isPending

  function validateBasic() {
    if (!form.name.trim()) return 'Depot name is required.'
    if (!form.code.trim()) return 'Depot code is required.'
    return null
  }

  async function handleContinue() {
    setError('')
    if (step === 'basic') {
      const v = validateBasic()
      if (v) {
        setError(v)
        return
      }
      if (isNew) createDraft.mutate()
      else saveStep.mutate('operations')
      return
    }
    if (step === 'review') return
    const next = nextDepotWizardStep(step)
    if (!next) return
    saveStep.mutate(next)
  }

  function handleBack() {
    const prev = prevDepotWizardStep(step)
    if (!prev) {
      navigate('/depots')
      return
    }
    if (id) goStep(prev, id)
    else goStep(prev)
  }

  if (id && isLoading) return <p className="text-sm text-muted">Loading depot…</p>

  const capacityWarn = validateDepotCapacity(
    selectedVehicleIds.length,
    Number(form.vehicleCapacity) || DEFAULT_DEPOT_CAPACITY.vehicleCapacity,
  )

  return (
    <div className="space-y-4">
      <DepotBackLink />
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          {isNew ? 'Add depot' : `Set up ${depot?.name ?? 'depot'}`}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Guided setup for a new operational headquarters. New depots stay planned until you activate them.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <ol className="space-y-1">
          {DEPOT_WIZARD_STEPS.map((s, i) => {
            const active = s.id === step
            const done = i < stepIdx
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={isNew && i > 0}
                  onClick={() => id && goStep(s.id, id)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left transition',
                    active
                      ? 'border-command-500 bg-command-50'
                      : done
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-border bg-surface',
                    isNew && i > 0 && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Step {i + 1}</p>
                  <p className={cn('text-sm font-semibold', active ? 'text-command-800' : 'text-ink')}>{s.label}</p>
                </button>
              </li>
            )
          })}
        </ol>

        <div className="space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

          {step === 'basic' && (
            <SectionCard title="Basic information" description={DEPOT_WIZARD_STEPS[0]!.description}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Depot name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                <Field label="Depot code" value={form.code} onChange={(v) => setForm({ ...form, code: v.toUpperCase() })} required />
                <Field
                  label="Address"
                  value={form.address}
                  onChange={(v) => setForm({ ...form, address: v })}
                  className="sm:col-span-2"
                />
                <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                <Field label="Timezone" value={form.timezone} onChange={(v) => setForm({ ...form, timezone: v })} />
                <label className="block text-sm">
                  <span className="text-ink-soft">Status</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as DepotStatus })}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
                  >
                    {Object.entries(DEPOT_STATUS_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </SectionCard>
          )}

          {step === 'operations' && (
            <SectionCard title="Operations" description={DEPOT_WIZARD_STEPS[1]!.description}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Vehicle capacity" value={form.vehicleCapacity} onChange={(v) => setForm({ ...form, vehicleCapacity: v })} />
                <Field label="Parking bays" value={form.parkingBays} onChange={(v) => setForm({ ...form, parkingBays: v })} />
                <Field label="Workshop bays" value={form.workshopBays} onChange={(v) => setForm({ ...form, workshopBays: v })} />
                <Field label="Wash bays" value={form.washBays} onChange={(v) => setForm({ ...form, washBays: v })} />
                <Field label="Charging points" value={form.chargingPoints} onChange={(v) => setForm({ ...form, chargingPoints: v })} />
                <Field label="Fuel pumps" value={form.fuelPumps} onChange={(v) => setForm({ ...form, fuelPumps: v })} />
                <Field label="Weekday hours" value={form.weekdayHours} onChange={(v) => setForm({ ...form, weekdayHours: v })} />
                <Field label="Saturday hours" value={form.saturdayHours} onChange={(v) => setForm({ ...form, saturdayHours: v })} />
                <Field label="Sunday hours" value={form.sundayHours} onChange={(v) => setForm({ ...form, sundayHours: v })} />
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {(
                  [
                    ['fuelDiesel', 'Diesel'],
                    ['fuelPetrol', 'Petrol'],
                    ['fuelAdBlue', 'AdBlue'],
                    ['evCharging', 'EV charging'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.facilities[key]}
                      onChange={(e) =>
                        setForm({ ...form, facilities: { ...form.facilities, [key]: e.target.checked } })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </SectionCard>
          )}

          {step === 'management' && (
            <SectionCard title="Management" description={DEPOT_WIZARD_STEPS[2]!.description}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Depot manager" value={form.managerName} onChange={(v) => setForm({ ...form, managerName: v })} />
                <Field
                  label="Assistant manager"
                  value={form.assistantManagerName}
                  onChange={(v) => setForm({ ...form, assistantManagerName: v })}
                />
                <Field
                  label="Dispatch contact"
                  value={form.dispatchContact}
                  onChange={(v) => setForm({ ...form, dispatchContact: v })}
                />
                <Field
                  label="Yard supervisor"
                  value={form.yardSupervisor}
                  onChange={(v) => setForm({ ...form, yardSupervisor: v })}
                />
                <Field
                  label="Emergency contact"
                  value={form.emergencyContact}
                  onChange={(v) => setForm({ ...form, emergencyContact: v })}
                />
                <Field
                  label="Emergency phone"
                  value={form.emergencyPhone}
                  onChange={(v) => setForm({ ...form, emergencyPhone: v })}
                />
              </div>
            </SectionCard>
          )}

          {step === 'assignment' && (
            <SectionCard title="Fleet assignment" description="Soft-assign existing resources to this depot">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium text-ink">Vehicles</p>
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                    {vehicles.map((v) => (
                      <label key={v.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedVehicleIds.includes(v.id)}
                          onChange={(e) =>
                            setSelectedVehicleIds((ids) =>
                              e.target.checked ? [...ids, v.id] : ids.filter((x) => x !== v.id),
                            )
                          }
                        />
                        {v.registrationNumber}
                        <span className="text-xs text-muted">({v.homeDepotName})</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-ink">Drivers</p>
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                    {drivers.map((d) => (
                      <label key={d.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedDriverIds.includes(d.id)}
                          onChange={(e) =>
                            setSelectedDriverIds((ids) =>
                              e.target.checked ? [...ids, d.id] : ids.filter((x) => x !== d.id),
                            )
                          }
                        />
                        {d.firstName} {d.lastName}
                        <span className="text-xs text-muted">({d.depotName})</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              {capacityWarn && <p className="mt-3 text-sm text-amber-800">{capacityWarn}</p>}
            </SectionCard>
          )}

          {step === 'facilities' && (
            <SectionCard title="Facilities" description={DEPOT_WIZARD_STEPS[4]!.description}>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ['vehicleWash', 'Vehicle wash'],
                    ['cleaningArea', 'Cleaning area'],
                    ['inspectionLane', 'Inspection lane'],
                    ['secureParking', 'Secure parking'],
                    ['cctv', 'CCTV'],
                    ['accessControl', 'Access control'],
                    ['evCharging', 'EV charging'],
                    ['fuelDiesel', 'Diesel fuel'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-ink-soft">
                    <input
                      type="checkbox"
                      checked={form.facilities[key]}
                      onChange={(e) =>
                        setForm({ ...form, facilities: { ...form.facilities, [key]: e.target.checked } })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </SectionCard>
          )}

          {step === 'compliance' && (
            <SectionCard title="Compliance & documents" description="Mark what is already on file">
              <div className="space-y-2">
                {(
                  [
                    ['insurance', 'Insurance'],
                    ['fireRisk', 'Fire risk assessment'],
                    ['sitePlan', 'Site plan'],
                    ['emergency', 'Emergency procedures'],
                    ['environmental', 'Environmental permits'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.compliance[key]}
                      onChange={(e) =>
                        setForm({ ...form, compliance: { ...form.compliance, [key]: e.target.checked } })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </SectionCard>
          )}

          {step === 'review' && (
            <SectionCard title="Review & create" description="Validate capacity, then activate or keep planned">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Meta label="Name" value={form.name} />
                <Meta label="Code" value={form.code} />
                <Meta label="Address" value={form.address || '—'} />
                <Meta label="Manager" value={form.managerName || '—'} />
                <Meta label="Vehicle capacity" value={form.vehicleCapacity} />
                <Meta label="Vehicles selected" value={String(selectedVehicleIds.length)} />
                <Meta label="Drivers selected" value={String(selectedDriverIds.length)} />
                <Meta label="Status after save" value={DEPOT_STATUS_LABELS[form.status]} />
              </dl>
              {capacityWarn && <p className="mt-3 text-sm text-red-700">{capacityWarn}</p>}
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => activate.mutate(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
                >
                  Save as planned
                </button>
                <button
                  type="button"
                  disabled={pending || Boolean(capacityWarn)}
                  onClick={() => activate.mutate(true)}
                  className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
                >
                  Create and activate
                </button>
              </div>
            </SectionCard>
          )}

          {step !== 'review' && (
            <div className="flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
              >
                Back
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void handleContinue()}
                className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
              >
                {step === 'basic' && isNew ? 'Create and continue' : 'Save and continue'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  required,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  className?: string
}) {
  const inputId = `depot-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <label htmlFor={inputId} className={cn('block text-sm', className)}>
      <span className="text-ink-soft">
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        id={inputId}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
      />
    </label>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}
