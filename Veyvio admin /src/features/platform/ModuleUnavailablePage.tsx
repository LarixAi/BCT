import { Link } from 'react-router-dom'

export function ModuleUnavailablePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-page px-6">
      <section className="w-full max-w-lg rounded-xl border border-border bg-surface p-8 text-center">
        <h1 className="text-2xl font-semibold text-ink">Not on your plan</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          This area is not included in your company&apos;s current Veyvio licence. Ask your administrator
          or Veyvio support if you need it enabled.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-lg bg-command-700 px-4 py-2 text-sm font-semibold text-white hover:bg-command-800"
        >
          Return to Control Centre
        </Link>
      </section>
    </main>
  )
}
