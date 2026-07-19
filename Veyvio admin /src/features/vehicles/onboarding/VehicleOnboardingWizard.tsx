import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import {
  FUEL_TYPE_LABELS,
  OWNERSHIP_TYPE_LABELS,
  VEHICLE_CAPABILITY_OPTIONS,
  VEHICLE_CATEGORY_LABELS,
} from '@/lib/vehicles/constants'
import {
  nextWizardStep,
  onboardingStageToWizardStep,
  prevWizardStep,
  VEHICLE_WIZARD_STEP_INDEX,
  VEHICLE_WIZARD_STEPS,
} from '@/lib/vehicles/wizard-steps'
import type {
  CreateVehicleInput,
  FuelType,
  OwnershipType,
  UpdateVehicleInput,
  VehicleCategory,
  VehicleWizardStepId,
} from '@/lib/vehicles/types'
import { VehicleBackLink } from '../components/VehicleProfileHeader'
import { VehicleStatusStrip } from '../components/VehicleStatusStrip'

const OWNERSHIP_DOCS: Record<OwnershipType, string[]> = {
  owned: ['Proof of ownership / V5C'],
  leased: ['Lease agreement', 'Finance company details'],
  hire_purchase: ['HP agreement', 'Finance company details'],
  rental: ['Rental agreement', 'Hire end date'],
  long_term_hire: ['Long-term hire agreement', 'Supplier contact'],
  temporary_hire: ['Temporary hire agreement', 'Return date'],
  migration: ['Migration source system', 'Legacy fleet ID'],
}

export function VehicleOnboardingWizard() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const isNew = !id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const stepParam = (params.get('step') as VehicleWizardStepId | null) ?? 'identity'
  const [step, setStep] = useState<VehicleWizardStepId>(
    VEHICLE_WIZARD_STEP_INDEX[stepParam] != null ? stepParam : 'identity',
  )
  const [error, setError] = useState('')
  const [ackWarnings, setAckWarnings] = useState(false)

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle-profile', id],
    queryFn: () => api.getVehicleProfile(id!),
    enabled: Boolean(id),
  })

  const { data: depots = [] } = useQuery({
    queryKey: ['depots'],
    queryFn: () => api.getDepots(),
  })

  const [form, setForm] = useState({
    registrationNumber: '',
    fleetNumber: '',
    vin: '',
    make: '',
    model: '',
    modelYear: '',
    colour: '',
    vehicleCategory: 'minibus' as VehicleCategory,
    ownershipType: 'owned' as OwnershipType,
    ownerName: '',
    homeDepotId: '',
    seatingCapacity: '16',
    wheelchairCapacity: '0',
    standingCapacity: '0',
    fuelType: 'diesel' as FuelType,
    motExpiry: '',
    insuranceExpiry: '',
    taxExpiry: '',
    nextMaintenanceDate: '',
    nextMaintenanceMileage: '',
    telematicsProvider: '',
    telematicsDeviceId: '',
    parkingBay: '',
    currentLocationLabel: '',
    driverCheckTemplate: 'standard_walkaround',
    capabilityKeys: ['psv'] as string[],
    equipmentConfirmed: false,
    baselineConfirmed: false,
  })

  useEffect(() => {
    if (!form.homeDepotId && depots[0]?.id) {
      setForm((f) => ({ ...f, homeDepotId: depots[0]!.id }))
    }
  }, [depots, form.homeDepotId])

  useEffect(() => {
    if (!vehicle) return
    setForm((f) => ({
      ...f,
      registrationNumber: vehicle.registrationNumber,
      fleetNumber: vehicle.fleetNumber ?? '',
      vin: vehicle.vin ?? '',
      make: vehicle.make,
      model: vehicle.model,
      modelYear: vehicle.modelYear != null ? String(vehicle.modelYear) : '',
      colour: vehicle.colour ?? '',
      vehicleCategory: vehicle.vehicleCategory,
      ownershipType: vehicle.ownershipType,
      ownerName: vehicle.ownerName ?? '',
      homeDepotId: vehicle.homeDepotId || f.homeDepotId,
      seatingCapacity: String(vehicle.seatingCapacity),
      wheelchairCapacity: String(vehicle.wheelchairCapacity),
      standingCapacity: String(vehicle.standingCapacity),
      fuelType: vehicle.fuelType,
      motExpiry: vehicle.motExpiry ?? '',
      insuranceExpiry: vehicle.insuranceExpiry ?? '',
      taxExpiry: vehicle.taxExpiry ?? '',
      nextMaintenanceDate: vehicle.nextMaintenanceDate ?? '',
      nextMaintenanceMileage: vehicle.nextMaintenanceMileage != null ? String(vehicle.nextMaintenanceMileage) : '',
      telematicsProvider: vehicle.telematics?.provider ?? '',
      telematicsDeviceId: '',
      parkingBay: vehicle.parkingBay ?? '',
      currentLocationLabel: vehicle.currentLocationLabel ?? '',
      capabilityKeys: vehicle.capabilities.filter((c) => c.enabled).map((c) => c.key),
      driverCheckTemplate:
        vehicle.notes.find((n) => n.body.startsWith('Driver check template:'))?.body.replace('Driver check template: ', '') ??
        f.driverCheckTemplate,
      equipmentConfirmed: vehicle.equipment.some((e) => e.assigned),
      baselineConfirmed: vehicle.damageRecords.some((d) => d.baseline),
    }))
    if (!params.get('step') && vehicle.onboarding?.currentStage) {
      setStep(onboardingStageToWizardStep(vehicle.onboarding.currentStage))
    }
  }, [vehicle, params])

  const stepIdx = VEHICLE_WIZARD_STEP_INDEX[step]

  function goStep(next: VehicleWizardStepId, vehicleId?: string) {
    setStep(next)
    const targetId = vehicleId ?? id
    if (targetId) navigate(`/vehicles/${targetId}/onboarding?step=${next}`, { replace: true })
    else navigate(`/vehicles/new?step=${next}`, { replace: true })
  }

  function patchFromForm(): UpdateVehicleInput {
    return {
      registrationNumber: form.registrationNumber.trim().toUpperCase(),
      fleetNumber: form.fleetNumber || undefined,
      vin: form.vin || undefined,
      make: form.make.trim(),
      model: form.model.trim(),
      modelYear: form.modelYear ? Number(form.modelYear) : null,
      colour: form.colour || null,
      vehicleCategory: form.vehicleCategory,
      ownershipType: form.ownershipType,
      ownerName: form.ownerName || null,
      homeDepotId: form.homeDepotId,
      seatingCapacity: Number(form.seatingCapacity) || 0,
      wheelchairCapacity: Number(form.wheelchairCapacity) || 0,
      standingCapacity: Number(form.standingCapacity) || 0,
      fuelType: form.fuelType,
      motExpiry: form.motExpiry || null,
      insuranceExpiry: form.insuranceExpiry || null,
      taxExpiry: form.taxExpiry || null,
      nextMaintenanceDate: form.nextMaintenanceDate || null,
      nextMaintenanceMileage: form.nextMaintenanceMileage ? Number(form.nextMaintenanceMileage) : null,
      telematicsProvider: form.telematicsProvider || null,
      telematicsDeviceId: form.telematicsDeviceId || null,
      parkingBay: form.parkingBay || undefined,
      currentLocationLabel: form.currentLocationLabel || undefined,
      driverCheckTemplate: form.driverCheckTemplate || null,
    }
  }

  const createDraft = useMutation({
    mutationFn: async () => {
      const input: CreateVehicleInput = {
        registrationNumber: form.registrationNumber.trim().toUpperCase(),
        fleetNumber: form.fleetNumber || undefined,
        vin: form.vin || undefined,
        make: form.make.trim(),
        model: form.model.trim(),
        modelYear: form.modelYear ? Number(form.modelYear) : null,
        colour: form.colour || null,
        vehicleCategory: form.vehicleCategory,
        homeDepotId: form.homeDepotId,
        seatingCapacity: Number(form.seatingCapacity) || 16,
        wheelchairCapacity: Number(form.wheelchairCapacity) || 0,
        standingCapacity: Number(form.standingCapacity) || 0,
        fuelType: form.fuelType,
        ownershipType: form.ownershipType,
        ownerName: form.ownerName || null,
      }
      return api.createVehicle(input, actorName)
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-directory-summary'] })
      goStep('ownership', created.id)
      setError('')
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not create vehicle'),
  })

  const saveStep = useMutation({
    mutationFn: async (next: VehicleWizardStepId) => {
      if (!id) throw new Error('Vehicle not created yet')
      let profile = await api.updateVehicle(id, patchFromForm(), actorName)

      if (step === 'compliance') {
        for (const [type, label, expiry] of [
          ['mot', 'MOT / annual test', form.motExpiry],
          ['insurance', 'Insurance certificate', form.insuranceExpiry],
          ['tax', 'Vehicle tax', form.taxExpiry],
        ] as const) {
          if (!expiry) continue
          const existing = profile.documents.find((d) => d.requirementType === type)
          if (!existing) {
            profile = await api.uploadVehicleDocument(
              id,
              { requirementType: type, label, fileName: `${type}.pdf`, expiryDate: expiry },
              actorName,
            )
          }
          const doc = profile.documents.find((d) => d.requirementType === type)
          if (doc && doc.verificationStatus !== 'verified') {
            profile = await api.verifyVehicleDocument(id, doc.id, actorName)
          }
        }
      }

      if (step === 'eligibility') {
        // Capabilities are stored on create defaults; Phase 1 records intent via note.
        profile = await api.updateVehicle(
          id,
          {
            ...patchFromForm(),
            driverCheckTemplate: `capabilities:${form.capabilityKeys.join(',')}`,
          },
          actorName,
        )
      }

      return { profile, next }
    },
    onSuccess: ({ profile, next }) => {
      queryClient.setQueryData(['vehicle-profile', id], profile)
      queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
      goStep(next, profile.id)
      setError('')
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not save step'),
  })

  const activate = useMutation({
    mutationFn: (mode: 'submit_for_approval' | 'activate' | 'keep_blocked') =>
      api.activateVehicleFromWizard(id!, { mode, acknowledgeWarnings: ackWarnings }, actorName),
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-directory-summary'] })
      navigate(`/vehicles/${profile.id}`)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Activation blocked'),
  })

  const pending = createDraft.isPending || saveStep.isPending || activate.isPending

  function validateIdentity() {
    if (!form.registrationNumber.trim()) return 'Registration is required.'
    if (!form.make.trim() || !form.model.trim()) return 'Make and model are required.'
    if (!form.homeDepotId) return 'Home depot is required.'
    return null
  }

  async function handleContinue() {
    setError('')
    if (step === 'identity') {
      const v = validateIdentity()
      if (v) {
        setError(v)
        return
      }
      if (isNew) createDraft.mutate()
      else saveStep.mutate('ownership')
      return
    }
    if (step === 'review') return
    const next = nextWizardStep(step)
    if (!next) return
    saveStep.mutate(next)
  }

  function handleBack() {
    const prev = prevWizardStep(step)
    if (!prev) {
      navigate('/vehicles')
      return
    }
    if (id) goStep(prev, id)
    else goStep(prev)
  }

  if (id && isLoading) return <p className="text-sm text-slate-500">Loading vehicle…</p>

  const probeEligible = vehicle
    ? vehicle.lifecycleStatus === 'awaiting_onboarding'
      ? vehicle.release.failures.every((f) => f.code === 'lifecycle_inactive' || f.severity === 'warning')
      : vehicle.readiness.assignmentEligible
    : false

  return (
    <div className="space-y-4">
      <VehicleBackLink />
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {isNew ? 'Add vehicle' : `Onboard ${vehicle?.registrationNumber ?? 'vehicle'}`}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          One shared vehicle record for Admin, Yard, Maintenance and Driver. New vehicles stay awaiting onboarding until
          approved.
        </p>
        {vehicle && (
          <div className="mt-3">
            <VehicleStatusStrip vehicle={vehicle} />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <ol className="space-y-1">
          {VEHICLE_WIZARD_STEPS.map((s, i) => {
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
                        : 'border-slate-200 bg-white',
                    isNew && i > 0 && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Step {i + 1}</p>
                  <p className={cn('text-sm font-semibold', active ? 'text-command-800' : 'text-slate-900')}>{s.label}</p>
                </button>
              </li>
            )
          })}
        </ol>

        <div className="space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

          {step === 'identity' && (
            <SectionCard title="Identity" description={VEHICLE_WIZARD_STEPS[0]!.description}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Registration"
                  value={form.registrationNumber}
                  onChange={(v) => setForm({ ...form, registrationNumber: v.toUpperCase() })}
                  required
                />
                <Field label="Fleet number" value={form.fleetNumber} onChange={(v) => setForm({ ...form, fleetNumber: v })} />
                <Field label="VIN" value={form.vin} onChange={(v) => setForm({ ...form, vin: v })} />
                <Field label="Colour" value={form.colour} onChange={(v) => setForm({ ...form, colour: v })} />
                <Field label="Make" value={form.make} onChange={(v) => setForm({ ...form, make: v })} required />
                <Field label="Model" value={form.model} onChange={(v) => setForm({ ...form, model: v })} required />
                <Field label="Model year" value={form.modelYear} onChange={(v) => setForm({ ...form, modelYear: v })} type="number" />
                <label className="block text-sm">
                  <span className="text-slate-600">Category</span>
                  <select
                    value={form.vehicleCategory}
                    onChange={(e) => setForm({ ...form, vehicleCategory: e.target.value as VehicleCategory })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    {Object.entries(VEHICLE_CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-slate-600">Home depot</span>
                  <select
                    value={form.homeDepotId}
                    onChange={(e) => setForm({ ...form, homeDepotId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    {depots.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </SectionCard>
          )}

          {step === 'ownership' && (
            <SectionCard title="Ownership" description="Path toggles which agreement fields apply (Phase 1).">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="text-slate-600">Ownership path</span>
                  <select
                    value={form.ownershipType}
                    onChange={(e) => setForm({ ...form, ownershipType: e.target.value as OwnershipType })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    {Object.entries(OWNERSHIP_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Owner / lessor / supplier name"
                  value={form.ownerName}
                  onChange={(v) => setForm({ ...form, ownerName: v })}
                  className="sm:col-span-2"
                />
              </div>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {OWNERSHIP_DOCS[form.ownershipType].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </SectionCard>
          )}

          {step === 'configuration' && (
            <SectionCard title="Configuration" description="Capacity, accessibility and fuel.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Seating capacity"
                  value={form.seatingCapacity}
                  onChange={(v) => setForm({ ...form, seatingCapacity: v })}
                  type="number"
                  required
                />
                <Field
                  label="Wheelchair capacity"
                  value={form.wheelchairCapacity}
                  onChange={(v) => setForm({ ...form, wheelchairCapacity: v })}
                  type="number"
                />
                <Field
                  label="Standing capacity"
                  value={form.standingCapacity}
                  onChange={(v) => setForm({ ...form, standingCapacity: v })}
                  type="number"
                />
                <label className="block text-sm">
                  <span className="text-slate-600">Fuel type</span>
                  <select
                    value={form.fuelType}
                    onChange={(e) => setForm({ ...form, fuelType: e.target.value as FuelType })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    {Object.entries(FUEL_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </SectionCard>
          )}

          {step === 'compliance' && (
            <SectionCard title="Compliance documents" description="Enter expiry dates — certificates are recorded for verification.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="MOT expiry" value={form.motExpiry} onChange={(v) => setForm({ ...form, motExpiry: v })} type="date" />
                <Field
                  label="Insurance expiry"
                  value={form.insuranceExpiry}
                  onChange={(v) => setForm({ ...form, insuranceExpiry: v })}
                  type="date"
                />
                <Field label="Tax expiry" value={form.taxExpiry} onChange={(v) => setForm({ ...form, taxExpiry: v })} type="date" />
              </div>
            </SectionCard>
          )}

          {step === 'maintenance' && (
            <SectionCard title="Maintenance programme" description="Next planned service.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Next maintenance date"
                  value={form.nextMaintenanceDate}
                  onChange={(v) => setForm({ ...form, nextMaintenanceDate: v })}
                  type="date"
                />
                <Field
                  label="Next maintenance mileage"
                  value={form.nextMaintenanceMileage}
                  onChange={(v) => setForm({ ...form, nextMaintenanceMileage: v })}
                  type="number"
                />
              </div>
            </SectionCard>
          )}

          {step === 'technology' && (
            <SectionCard title="Technology / telematics" description="Device identity for live tracking.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Telematics provider"
                  value={form.telematicsProvider}
                  onChange={(v) => setForm({ ...form, telematicsProvider: v })}
                />
                <Field
                  label="Device ID"
                  value={form.telematicsDeviceId}
                  onChange={(v) => setForm({ ...form, telematicsDeviceId: v })}
                />
              </div>
            </SectionCard>
          )}

          {step === 'depot_yard' && (
            <SectionCard title="Depot and Yard" description="Where the vehicle lives when not on duty.">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="text-slate-600">Home depot</span>
                  <select
                    value={form.homeDepotId}
                    onChange={(e) => setForm({ ...form, homeDepotId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    {depots.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="Parking bay" value={form.parkingBay} onChange={(v) => setForm({ ...form, parkingBay: v })} />
                <Field
                  label="Current location label"
                  value={form.currentLocationLabel}
                  onChange={(v) => setForm({ ...form, currentLocationLabel: v })}
                />
              </div>
            </SectionCard>
          )}

          {step === 'equipment' && (
            <SectionCard title="Equipment" description="Confirm inventory has been started on the vehicle profile.">
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.equipmentConfirmed}
                  onChange={(e) => setForm({ ...form, equipmentConfirmed: e.target.checked })}
                  className="mt-1"
                />
                <span>
                  Equipment inventory started (fire extinguisher, first aid, fuel card and accessibility kit). Fine-tune on
                  the Equipment tab after activation.
                </span>
              </label>
              {id && (
                <Link to={`/vehicles/${id}?tab=equipment`} className="mt-3 inline-block text-sm font-medium text-command-600 hover:underline">
                  Open equipment tab
                </Link>
              )}
            </SectionCard>
          )}

          {step === 'baseline_inspection' && (
            <SectionCard title="Baseline inspection" description="Yard records baseline body condition.">
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.baselineConfirmed}
                  onChange={(e) => setForm({ ...form, baselineConfirmed: e.target.checked })}
                  className="mt-1"
                />
                <span>Baseline inspection scheduled or recorded on at least three body zones.</span>
              </label>
              {id && (
                <Link to={`/vehicles/${id}?tab=damage`} className="mt-3 inline-block text-sm font-medium text-command-600 hover:underline">
                  Open damage map
                </Link>
              )}
            </SectionCard>
          )}

          {step === 'driver_checks' && (
            <SectionCard title="Driver checks template" description="Template drivers use at point of use.">
              <label className="block text-sm">
                <span className="text-slate-600">Walkaround template</span>
                <select
                  value={form.driverCheckTemplate}
                  onChange={(e) => setForm({ ...form, driverCheckTemplate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                >
                  <option value="standard_walkaround">Standard walkaround</option>
                  <option value="accessible_minibus">Accessible minibus</option>
                  <option value="coach">Coach</option>
                  <option value="school_run">School run</option>
                </select>
              </label>
            </SectionCard>
          )}

          {step === 'eligibility' && (
            <SectionCard title="Eligibility rules" description="Capabilities Dispatch may require.">
              <div className="space-y-2">
                {VEHICLE_CAPABILITY_OPTIONS.map((opt) => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.capabilityKeys.includes(opt.key)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          capabilityKeys: e.target.checked
                            ? [...form.capabilityKeys, opt.key]
                            : form.capabilityKeys.filter((k) => k !== opt.key),
                        })
                      }
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </SectionCard>
          )}

          {step === 'review' && vehicle && (
            <SectionCard title="Review and activation" description="Safety-critical blockers cannot be overridden.">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Meta label="Registration" value={vehicle.registrationNumber} />
                <Meta label="Vehicle" value={`${vehicle.make} ${vehicle.model}`} />
                <Meta label="Depot" value={vehicle.homeDepotName} />
                <Meta label="Ownership" value={OWNERSHIP_TYPE_LABELS[vehicle.ownershipType]} />
                <Meta label="Capacity" value={`${vehicle.seatingCapacity} seats · ${vehicle.wheelchairCapacity} WC`} />
                <Meta
                  label="Assignment eligible"
                  value={vehicle.readiness.assignmentEligible ? 'Yes' : 'No — awaiting onboarding or blocked'}
                />
              </dl>

              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-slate-800">Release decision</p>
                <StatusPill status={vehicle.releaseDecision} />
                {vehicle.readiness.blockingReasons.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-red-700">
                    {vehicle.readiness.blockingReasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
                {vehicle.readiness.warningReasons.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-amber-700">
                    {vehicle.readiness.warningReasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>

              {vehicle.readiness.warningReasons.length > 0 && (
                <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={ackWarnings} onChange={(e) => setAckWarnings(e.target.checked)} className="mt-1" />
                  <span>I acknowledge the warnings above. Hard safety blocks still cannot be overridden.</span>
                </label>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => activate.mutate('submit_for_approval')}
                  className="rounded-lg border border-command-200 bg-command-50 px-4 py-2 text-sm font-medium text-command-800 hover:bg-command-100"
                >
                  Submit for approval
                </button>
                <button
                  type="button"
                  disabled={pending || (!probeEligible && vehicle.release.failures.some((f) => f.severity === 'block' && f.code !== 'lifecycle_inactive'))}
                  onClick={() => activate.mutate('activate')}
                  className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
                >
                  Activate with warnings
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => activate.mutate('keep_blocked')}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
                >
                  Keep blocked
                </button>
              </div>
            </SectionCard>
          )}

          {step !== 'review' && (
            <div className="flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void handleContinue()}
                className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
              >
                {step === 'identity' && isNew ? 'Create and continue' : 'Save and continue'}
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
  type = 'text',
  required,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  className?: string
}) {
  const inputId = `veh-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <label htmlFor={inputId} className={cn('block text-sm', className)}>
      <span className="text-slate-600">
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        id={inputId}
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
      />
    </label>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}
