import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import {
  DOCUMENT_REQUIREMENT_OPTIONS,
  EMPLOYMENT_TYPE_LABELS,
  ONBOARDING_STEPS,
  OPERATIONAL_STATUS_LABELS,
  ACCOUNT_STATUS_LABELS,
  RESTRICTION_OPTIONS,
  WORK_PERMISSION_OPTIONS,
} from '@/lib/drivers/constants'
import type {
  CreateDriverInput,
  EmploymentType,
  InvitationChannel,
  OnboardingStepId,
  UpdateDriverInput,
} from '@/lib/drivers/types'
import { ActivationResolutionCentre } from '../components/ActivationResolutionCentre'
import { AppInvitePanel } from '../components/AppInvitePanel'
import { DriverBackLink } from '../components/DriverProfileHeader'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/cn'
import { canManageDriverAccess } from '@/lib/drivers/permissions'

const STEP_INDEX: Record<OnboardingStepId, number> = {
  personal: 0,
  employment: 1,
  documents: 2,
  capabilities: 3,
  account: 4,
  review: 5,
}

export function DriverOnboardingWizard() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const isNew = !id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const stepParam = (params.get('step') as OnboardingStepId | null) ?? 'personal'
  const [step, setStep] = useState<OnboardingStepId>(STEP_INDEX[stepParam] != null ? stepParam : 'personal')
  const [error, setError] = useState('')

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver-profile', id],
    queryFn: () => api.getDriverProfile(id!),
    enabled: Boolean(id),
  })

  const { data: depots = [] } = useQuery({
    queryKey: ['depots'],
    queryFn: () => api.getDepots(),
  })

  useEffect(() => {
    if (driver?.onboardingStep && STEP_INDEX[driver.onboardingStep] != null) {
      setStep(driver.onboardingStep)
    }
  }, [driver?.onboardingStep])

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    homeAddress: '',
    emergencyContact: '',
    employeeNumber: '',
    employmentType: 'employee' as EmploymentType,
    startDate: '',
    depotId: '',
    secondaryDepotIds: [] as string[],
    managerName: '',
    licenceNumber: '',
    licenceCountry: 'GB',
    licenceExpiry: '',
    licenceCategories: '',
    dqcNumber: '',
    cpcExpiry: '',
    tachoCardNumber: '',
    tachoCardExpiry: '',
    dbsExpiry: '',
    medicalExpiry: '',
    rightToWorkStatus: '',
    workPermissionKeys: ['school', 'psv'] as string[],
    restrictionTypes: [] as string[],
    inviteChannel: 'email' as InvitationChannel,
  })

  useEffect(() => {
    if (!form.depotId && depots[0]?.id) {
      setForm((f) => ({ ...f, depotId: depots[0]!.id }))
    }
  }, [depots, form.depotId])

  useEffect(() => {
    if (!driver) return
    setForm((f) => ({
      ...f,
      firstName: driver.firstName,
      lastName: driver.lastName,
      preferredName: driver.preferredName ?? '',
      dateOfBirth: driver.dateOfBirth ?? '',
      email: driver.email ?? '',
      phone: driver.phone ?? '',
      homeAddress: driver.homeAddress ?? '',
      emergencyContact: driver.emergencyContact ?? '',
      employeeNumber: driver.employeeNumber ?? '',
      employmentType: driver.employmentType,
      startDate: driver.startDate ?? '',
      depotId: driver.depotId ?? f.depotId,
      secondaryDepotIds: driver.secondaryDepotIds ?? [],
      managerName: driver.managerName ?? '',
      licenceNumber: driver.licenceNumber ?? '',
      licenceCountry: driver.licenceCountry ?? 'GB',
      licenceExpiry: driver.licenceExpiry ?? '',
      licenceCategories: driver.licenceCategories ?? '',
      dqcNumber: driver.dqcNumber ?? '',
      cpcExpiry: driver.cpcExpiry ?? '',
      tachoCardNumber: driver.tachoCardNumber ?? '',
      tachoCardExpiry: driver.tachoCardExpiry ?? '',
      dbsExpiry: driver.dbsExpiry ?? '',
      medicalExpiry: driver.medicalExpiry ?? '',
      rightToWorkStatus: driver.rightToWorkStatus ?? '',
      workPermissionKeys: driver.workPermissions.filter((p) => p.enabled).map((p) => p.key),
      restrictionTypes: driver.restrictions.filter((r) => r.status === 'active').map((r) => r.type),
    }))
  }, [driver])

  const stepIdx = STEP_INDEX[step]

  function goStep(next: OnboardingStepId, driverId?: string) {
    setStep(next)
    const targetId = driverId ?? id
    if (targetId) navigate(`/drivers/${targetId}/onboarding?step=${next}`, { replace: true })
  }

  const createDraft = useMutation({
    mutationFn: async () => {
      const input: CreateDriverInput = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        preferredName: form.preferredName || null,
        dateOfBirth: form.dateOfBirth || null,
        email: form.email.trim(),
        phone: form.phone.trim(),
        homeAddress: form.homeAddress || null,
        emergencyContact: form.emergencyContact || null,
        employmentType: form.employmentType,
        depotId: form.depotId,
        employeeNumber: form.employeeNumber || null,
        startDate: form.startDate || null,
        sendInvitation: false,
      }
      return api.createDriver(input, actorName)
    },
    onSuccess: async (profile) => {
      queryClient.invalidateQueries({ queryKey: ['driver-profiles'] })
      await api.updateDriver(profile.id, { onboardingStep: 'employment', operationalStatus: 'onboarding', employmentStatus: 'onboarding' }, actorName)
      navigate(`/drivers/${profile.id}/onboarding?step=employment`)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not save draft'),
  })

  const saveStep = useMutation({
    mutationFn: async (nextStep: OnboardingStepId) => {
      if (!id) throw new Error('Save the personal draft first')
      const patch: UpdateDriverInput = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        preferredName: form.preferredName || null,
        dateOfBirth: form.dateOfBirth || null,
        email: form.email.trim(),
        phone: form.phone.trim(),
        homeAddress: form.homeAddress || null,
        emergencyContact: form.emergencyContact || null,
        employmentType: form.employmentType,
        depotId: form.depotId,
        secondaryDepotIds: form.secondaryDepotIds,
        employeeNumber: form.employeeNumber || null,
        startDate: form.startDate || null,
        managerName: form.managerName || null,
        licenceNumber: form.licenceNumber || null,
        licenceCountry: form.licenceCountry || null,
        licenceExpiry: form.licenceExpiry || null,
        licenceCategories: form.licenceCategories || null,
        dqcNumber: form.dqcNumber || null,
        cpcExpiry: form.cpcExpiry || null,
        tachoCardNumber: form.tachoCardNumber || null,
        tachoCardExpiry: form.tachoCardExpiry || null,
        dbsExpiry: form.dbsExpiry || null,
        medicalExpiry: form.medicalExpiry || null,
        rightToWorkStatus: form.rightToWorkStatus || null,
        workPermissionKeys: form.workPermissionKeys,
        onboardingStep: nextStep,
        operationalStatus: nextStep === 'review' ? 'pending_compliance' : 'onboarding',
        employmentStatus: 'onboarding',
      }
      let profile = await api.updateDriver(id, patch, actorName)

      // Sync selected restrictions (replace active set for selected types)
      for (const type of form.restrictionTypes) {
        const exists = profile.restrictions.some((r) => r.type === type && r.status === 'active')
        if (!exists) {
          const opt = RESTRICTION_OPTIONS.find((o) => o.type === type)
          profile = await api.addDriverRestriction(
            id,
            { type, label: opt?.label ?? type, reason: 'Recorded during onboarding' },
            actorName,
          )
        }
      }
      return profile
    },
    onSuccess: (profile, nextStep) => {
      queryClient.setQueryData(['driver-profile', id], profile)
      goStep(nextStep, profile.id)
      setError('')
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not save step'),
  })

  const invite = useMutation({
    mutationFn: async () => {
      const profile = await api.createDriverAppAccount(id!, { channel: form.inviteChannel }, actorName)
      return api.updateDriver(
        id!,
        { onboardingStep: 'review', operationalStatus: 'pending_compliance', employmentStatus: 'onboarding' },
        actorName,
      ).catch(() => profile)
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(['driver-profile', id], profile)
      goStep('review', profile.id)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not create app account'),
  })

  const activate = useMutation({
    mutationFn: () => api.activateDriver(id!, {}, actorName),
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: ['driver-profiles'] })
      navigate(`/drivers/${profile.id}`)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Activation blocked'),
  })

  const uploadDoc = useMutation({
    mutationFn: (req: { type: string; label: string }) =>
      api.uploadDriverDocument(
        id!,
        {
          requirementType: req.type,
          label: req.label,
          fileName: `${req.type}.pdf`,
          expiryDate: req.type === 'driving_licence' ? form.licenceExpiry || null : req.type === 'dqc' ? form.cpcExpiry || null : req.type === 'dbs' ? form.dbsExpiry || null : req.type === 'medical' ? form.medicalExpiry || null : null,
          referenceNumber: req.type === 'driving_licence' ? form.licenceNumber || null : req.type === 'dqc' ? form.dqcNumber || null : null,
        },
        actorName,
      ),
    onSuccess: (profile) => queryClient.setQueryData(['driver-profile', id], profile),
    onError: (e) => setError(e instanceof Error ? e.message : 'Upload failed'),
  })

  const pending = createDraft.isPending || saveStep.isPending || invite.isPending || activate.isPending

  const eligibility = driver?.eligibility

  function validatePersonal() {
    if (!form.firstName.trim() || !form.lastName.trim()) return 'First and last name are required.'
    if (!form.email.trim() || !form.phone.trim()) return 'Email and mobile number are required.'
    return null
  }

  function validateDocuments() {
    if (!form.licenceExpiry.trim()) {
      return 'Enter the driving licence expiry date before continuing — it is required for eligibility.'
    }
    return null
  }

  async function handleContinue() {
    setError('')
    if (step === 'personal') {
      const v = validatePersonal()
      if (v) {
        setError(v)
        return
      }
      if (isNew) createDraft.mutate()
      else saveStep.mutate('employment')
      return
    }
    if (step === 'employment') {
      saveStep.mutate('documents')
      return
    }
    if (step === 'documents') {
      const v = validateDocuments()
      if (v) {
        setError(v)
        return
      }
      saveStep.mutate('capabilities')
      return
    }
    if (step === 'capabilities') {
      saveStep.mutate('account')
      return
    }
    if (step === 'account') {
      invite.mutate()
      return
    }
    if (step === 'review') {
      activate.mutate()
    }
  }

  function handleBack() {
    const prev = ONBOARDING_STEPS[stepIdx - 1]
    if (!prev) {
      navigate('/drivers')
      return
    }
    goStep(prev.id)
  }

  if (id && isLoading) return <p className="text-sm text-muted">Loading driver…</p>

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <DriverBackLink />
      <div>
        <h1 className="text-2xl font-semibold text-ink">{isNew ? 'Add driver' : `Onboard ${driver?.firstName ?? 'driver'}`}</h1>
        <p className="mt-1 text-sm text-muted">
          Creating the driver record, proving eligibility, and granting Driver app access are three separate decisions.
        </p>
        {driver && (
          <p className="mt-2 text-xs text-muted">
            Operational: <strong className="text-ink">{OPERATIONAL_STATUS_LABELS[driver.operationalStatus]}</strong>
            {' · '}
            Account: <strong className="text-ink">{ACCOUNT_STATUS_LABELS[driver.account.accountStatus]}</strong>
          </p>
        )}
      </div>

      <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ONBOARDING_STEPS.map((s, i) => {
          const active = s.id === step
          const done = i < stepIdx
          return (
            <li
              key={s.id}
              className={cn(
                'rounded-lg border px-2 py-2 text-center',
                active ? 'border-command-500 bg-command-50' : done ? 'border-ready/40 bg-ready/5' : 'border-border bg-white',
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{i + 1}</p>
              <p className={cn('text-xs font-semibold', active ? 'text-command-700' : 'text-ink')}>{s.label}</p>
            </li>
          )
        })}
      </ol>

      {error && <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

      {step === 'personal' && (
        <SectionCard title="Personal details" description="No app login is created at this stage.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
            <Field label="Last name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
            <Field label="Preferred name" value={form.preferredName} onChange={(v) => setForm({ ...form, preferredName: v })} className="sm:col-span-2" />
            <Field label="Date of birth" value={form.dateOfBirth} onChange={(v) => setForm({ ...form, dateOfBirth: v })} type="date" />
            <Field label="Employee or driver number" value={form.employeeNumber} onChange={(v) => setForm({ ...form, employeeNumber: v })} />
            <Field label="Work or personal email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" required />
            <Field label="Mobile number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" required />
            <Field label="Home address" value={form.homeAddress} onChange={(v) => setForm({ ...form, homeAddress: v })} className="sm:col-span-2" />
            <Field label="Emergency contact" value={form.emergencyContact} onChange={(v) => setForm({ ...form, emergencyContact: v })} className="sm:col-span-2" />
          </div>
        </SectionCard>
      )}

      {step === 'employment' && (
        <SectionCard title="Employment and depot" description="Operational setup — still no Driver app account.">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-soft">Employment type</span>
              <select
                value={form.employmentType}
                onChange={(e) => setForm({ ...form, employmentType: e.target.value as EmploymentType })}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              >
                {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </label>
            <Field label="Start date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} type="date" />
            <label className="block text-sm">
              <span className="text-ink-soft">Primary depot</span>
              <select
                value={form.depotId}
                onChange={(e) => setForm({ ...form, depotId: e.target.value, secondaryDepotIds: form.secondaryDepotIds.filter((d) => d !== e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              >
                {depots.length === 0 && <option value="">No depots available</option>}
                {depots.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <Field label="Line manager" value={form.managerName} onChange={(v) => setForm({ ...form, managerName: v })} />
            <label className="block text-sm sm:col-span-2">
              <span className="text-ink-soft">Additional depots</span>
              <div className="mt-2 flex flex-wrap gap-3">
                {depots.filter((d) => d.id !== form.depotId).map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.secondaryDepotIds.includes(d.id)}
                      onChange={() =>
                        setForm({
                          ...form,
                          secondaryDepotIds: form.secondaryDepotIds.includes(d.id)
                            ? form.secondaryDepotIds.filter((x) => x !== d.id)
                            : [...form.secondaryDepotIds, d.id],
                        })
                      }
                    />
                    {d.name}
                  </label>
                ))}
                {depots.filter((d) => d.id !== form.depotId).length === 0 && (
                  <p className="text-sm text-muted">No additional depots configured.</p>
                )}
              </div>
            </label>
          </div>
        </SectionCard>
      )}

      {step === 'documents' && (
        <SectionCard title="Licence and documents" description="Driving licence expiry is required for activation. Upload files after entering dates.">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <Field label="Driving licence number" value={form.licenceNumber} onChange={(v) => setForm({ ...form, licenceNumber: v })} />
            <Field label="Licence country" value={form.licenceCountry} onChange={(v) => setForm({ ...form, licenceCountry: v })} />
            <Field label="Licence expiry" value={form.licenceExpiry} onChange={(v) => setForm({ ...form, licenceExpiry: v })} type="date" />
            <Field label="Licence categories" value={form.licenceCategories} onChange={(v) => setForm({ ...form, licenceCategories: v })} />
            <Field label="DQC / CPC number" value={form.dqcNumber} onChange={(v) => setForm({ ...form, dqcNumber: v })} />
            <Field label="DQC / CPC expiry" value={form.cpcExpiry} onChange={(v) => setForm({ ...form, cpcExpiry: v })} type="date" />
            <Field label="Tachograph card number" value={form.tachoCardNumber} onChange={(v) => setForm({ ...form, tachoCardNumber: v })} />
            <Field label="Tachograph card expiry" value={form.tachoCardExpiry} onChange={(v) => setForm({ ...form, tachoCardExpiry: v })} type="date" />
            <Field label="DBS expiry / review" value={form.dbsExpiry} onChange={(v) => setForm({ ...form, dbsExpiry: v })} type="date" />
            <Field label="Medical expiry" value={form.medicalExpiry} onChange={(v) => setForm({ ...form, medicalExpiry: v })} type="date" />
            <Field label="Right-to-work status" value={form.rightToWorkStatus} onChange={(v) => setForm({ ...form, rightToWorkStatus: v })} className="sm:col-span-2" />
          </div>
          {!id ? (
            <p className="text-sm text-muted">Save personal details first to upload documents.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {DOCUMENT_REQUIREMENT_OPTIONS.map((req) => {
                const doc = driver?.documents.find((d) => d.requirementType === req.type || (req.type === 'dqc' && d.requirementType === 'cpc'))
                return (
                  <li key={req.type} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-medium text-ink">{req.label}</p>
                      <p className="text-xs text-muted">{doc ? doc.fileName : 'No file yet'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={doc?.verificationStatus ?? 'not_supplied'} />
                      <button
                        type="button"
                        disabled={uploadDoc.isPending}
                        onClick={() => uploadDoc.mutate(req)}
                        className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-command-700 hover:bg-command-50"
                      >
                        Upload
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>
      )}

      {step === 'capabilities' && (
        <>
          <SectionCard title="Capabilities" description="What work this driver may be assigned.">
            <div className="grid gap-2 sm:grid-cols-2">
              {WORK_PERMISSION_OPTIONS.map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.workPermissionKeys.includes(opt.key)}
                    onChange={() =>
                      setForm({
                        ...form,
                        workPermissionKeys: form.workPermissionKeys.includes(opt.key)
                          ? form.workPermissionKeys.filter((k) => k !== opt.key)
                          : [...form.workPermissionKeys, opt.key],
                      })
                    }
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Restrictions" description="Feeds Dispatch eligibility rules.">
            <div className="grid gap-2 sm:grid-cols-2">
              {RESTRICTION_OPTIONS.map((opt) => (
                <label key={opt.type} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.restrictionTypes.includes(opt.type)}
                    onChange={() =>
                      setForm({
                        ...form,
                        restrictionTypes: form.restrictionTypes.includes(opt.type)
                          ? form.restrictionTypes.filter((t) => t !== opt.type)
                          : [...form.restrictionTypes, opt.type],
                      })
                    }
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </SectionCard>
        </>
      )}

      {step === 'account' && (
        <>
          <SectionCard title="Create Driver app account" description="The driver creates their own password. Admins never see it.">
            <p className="mb-4 text-sm text-muted">
              This creates a user, company membership, driver role link, and a single-use invitation. It does not activate the driver for Dispatch.
            </p>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-ink">Invitation method</legend>
              {(['email', 'sms', 'both'] as InvitationChannel[]).map((ch) => (
                <label key={ch} className="flex items-center gap-2 text-sm capitalize">
                  <input
                    type="radio"
                    name="invite-channel"
                    checked={form.inviteChannel === ch}
                    onChange={() => setForm({ ...form, inviteChannel: ch })}
                  />
                  {ch}
                </label>
              ))}
            </fieldset>
            {driver?.account.devInvitationToken && (
              <p className="mt-4 rounded-lg bg-attention/10 px-3 py-2 text-xs text-attention">
                Temporary invite token (dev): <strong className="text-ink">{driver.account.devInvitationToken}</strong>
              </p>
            )}
            {['invitation_pending', 'active', 'setup_incomplete', 'pending_approval'].includes(
              driver?.account.accountStatus ?? '',
            ) && (
              <p className="mt-3 text-sm text-ready">
                Account status: {ACCOUNT_STATUS_LABELS[driver!.account.accountStatus]}
              </p>
            )}
          </SectionCard>
          {driver ? (
            <AppInvitePanel
              driver={driver}
              actorName={actorName}
              canManage={canManageDriverAccess(user?.permissions ?? [])}
            />
          ) : null}
        </>
      )}

      {step === 'review' && (
        !driver || !eligibility ? (
          <SectionCard title="Eligibility and activation">
            <p className="text-sm text-muted">Save earlier steps to run eligibility.</p>
          </SectionCard>
        ) : (
          <ActivationResolutionCentre
            driver={driver}
            actorName={actorName}
            canManage={canManageDriverAccess(user?.permissions ?? [])}
            mode="onboarding"
            activating={activate.isPending}
            onActivate={() => {
              setError('')
              activate.mutate()
            }}
          />
        )
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={handleBack} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-page">
          {stepIdx === 0 ? 'Cancel' : 'Back'}
        </button>
        <div className="flex gap-2">
          {step === 'personal' && isNew && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError('')
                const v = validatePersonal()
                if (v) {
                  setError(v)
                  return
                }
                createDraft.mutate()
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
            >
              Save as draft
            </button>
          )}
          {step === 'review' && id && (
            <Link to={`/drivers/${id}`} className="rounded-lg border border-border px-4 py-2 text-sm font-medium">
              Open profile
            </Link>
          )}
          <button
            type="button"
            disabled={pending || (step === 'review' && eligibility && !eligibility.canAssign)}
            onClick={handleContinue}
            className="rounded-lg bg-midnight px-4 py-2 text-sm font-semibold text-white hover:bg-command-700 disabled:opacity-50"
          >
            {pending
              ? 'Working…'
              : step === 'personal' && isNew
                ? 'Continue'
                : step === 'account'
                  ? 'Create app account'
                  : step === 'review'
                    ? 'Activate driver'
                    : 'Continue'}
          </button>
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
  return (
    <label className={cn('block text-sm', className)}>
      <span className="text-ink-soft">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-ink"
      />
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-1.5">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  )
}
