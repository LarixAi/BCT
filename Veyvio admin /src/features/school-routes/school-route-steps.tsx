import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { WEEKDAYS } from '@/lib/school-routes/constants'
import {
  buildStopsFromPupils,
  pupilFromPassenger,
  syncPatternsForDirectionMode,
} from '@/lib/school-routes/defaults'
import type { SchoolRoute } from '@/lib/school-routes/types'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function SchoolStep({ route, onChange }: { route: SchoolRoute; onChange: (p: Partial<SchoolRoute>) => void }) {
  const { data: schools = [] } = useQuery({ queryKey: tKey(['schools']), queryFn: () => api.getSchools() })

  function selectSchool(schoolId: string) {
    const school = schools.find((s) => s.id === schoolId)
    if (!school) return
    onChange({
      schoolId: school.id,
      schoolName: school.name,
      schoolAddress: school.address ?? '',
    })
  }

  return (
    <SectionCard title="School" description="Step 1 — commercial school record and handover contacts">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {schools.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => selectSchool(s.id)}
              className={`w-full px-4 py-3 text-left hover:bg-surface-muted ${
                route.schoolId === s.id ? 'bg-command-50 ring-2 ring-inset ring-command-500' : ''
              }`}
            >
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-muted">{s.address}</p>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Transport entrance" value={route.transportEntrance} onChange={(v) => onChange({ transportEntrance: v })} />
        <Field label="School contact" value={route.schoolContact} onChange={(v) => onChange({ schoolContact: v })} />
        <Field label="Telephone" value={route.schoolPhone} onChange={(v) => onChange({ schoolPhone: v })} />
        <Field label="Contract reference" value={route.contractRef} onChange={(v) => onChange({ contractRef: v })} />
        <Field label="Handover procedure" value={route.handoverProcedure} onChange={(v) => onChange({ handoverProcedure: v })} multiline />
        <Field label="Closure contact process" value={route.closureContactProcess} onChange={(v) => onChange({ closureContactProcess: v })} multiline />
      </div>
    </SectionCard>
  )
}

export function TermStep({ route, onChange }: { route: SchoolRoute; onChange: (p: Partial<SchoolRoute>) => void }) {
  const term = route.term
  function setTerm(patch: Partial<typeof term>) {
    onChange({ term: { ...term, ...patch } })
  }
  function toggleDay(day: string) {
    const days = term.operatingDays.includes(day)
      ? term.operatingDays.filter((d) => d !== day)
      : [...term.operatingDays, day]
    setTerm({ operatingDays: days })
  }

  return (
    <SectionCard title="Term and calendar" description="Step 2 — operating days and exclusions">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Academic year" value={term.academicYear} onChange={(v) => setTerm({ academicYear: v })} />
        <Field label="Term" value={term.termName} onChange={(v) => setTerm({ termName: v })} />
        <Field label="Start date" value={term.startDate} onChange={(v) => setTerm({ startDate: v })} type="date" />
        <Field label="End date" value={term.endDate} onChange={(v) => setTerm({ endDate: v })} type="date" />
      </div>
      <div className="mt-4">
        <p className="text-sm text-ink-soft">Operating days</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => toggleDay(d.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                term.operatingDays.includes(d.id) ? 'bg-command-600 text-white' : 'bg-surface-muted text-ink-soft'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">Jobs generate up to 8 weeks ahead — not the full academic year.</p>
    </SectionCard>
  )
}

export function DirectionStep({ route, onChange }: { route: SchoolRoute; onChange: (p: Partial<SchoolRoute>) => void }) {
  function setMode(mode: SchoolRoute['directionMode']) {
    onChange({ directionMode: mode, patterns: syncPatternsForDirectionMode(mode, route.patterns) })
  }

  return (
    <SectionCard title="Route direction" description="Step 3 — AM and PM are separate patterns">
      <div className="flex flex-wrap gap-2">
        {(['am', 'pm', 'both'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setMode(mode)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              route.directionMode === mode ? 'bg-command-600 text-white' : 'bg-surface-muted text-ink-soft'
            }`}
          >
            {mode === 'both' ? 'AM & PM' : mode.toUpperCase()}
          </button>
        ))}
      </div>
      {route.patterns.map((pattern, index) => (
        <div key={pattern.direction} className="mt-4 rounded-lg border border-border p-3">
          <p className="font-medium uppercase">{pattern.direction} pattern</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <TimeField label="Depot departure" value={pattern.depotDeparture} onChange={(v) => {
              const patterns = [...route.patterns]
              patterns[index] = { ...pattern, depotDeparture: v }
              onChange({ patterns })
            }} />
            <TimeField label="Required school arrival" value={pattern.requiredSchoolArrival} onChange={(v) => {
              const patterns = [...route.patterns]
              patterns[index] = { ...pattern, requiredSchoolArrival: v }
              onChange({ patterns })
            }} />
          </div>
        </div>
      ))}
    </SectionCard>
  )
}

export function PupilsStep({ route, onChange }: { route: SchoolRoute; onChange: (p: Partial<SchoolRoute>) => void }) {
  const { data: passengers = [] } = useQuery({ queryKey: tKey(['passengers']), queryFn: () => api.getPassengers() })
  const schoolPupils = passengers.filter((p) => p.customerName?.toLowerCase().includes('oakwood') || p.routeName?.toLowerCase().includes('school'))

  function toggle(id: string) {
    const exists = route.pupils.find((p) => p.pupilId === id)
    if (exists) {
      onChange({ pupils: route.pupils.filter((p) => p.pupilId !== id) })
      return
    }
    const record = schoolPupils.find((p) => p.id === id)
    if (!record) return
    onChange({ pupils: [...route.pupils, pupilFromPassenger(record)] })
  }

  return (
    <SectionCard title="Pupils" description="Step 4 — pupils on this route pattern">
      <ul className="divide-y divide-border">
        {schoolPupils.map((p) => (
          <li key={p.id} className="py-2">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={!!route.pupils.find((x) => x.pupilId === p.id)} onChange={() => toggle(p.id)} />
              <span>{p.firstName} {p.lastName}</span>
            </label>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

export function StopsStep({ route, onChange }: { route: SchoolRoute; onChange: (p: Partial<SchoolRoute>) => void }) {
  function rebuildStops() {
    const patterns = route.patterns.map((p) => ({
      ...p,
      stops: buildStopsFromPupils(route.pupils, p, route.schoolAddress),
    }))
    onChange({ patterns })
  }

  return (
    <SectionCard title="Stops" description="Step 5 — ordered pickups and school drop-off">
      <button type="button" onClick={rebuildStops} className="mb-3 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted">
        Build stops from pupils
      </button>
      {route.patterns.map((pattern) => (
        <div key={pattern.direction} className="mb-4">
          <p className="font-medium uppercase">{pattern.direction}</p>
          <ol className="mt-2 space-y-2 text-sm">
            {pattern.stops.map((s) => (
              <li key={s.id} className="rounded-lg border border-border px-3 py-2">
                {s.sequence}. {s.type} — {s.pupilName || 'Stop'} · {s.address} · {s.plannedTime}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </SectionCard>
  )
}

export function CrewStep({ route, onChange }: { route: SchoolRoute; onChange: (p: Partial<SchoolRoute>) => void }) {
  const crew = route.crew
  return (
    <SectionCard title="Crew and vehicle requirements" description="Step 6 — preferences; dated assignment happens in Schedule">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Vehicle type" value={crew.vehicleType} onChange={(v) => onChange({ crew: { ...crew, vehicleType: v } })} />
        <Field label="Seats" value={String(crew.seats)} onChange={(v) => onChange({ crew: { ...crew, seats: Number(v) || 0 } })} />
        <Field label="Wheelchair spaces" value={String(crew.wheelchairSpaces)} onChange={(v) => onChange({ crew: { ...crew, wheelchairSpaces: Number(v) || 0 } })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={crew.passengerAssistantRequired} onChange={(e) => onChange({ crew: { ...crew, passengerAssistantRequired: e.target.checked } })} />
          Passenger assistant required
        </label>
      </div>
    </SectionCard>
  )
}

export function SafeguardingStep({ route, onChange }: { route: SchoolRoute; onChange: (p: Partial<SchoolRoute>) => void }) {
  const sg = route.safeguarding
  return (
    <SectionCard title="Safeguarding" description="Step 7 — handover and escalation rules">
      <div className="space-y-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={sg.handoverRequired} onChange={(e) => onChange({ safeguarding: { ...sg, handoverRequired: e.target.checked } })} />
          Handover to authorised adult required
        </label>
        <Field label="Authorised adults" value={sg.authorisedAdults} onChange={(v) => onChange({ safeguarding: { ...sg, authorisedAdults: v } })} multiline />
        <Field label="If no adult present" value={sg.noAdultPresentProcess} onChange={(v) => onChange({ safeguarding: { ...sg, noAdultPresentProcess: v } })} multiline />
        <Field label="Confidential driver instructions" value={sg.confidentialDriverNotes} onChange={(v) => onChange({ safeguarding: { ...sg, confidentialDriverNotes: v } })} multiline />
      </div>
    </SectionCard>
  )
}

export function SchoolReviewStep({ route, jobCount }: { route: SchoolRoute; jobCount: number }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Jobs to generate">
        <p className="text-sm text-ink-soft">
          Publishing will create <strong>{jobCount}</strong> dated jobs across the next 8 weeks (rolling window).
        </p>
      </SectionCard>
      <SectionCard title="Route summary">
        <dl className="space-y-2 text-sm">
          <Row label="School" value={route.schoolName || '—'} />
          <Row label="Direction" value={route.directionMode === 'both' ? 'AM & PM' : route.directionMode.toUpperCase()} />
          <Row label="Pupils" value={String(route.pupils.length)} />
          <Row label="Term" value={`${route.term.termName} · ${route.term.startDate} → ${route.term.endDate}`} />
        </dl>
      </SectionCard>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  multiline,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  type?: string
}) {
  return (
    <label className="text-sm">
      <span className="text-ink-soft">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
      )}
    </label>
  )
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <Field label={label} value={value} onChange={onChange} type="time" />
}
