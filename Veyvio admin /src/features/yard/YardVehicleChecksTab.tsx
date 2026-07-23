import { Link } from 'react-router-dom'
import { useState } from 'react'
import { SectionCard } from '@/components/ui'
import type { YardHubData, YardVehicleCheckReport } from '@/lib/yard/types'

export function YardVehicleChecksTab({ hub }: { hub: YardHubData }) {
  const checks = hub.vehicleChecks ?? []
  const [selected, setSelected] = useState<YardVehicleCheckReport | null>(checks[0] ?? null)

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <SectionCard title="Driver vehicle checks">
        <p className="mb-3 text-sm text-ink-soft">
          Full walkaround submissions from drivers — odometer photo, questions, answers and defect images.
        </p>
        {checks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface-muted px-3 py-6 text-center text-sm text-ink-soft">
            No vehicle checks received yet. When a driver submits a walkaround, it appears here and in Admin → Vehicle
            Checks.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {checks.map((check) => (
              <li key={check.id}>
                <button
                  type="button"
                  onClick={() => setSelected(check)}
                  className={`w-full px-1 py-3 text-left ${selected?.id === check.id ? 'bg-command-50' : ''}`}
                >
                  <p className="font-semibold tabular-nums text-ink">{check.registrationNumber}</p>
                  <p className="text-xs text-muted">
                    {check.driverName ?? 'Driver'} · {check.result === 'fail' ? 'Failed' : 'Passed'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {check.submittedAt
                      ? new Date(check.submittedAt).toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                    {check.odometer != null ? ` · Odo ${check.odometer}` : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title={selected ? `${selected.registrationNumber} walkaround` : 'Check detail'}
        action={
          selected ? (
            <Link
              to={selected.href || `/vehicle-checks/${selected.id}`}
              className="text-sm font-medium text-command-600 hover:underline"
            >
              Open in Vehicle Checks
            </Link>
          ) : null
        }
      >
        {!selected ? (
          <p className="text-sm text-muted">Select a check to review.</p>
        ) : (
          <div className="space-y-4">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Row label="Driver" value={selected.driverName ?? '—'} />
              <Row label="Result" value={selected.result === 'fail' ? 'Fail — review needed' : 'Pass'} />
              <Row label="Odometer entered" value={selected.odometer != null ? String(selected.odometer) : '—'} />
              <Row label="Fuel / charge" value={selected.fuelLevel ?? '—'} />
              <Row
                label="Started"
                value={selected.startedAt ? new Date(selected.startedAt).toLocaleString('en-GB') : '—'}
              />
              <Row
                label="Submitted"
                value={selected.submittedAt ? new Date(selected.submittedAt).toLocaleString('en-GB') : '—'}
              />
            </dl>

            {selected.odometerPhotoDataUrl ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Odometer photo</p>
                <img
                  src={selected.odometerPhotoDataUrl}
                  alt="Odometer evidence"
                  className="mt-2 max-h-56 w-full rounded-lg object-cover"
                />
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Questions & answers ({selected.sections?.length ?? 0})
              </p>
              <ul className="space-y-2">
                {(selected.sections ?? []).map((section) => {
                  const failed = /fail|no\s*\//i.test(section.answer)
                  return (
                    <li
                      key={section.id}
                      className={`rounded-lg border p-3 ${failed ? 'border-red-200 bg-red-50/40' : 'border-border'}`}
                    >
                      <p className="text-xs uppercase text-muted">{section.section.replace(/_/g, ' ')}</p>
                      <p className="text-sm font-medium text-ink">{section.question}</p>
                      <p className={`mt-1 text-sm font-semibold ${failed ? 'text-red-800' : 'text-emerald-800'}`}>
                        {section.answer}
                      </p>
                      {section.notes ? <p className="mt-1 text-xs text-amber-900">{section.notes}</p> : null}
                      {section.photoDataUrl ? (
                        <img
                          src={section.photoDataUrl}
                          alt={section.question}
                          className="mt-2 max-h-40 w-full rounded-md object-cover"
                        />
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>

            {(selected.evidence?.length ?? 0) > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Evidence ({selected.evidence.length})
                </p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {selected.evidence.map((item) => (
                    <li key={item.id} className="rounded-lg border border-border p-3 text-sm">
                      <p className="font-medium capitalize">{item.kind.replace(/_/g, ' ')}</p>
                      <p className="text-ink-soft">{item.label}</p>
                      {item.url ? (
                        <img src={item.url} alt={item.label} className="mt-2 max-h-40 w-full rounded-md object-cover" />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}
