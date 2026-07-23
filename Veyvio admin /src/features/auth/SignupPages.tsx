import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout, authLinkClass, authPrimaryButtonClass } from '@/components/brand/AuthLayout'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

export function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    companyName: '',
    country: 'GB',
    phone: '',
    password: '',
    termsAccepted: false,
    privacyAccepted: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [devToken, setDevToken] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await api.signupCompany(form)
      if (result.devVerificationToken) {
        setDevToken(result.devVerificationToken)
        return
      }
      navigate('/verify-email')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup could not start')
    } finally {
      setLoading(false)
    }
  }

  if (devToken) {
    return (
      <AuthCard title="Check your email" subtitle="Email delivery is not wired yet in this environment, so use the verification link below.">
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Temporary verification token for testing. Do not use this pattern in production email flows.
        </p>
        <Link
          to={`/verify-email?token=${encodeURIComponent(devToken)}`}
          className={`mt-4 inline-flex items-center justify-center ${authPrimaryButtonClass}`}
        >
          Verify email and continue
        </Link>
        <p className="mt-4 text-center text-xs text-muted">
          <Link to="/login" className={authLinkClass}>Back to sign in</Link>
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Register your company" subtitle="Only the first authorised company representative should use this form. Staff join by invitation.">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <Field label="Work email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
          <Field label="Last name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
        </div>
        <Field label="Company name" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} required />
        <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} required />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Password (min 12 characters)" value={form.password} onChange={(v) => setForm({ ...form, password: v })} type="password" required />
        <label className="flex items-start gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={form.termsAccepted} onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })} className="mt-1" />
          I accept the Veyvio terms of service
        </label>
        <label className="flex items-start gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={form.privacyAccepted} onChange={(e) => setForm({ ...form, privacyAccepted: e.target.checked })} className="mt-1" />
          I accept the privacy notice
        </label>
        <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
          {loading ? 'Starting registration…' : 'Continue'}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-muted">
        Already registered? <Link to="/login" className="text-command-600 hover:underline">Sign in</Link>
      </p>
    </AuthCard>
  )
}

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initial = params.get('token') ?? ''
  const [token, setToken] = useState(initial)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.verifySignupEmail(token)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthCard title="Email verified" subtitle="Sign in to finish company verification and activate your tenant.">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className={authPrimaryButtonClass}
        >
          Continue to sign in
        </button>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Verify your email" subtitle="Paste the single-use verification token from your email.">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <Field label="Verification token" value={token} onChange={setToken} required />
        <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
          {loading ? 'Verifying…' : 'Verify email'}
        </button>
      </form>
    </AuthCard>
  )
}

export function CompanyVerificationPage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [form, setForm] = useState({
    legalName: '',
    tradingName: '',
    companiesHouseNumber: '',
    operatorLicenceNumber: '',
    phone: '',
    transportManagerName: '',
    estimatedFleetSize: '10',
    estimatedUserCount: '5',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.submitCompanyVerification({
        ...form,
        estimatedFleetSize: Number(form.estimatedFleetSize),
        estimatedUserCount: Number(form.estimatedUserCount),
      })
      await refreshUser()
      navigate('/setup/contracts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save company details')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Verify your company" subtitle="Provide legal and operating details before passenger data can be used.">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <Field label="Legal company name" value={form.legalName} onChange={(v) => setForm({ ...form, legalName: v })} required />
        <Field label="Trading name" value={form.tradingName} onChange={(v) => setForm({ ...form, tradingName: v })} required />
        <Field label="Companies House number" value={form.companiesHouseNumber} onChange={(v) => setForm({ ...form, companiesHouseNumber: v })} />
        <Field label="Operator licence number" value={form.operatorLicenceNumber} onChange={(v) => setForm({ ...form, operatorLicenceNumber: v })} />
        <Field label="Company telephone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Transport manager / responsible person" value={form.transportManagerName} onChange={(v) => setForm({ ...form, transportManagerName: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Estimated fleet size" value={form.estimatedFleetSize} onChange={(v) => setForm({ ...form, estimatedFleetSize: v })} />
          <Field label="Estimated users" value={form.estimatedUserCount} onChange={(v) => setForm({ ...form, estimatedUserCount: v })} />
        </div>
        <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
          {loading ? 'Saving…' : 'Continue to contracts'}
        </button>
      </form>
    </AuthCard>
  )
}

export function AcceptContractsPage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accepted) {
      setError('Accept the agreements to continue')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.acceptCompanyContracts()
      await refreshUser()
      navigate('/setup/company')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record acceptance')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Company agreements" subtitle="Accept the subscription agreement, DPA, privacy notice and acceptable-use policy.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
          <li>Subscription agreement v2026-07-1</li>
          <li>Data Processing Agreement v2026-07-1</li>
          <li>Privacy notice v2026-07-1</li>
          <li>Acceptable-use policy v2026-07-1</li>
        </ul>
        <label className="flex items-start gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
          I am authorised to accept these agreements for this company
        </label>
        <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
          {loading ? 'Recording…' : 'Accept and continue'}
        </button>
      </form>
    </AuthCard>
  )
}

export function CompanySetupPage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [form, setForm] = useState({
    timezone: 'Europe/London',
    depotName: 'Primary depot',
    depotCode: 'MAIN',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.completeCompanySetup(form)
      await refreshUser()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup could not be completed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Complete company setup" subtitle="Create your primary depot and activate the tenant for live operations.">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <Field label="Timezone" value={form.timezone} onChange={(v) => setForm({ ...form, timezone: v })} required />
        <Field label="Primary depot name" value={form.depotName} onChange={(v) => setForm({ ...form, depotName: v })} required />
        <Field label="Depot code" value={form.depotCode} onChange={(v) => setForm({ ...form, depotCode: v })} required />
        <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
          {loading ? 'Activating…' : 'Activate company'}
        </button>
      </form>
    </AuthCard>
  )
}

export function tenantSetupPath(tenantStatus?: string | null) {
  switch (tenantStatus) {
    case 'PENDING_COMPANY_VERIFICATION':
      return '/company-verification'
    case 'PENDING_CONTRACT':
    case 'PENDING_PAYMENT':
      return '/setup/contracts'
    case 'SETUP_REQUIRED':
      return '/setup/company'
    default:
      return null
  }
}

function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
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
