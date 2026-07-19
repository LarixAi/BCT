import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AuthLayout } from '@/components/brand/AuthLayout'
import { SectionCard } from '@/components/ui'
import { api, isMockApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

export function InviteUsersPage() {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [roleName, setRoleName] = useState('dispatcher')
  const [devToken, setDevToken] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => api.listInvitations(),
  })

  const create = useMutation({
    mutationFn: () => api.createInvitation({ email, roleName, appType: 'COMMAND' }),
    onSuccess: (result) => {
      setEmail('')
      setDevToken(result.devInvitationToken ?? null)
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Invitations</h1>
        <p className="text-sm text-slate-600">
          Staff, drivers and yard users join by invitation only. They cannot create a company from public signup.
        </p>
      </div>

      <SectionCard title="Invite a Command user" description="Sends a single-use link that expires in seven days.">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            create.mutate()
          }}
        >
          <label className="min-w-[220px] flex-1 text-sm">
            <span className="mb-1 block font-medium text-slate-700">Work email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="w-48 text-sm">
            <span className="mb-1 block font-medium text-slate-700">Role</span>
            <select
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="dispatcher">Dispatcher</option>
              <option value="company_administrator">Company administrator</option>
              <option value="transport_manager">Transport manager</option>
              <option value="yard_manager">Yard manager</option>
              <option value="compliance_manager">Compliance manager</option>
              <option value="read_only_auditor">Read-only auditor</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-semibold text-white hover:bg-command-700 disabled:opacity-60"
          >
            {create.isPending ? 'Sending…' : 'Create invitation'}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        {devToken && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Email delivery is not connected yet.{' '}
            <Link className="font-medium underline" to={`/accept-invitation?token=${encodeURIComponent(devToken)}`}>
              Open accept invitation link
            </Link>
          </p>
        )}
      </SectionCard>

      <SectionCard title="Pending and recent invitations" description={`${invitations.length} invitations`}>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : invitations.length === 0 ? (
          <p className="text-sm text-slate-500">No invitations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-3 font-medium">Email</th>
                  <th className="pb-2 pr-3 font-medium">App</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 font-medium">Expires</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50">
                    <td className="py-2 pr-3">{row.email}</td>
                    <td className="py-2 pr-3">{row.appType}</td>
                    <td className="py-2 pr-3 capitalize">{row.status}</td>
                    <td className="py-2">{row.expiresAt ? new Date(row.expiresAt).toLocaleString('en-GB') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

export function AcceptInvitationPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<{ email: string; appType?: string } | null>(null)

  const preview = useQuery({
    queryKey: ['invitation-preview', token],
    queryFn: () => api.previewInvitation(token),
    enabled: Boolean(token),
    retry: false,
  })

  const isDriverInvite = preview.data?.appType === 'DRIVER'

  useEffect(() => {
    if (!preview.data) return
    if (preview.data.firstName) setFirstName((current) => current || preview.data!.firstName!)
    if (preview.data.lastName) setLastName((current) => current || preview.data!.lastName!)
  }, [preview.data])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await api.acceptInvitation({ token, firstName, lastName, password })
      setDone({ email: result.email, appType: result.appType })
      if (result.appType !== 'DRIVER') {
        navigate('/login')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitation could not be accepted')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title={isDriverInvite ? 'Set up Veyvio Driver access' : 'Accept invitation'}
      subtitle={
        preview.data
          ? isDriverInvite
            ? `Create your Driver login for ${preview.data.companyName}`
            : `Join ${preview.data.companyName}`
          : 'Create your account from a secure invitation.'
      }
    >
      {!token && <p className="text-sm text-red-700">Missing invitation token.</p>}
      {preview.isError && <p className="text-sm text-red-700">{(preview.error as Error).message}</p>}
      {done?.appType === 'DRIVER' ? (
        <div className="space-y-3 text-sm text-slate-700">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
            Login created for <strong>{done.email}</strong>. Your Driver app account is now linked.
          </p>
          <p>
            You can sign in with this email and password once the Driver app is available to you.
            An administrator may still need to activate the account before you can start duty.
          </p>
          <Link to="/login" className="inline-flex rounded-lg bg-command-600 px-4 py-2.5 text-sm font-semibold text-white">
            Continue to Command sign-in
          </Link>
        </div>
      ) : null}
      {preview.data && !done && (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          <p className="text-sm text-slate-600">
            Invited as <strong>{preview.data.email}</strong>
            {isDriverInvite ? ' · Driver app' : ''}
          </p>
          {isDriverInvite ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Choose your own password. Administrators cannot see or set it. This link is single-use and expires soon.
            </p>
          ) : null}
          <Field label="First name" value={firstName} onChange={setFirstName} required />
          <Field label="Last name" value={lastName} onChange={setLastName} required />
          <Field label="Password (min 12 characters)" value={password} onChange={setPassword} type="password" required />
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-command-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? 'Creating account…' : isDriverInvite ? 'Create Driver login' : 'Create account'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [devToken, setDevToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await api.forgotPassword(email)
      setMessage(result.message)
      setDevToken(result.devResetToken)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Forgot password" subtitle="We will send reset instructions if an account exists for this email.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Work email" value={email} onChange={setEmail} type="email" required />
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-command-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
      {devToken && (
        <p className="mt-3 text-sm text-amber-900">
          <Link className="underline" to={`/reset-password?token=${encodeURIComponent(devToken)}`}>
            Open temporary reset link
          </Link>
        </p>
      )}
      <p className="mt-4 text-center text-xs text-slate-500">
        <Link to="/login" className="text-command-600 hover:underline">Back to sign in</Link>
      </p>
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [token, setToken] = useState(params.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.resetPassword(token, password)
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Reset password" subtitle="Choose a new password. Existing sessions will be revoked.">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <Field label="Reset token" value={token} onChange={setToken} required />
        <Field label="New password" value={password} onChange={setPassword} type="password" required />
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-command-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  )
}

export function MfaSetupPage() {
  const { refreshUser } = useAuth()
  const navigate = useNavigate()
  const [codes, setCodes] = useState<string[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function enable() {
    setLoading(true)
    setError('')
    try {
      const result = await api.enableMfa()
      setCodes(result.recoveryCodes)
      await refreshUser()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA setup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Protect this administrator account"
      subtitle="Company owners and privileged roles must enable MFA before using live operational screens."
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {!codes ? (
        <button
          type="button"
          onClick={enable}
          disabled={loading}
          className="w-full rounded-lg bg-command-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Enabling…' : 'Enable authenticator MFA'}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Store these recovery codes securely. They are shown once.</p>
          <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
            {codes.map((code) => (
              <li key={code} className="rounded bg-slate-100 px-2 py-1">{code}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full rounded-lg bg-command-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Continue to Command
          </button>
        </div>
      )}
      {isMockApi && <p className="mt-3 text-xs text-emerald-800">Demo mode MFA is simulated locally.</p>}
    </AuthShell>
  )
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <AuthLayout title={title} subtitle={subtitle} wide>
      {children}
    </AuthLayout>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  const id = useMemo(() => label.toLowerCase().replace(/\s+/g, '-'), [label])
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-soft">{label}</label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink focus:border-command-500 focus:outline-none focus:ring-2 focus:ring-command-500/20"
      />
    </div>
  )
}

/** Roles that must complete MFA before operational access. */
export function requiresMfa(role: string | null | undefined, mfaEnabled: boolean | undefined) {
  if (mfaEnabled) return false
  const privileged = new Set([
    'company_owner',
    'company_administrator',
    'transport_manager',
    'dispatcher',
    'safeguarding_lead',
    'compliance_manager',
  ])
  return privileged.has(String(role ?? ''))
}
