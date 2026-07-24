import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { DEPARTMENTS, STAFF_ROLES } from '@/lib/staff/constants'
import type { CreateStaffInput, StaffApplication } from '@/lib/staff/types'
import { api } from '@/lib/api/client'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const STEPS = ['Identity', 'Employment', 'Assignment', 'Access', 'Review'] as const

export function StaffFormPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const [step, setStep] = useState(0)

  const { data: depots = [] } = useQuery({ queryKey: tKey(['depots']), queryFn: () => api.getDepots() })
  const { data: managers = [] } = useQuery({ queryKey: tKey(['staff-profiles']), queryFn: () => api.getStaffProfiles() })

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [preferredName, setPreferredName] = useState('')
  const [workEmail, setWorkEmail] = useState('')
  const [mobilePhone, setMobilePhone] = useState('')
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [isContractor, setIsContractor] = useState(false)
  const [jobTitle, setJobTitle] = useState('')
  const [departmentId, setDepartmentId] = useState('dept-operations')
  const [lineManagerId, setLineManagerId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [contractType, setContractType] = useState<CreateStaffInput['contractType']>('full_time')
  const [primaryDepotId, setPrimaryDepotId] = useState('depot-wembley')
  const [team, setTeam] = useState('')
  const [roleKey, setRoleKey] = useState('dispatcher')
  const [scopeType, setScopeType] = useState<CreateStaffInput['scopeType']>('depot')
  const [applications, setApplications] = useState<StaffApplication[]>(['command'])
  const [sendInvitation, setSendInvitation] = useState(true)

  const create = useMutation({
    mutationFn: (input: CreateStaffInput) => api.createStaff(input, actorName),
    onSuccess: (profile) => navigate(`/staff/${profile.id}`),
  })

  const roleDef = STAFF_ROLES.find((r) => r.key === roleKey)

  useEffect(() => {
    const roleApps = roleDef?.applications ?? []
    if (!roleApps.length) return
    setApplications((prev) => {
      const next = new Set(prev)
      for (const app of roleApps) next.add(app)
      return [...next]
    })
  }, [roleKey, roleDef?.applications])

  function toggleApp(app: StaffApplication) {
    setApplications((prev) => (prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]))
  }

  function submit() {
    create.mutate({
      firstName,
      lastName,
      preferredName: preferredName || undefined,
      workEmail,
      mobilePhone: mobilePhone || undefined,
      employeeNumber: employeeNumber || undefined,
      isContractor,
      jobTitle,
      departmentId,
      lineManagerId: lineManagerId || undefined,
      startDate,
      contractType,
      primaryDepotId,
      team: team || undefined,
      roleKey,
      scopeType,
      scopeDepotIds: scopeType === 'depot' ? [primaryDepotId] : undefined,
      applications,
      sendInvitation,
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/staff" className="text-sm text-command-600 hover:underline">← Back to staff</Link>
      <h1 className="text-2xl font-semibold text-ink">Add staff member</h1>

      <div className="flex gap-2 text-xs">
        {STEPS.map((s, i) => (
          <span key={s} className={`rounded-full px-2 py-1 ${i === step ? 'bg-command-100 text-command-800' : 'bg-surface-muted text-ink-soft'}`}>
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {step === 0 && (
        <SectionCard title="Basic identity">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name" value={firstName} onChange={setFirstName} />
            <Field label="Last name" value={lastName} onChange={setLastName} />
            <Field label="Preferred name" value={preferredName} onChange={setPreferredName} />
            <Field label="Work email" value={workEmail} onChange={setWorkEmail} type="email" />
            <Field label="Mobile" value={mobilePhone} onChange={setMobilePhone} />
            <Field label="Employee number" value={employeeNumber} onChange={setEmployeeNumber} />
            <label className="flex items-center gap-2 sm:col-span-2 text-sm">
              <input type="checkbox" checked={isContractor} onChange={(e) => setIsContractor(e.target.checked)} />
              Contractor
            </label>
          </div>
        </SectionCard>
      )}

      {step === 1 && (
        <SectionCard title="Employment">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Job title" value={jobTitle} onChange={setJobTitle} />
            <label className="block text-sm">
              <span className="text-ink-soft">Department</span>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
                {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Line manager</span>
              <select value={lineManagerId} onChange={(e) => setLineManagerId(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
                <option value="">—</option>
                {managers.filter((m) => m.employmentStatus === 'active').map((m) => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                ))}
              </select>
            </label>
            <Field label="Start date" value={startDate} onChange={setStartDate} type="date" />
            <label className="block text-sm">
              <span className="text-ink-soft">Contract type</span>
              <select value={contractType} onChange={(e) => setContractType(e.target.value as CreateStaffInput['contractType'])} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="agency">Agency</option>
                <option value="contractor">Contractor</option>
              </select>
            </label>
          </div>
        </SectionCard>
      )}

      {step === 2 && (
        <SectionCard title="Operational assignment">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-soft">Primary depot</span>
              <select value={primaryDepotId} onChange={(e) => setPrimaryDepotId(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
                {depots.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <Field label="Team" value={team} onChange={setTeam} />
          </div>
        </SectionCard>
      )}

      {step === 3 && (
        <SectionCard title="Role and application access">
          <div className="grid gap-3">
            <label className="block text-sm">
              <span className="text-ink-soft">Permission role</span>
              <select value={roleKey} onChange={(e) => setRoleKey(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
                {STAFF_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Scope</span>
              <select value={scopeType} onChange={(e) => setScopeType(e.target.value as CreateStaffInput['scopeType'])} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5">
                <option value="company">Entire company</option>
                <option value="depot">Specific depot</option>
                <option value="department">Department</option>
              </select>
            </label>
            <div className="text-sm">
              <p className="mb-2 text-ink-soft">Applications</p>
              {(['command', 'yard', 'maintenance', 'driver', 'reports'] as StaffApplication[]).map((app) => (
                <label key={app} className="mr-4 inline-flex items-center gap-2">
                  <input type="checkbox" checked={applications.includes(app)} onChange={() => toggleApp(app)} />
                  {app}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sendInvitation} onChange={(e) => setSendInvitation(e.target.checked)} />
              Send account invitation immediately
            </label>
          </div>
        </SectionCard>
      )}

      {step === 4 && (
        <SectionCard title="Review">
          <div className="space-y-2 text-sm text-ink-soft">
            <p><strong>{firstName} {lastName}</strong> will be added as <strong>{jobTitle}</strong>.</p>
            <p>Role: {roleDef?.label} · Scope: {scopeType === 'company' ? 'Entire company' : depots.find((d) => d.id === primaryDepotId)?.name}</p>
            <p>Applications: {applications.join(', ') || 'None'}</p>
            {sendInvitation && <p className="text-command-700">An invitation will be sent to {workEmail}.</p>}
            {roleDef?.elevated && <p className="text-amber-800">This role includes elevated permissions.</p>}
          </div>
        </SectionCard>
      )}

      <div className="flex gap-2">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded-lg border border-border px-4 py-2 text-sm">
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={() => setStep((s) => s + 1)} className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white">
            Continue
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={create.isPending || !firstName || !lastName || !workEmail || !jobTitle} className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            Create staff member
          </button>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-ink-soft">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
    </label>
  )
}
