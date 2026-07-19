import { Link, useLocation } from 'react-router-dom'

type SystemStateProps = {
  title: string
  description: string
  action: string
  href: string
  detail: string
}

function SystemStatePage({ title, description, action, href, detail }: SystemStateProps) {
  return (
    <main className="grid min-h-screen bg-slate-50">
      <header className="flex h-16 items-center bg-command-950 px-6 text-white">
        <span className="text-lg font-bold tracking-tight">VEYVIO</span>
        <span className="ml-2 text-xs font-semibold tracking-[0.18em] text-command-400">COMMAND</span>
      </header>
      <div className="grid place-items-center px-6 py-12">
        <section className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-command-50 text-xl font-bold text-command-700">!</div>
          <h1 className="mt-5 text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          <Link to={href} className="mt-6 inline-flex rounded-lg bg-command-700 px-4 py-2 text-sm font-semibold text-white hover:bg-command-800">
            {action}
          </Link>
          <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">{detail}</p>
        </section>
      </div>
    </main>
  )
}

export function AccessDeniedPage() {
  return <SystemStatePage title="You do not have access to this area" description="Your current role does not include the permission needed for this page." action="Return to overview" href="/" detail="Ask a company administrator if your operational responsibilities have changed." />
}

export function SessionExpiredPage() {
  const location = useLocation()
  return <SystemStatePage title="Your session has expired" description="Sign in again to continue. Your workflow context will be restored where possible." action="Sign in again" href={`/login?returnTo=${encodeURIComponent(location.state?.returnTo ?? '/')}`} detail="No submitted operational records have been changed." />
}

export function CompanyUnavailablePage() {
  return <SystemStatePage title="This company is unavailable" description="The selected company is inactive, disabled or no longer available to your account." action="Choose another company" href="/select-company" detail="Contact Veyvio Support if the company should still be active." />
}

export function NotFoundPage() {
  return <SystemStatePage title="This record cannot be found" description="It may have been archived, removed or may not be available in your company." action="Return to overview" href="/" detail="For security, Veyvio does not confirm whether records outside your company exist." />
}
