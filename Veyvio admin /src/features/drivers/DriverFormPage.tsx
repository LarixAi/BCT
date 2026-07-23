import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { EMPLOYMENT_TYPE_LABELS, WORK_PERMISSION_OPTIONS } from '@/lib/drivers/constants'
import type { CreateDriverInput, EmploymentType, UpdateDriverInput } from '@/lib/drivers/types'
import { DriverBackLink } from './components/DriverProfileHeader'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function DriverFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['driver-profile', id],
    queryFn: () => api.getDriverProfile(id!),
    enabled: isEdit,
  })

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [preferredName, setPreferredName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [employmentType, setEmploymentType] = useState<EmploymentType>('employee')
  const [depotId, setDepotId] = useState('depot-wembley')
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [startDate, setStartDate] = useState('')
  const [workPermissionKeys, setWorkPermissionKeys] = useState<string[]>(['psv', 'contract'])
  const [sendInvitation, setSendInvitation] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!existing) return
    setFirstName(existing.firstName)
    setLastName(existing.lastName)
    setPreferredName(existing.preferredName ?? '')
    setEmail(existing.email ?? '')
    setPhone(existing.phone ?? '')
    setEmploymentType(existing.employmentType)
    setDepotId(existing.depotId ?? 'depot-wembley')
    setEmployeeNumber(existing.employeeNumber ?? '')
    setStartDate(existing.startDate ?? '')
    setWorkPermissionKeys(existing.workPermissions.filter((p) => p.enabled).map((p) => p.key))
  }, [existing])

  const save = useMutation({
    mutationFn: async () => {
      if (isEdit && id) {
        const input: UpdateDriverInput = {
          firstName,
          lastName,
          preferredName: preferredName || null,
          email,
          phone,
          employmentType,
          depotId,
          employeeNumber: employeeNumber || null,
          startDate: startDate || null,
          workPermissionKeys,
        }
        return api.updateDriver(id, input, actorName)
      }
      const input: CreateDriverInput = {
        firstName,
        lastName,
        preferredName: preferredName || null,
        email,
        phone,
        employmentType,
        depotId,
        employeeNumber: employeeNumber || null,
        startDate: startDate || null,
        workPermissionKeys,
        sendInvitation,
        invitationChannel: 'email',
      }
      return api.createDriver(input, actorName)
    },
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: ['driver-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['driver-directory-summary'] })
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      navigate(`/drivers/${profile.id}`)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Save failed'),
  })

  function togglePerm(key: string) {
    setWorkPermissionKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.')
      return
    }
    if (!email.trim() || !phone.trim()) {
      setError('Email and phone are required.')
      return
    }
    save.mutate()
  }

  if (isEdit && isLoading) return <p className="text-sm text-muted">Loading…</p>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <DriverBackLink />
      <div>
        <h1 className="text-2xl font-semibold text-ink">{isEdit ? 'Edit driver' : 'Add driver'}</h1>
        <p className="text-sm text-ink-soft">
          {isEdit
            ? 'Update profile information and work permissions.'
            : 'Create a driver record and optionally send a secure app invitation.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <SectionCard title="Personal details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" value={firstName} onChange={setFirstName} required />
            <Field label="Last name" value={lastName} onChange={setLastName} required />
            <Field label="Preferred name" value={preferredName} onChange={setPreferredName} className="sm:col-span-2" />
            <Field label="Email" value={email} onChange={setEmail} type="email" required />
            <Field label="Phone" value={phone} onChange={setPhone} type="tel" required />
          </div>
        </SectionCard>

        <SectionCard title="Employment">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-soft">Employment type</span>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              >
                {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Primary depot</span>
              <select
                value={depotId}
                onChange={(e) => setDepotId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              >
                <option value="depot-wembley">Wembley Depot</option>
                <option value="depot-croydon">Croydon Depot</option>
              </select>
            </label>
            <Field label="Employee number" value={employeeNumber} onChange={setEmployeeNumber} />
            <Field label="Start date" value={startDate} onChange={setStartDate} type="date" />
          </div>
        </SectionCard>

        <SectionCard title="Work permissions">
          <p className="mb-3 text-xs text-muted">Determines which job types this driver can be assigned to.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {WORK_PERMISSION_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={workPermissionKeys.includes(opt.key)}
                  onChange={() => togglePerm(opt.key)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </SectionCard>

        {!isEdit && (
          <SectionCard title="App invitation">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={sendInvitation}
                onChange={(e) => setSendInvitation(e.target.checked)}
                className="mt-1"
              />
              <span>
                Send secure email invitation after creating the record. The driver creates their own password — it is
                never shown to administrators.
              </span>
            </label>
          </SectionCard>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

        <div className="flex justify-end gap-3">
          <Link
            to={isEdit && id ? `/drivers/${id}` : '/drivers'}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create driver'}
          </button>
        </div>
      </form>
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
    <label className={`block text-sm ${className ?? ''}`}>
      <span className="text-ink-soft">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
      />
    </label>
  )
}
