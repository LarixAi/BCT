import { useState } from 'react'
import { VeyvioSidebar } from './VeyvioSidebar'

/** Standalone preview — not mounted in the live app shell. */
export default function VeyvioSidebarExample() {
  const [pathname, setPathname] = useState('/')

  return (
    <div className="flex min-h-screen bg-slate-50">
      <VeyvioSidebar pathname={pathname} onNavigate={setPathname} />

      <main className="min-w-0 flex-1 p-6 pt-20 lg:p-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-medium text-emerald-700">Veyvio Command</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Current route</h1>
          <p className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
            {pathname}
          </p>
        </div>
      </main>
    </div>
  )
}
