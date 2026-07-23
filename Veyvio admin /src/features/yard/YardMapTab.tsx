import { useState } from 'react'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { ACTIVITY_LABELS, READINESS_LABELS } from '@/lib/yard/constants'
import type { YardHubData, YardMapVehicleMarker } from '@/lib/yard/types'

const ZONE_LAYOUT: Record<string, { row: number; col: number }> = {
  'zone-bays-a': { row: 1, col: 1 },
  'zone-bays-b': { row: 1, col: 2 },
  'zone-coach': { row: 1, col: 1 },
  'zone-bays': { row: 1, col: 1 },
  'zone-inspection': { row: 2, col: 1 },
  'zone-workshop': { row: 2, col: 2 },
  'zone-wash': { row: 3, col: 1 },
  'zone-fuel': { row: 3, col: 2 },
  'zone-charge': { row: 3, col: 3 },
  'zone-quarantine': { row: 4, col: 1 },
  'zone-unallocated': { row: 4, col: 2 },
}

const KIND_COLOURS: Record<string, string> = {
  bay: 'border-border-strong bg-surface-muted',
  inspection: 'border-blue-200 bg-blue-50',
  workshop: 'border-purple-200 bg-purple-50',
  wash: 'border-cyan-200 bg-cyan-50',
  fuel: 'border-amber-200 bg-amber-50',
  charge: 'border-emerald-200 bg-emerald-50',
  quarantine: 'border-red-200 bg-red-50',
  unallocated: 'border-dashed border-border-strong bg-surface',
}

export function YardMapTab({ hub }: { hub: YardHubData }) {
  const [selected, setSelected] = useState<YardMapVehicleMarker | null>(null)
  const markersByZone = new Map<string, YardMapVehicleMarker[]>()
  for (const m of hub.mapMarkers) {
    const list = markersByZone.get(m.zoneId) ?? []
    list.push(m)
    markersByZone.set(m.zoneId, list)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <SectionCard title="Yard map" description={`${hub.mapMarkers.length} vehicles on site · location confidence shown per marker`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hub.zones.map((zone) => {
            const vehicles = markersByZone.get(zone.id) ?? []
            const layout = ZONE_LAYOUT[zone.id] ?? { row: 0, col: 0 }
            return (
              <div
                key={zone.id}
                className={`min-h-[120px] rounded-xl border p-3 ${KIND_COLOURS[zone.kind] ?? 'border-border bg-surface'}`}
                style={{ order: layout.row * 10 + layout.col }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{zone.label}</p>
                <p className="text-xs text-muted">{vehicles.length} vehicle{vehicles.length === 1 ? '' : 's'}</p>
                <ul className="mt-2 space-y-1">
                  {vehicles.map((v) => (
                    <li key={v.vehicleId}>
                      <button
                        type="button"
                        onClick={() => setSelected(v)}
                        className={`w-full rounded px-2 py-1 text-left text-xs font-medium hover:ring-1 hover:ring-command-400 ${
                          v.readinessState === 'vor' ? 'bg-red-100 text-red-900' : 'bg-surface/80 text-ink'
                        }`}
                      >
                        {v.registrationNumber}
                        <span className="ml-1 font-normal text-muted">· {v.bay ?? 'unallocated'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-xs text-muted">
          QR / NFC bay scans from the Yard app update location confidence to confirmed. Stale or estimated positions are flagged on the Live Yard tab.
        </p>
      </SectionCard>

      {selected && (
        <SectionCard title="Vehicle on map">
          <div className="space-y-2 text-sm">
            <p className="text-lg font-semibold">{selected.registrationNumber}</p>
            <p className="text-ink-soft">{hub.zones.find((z) => z.id === selected.zoneId)?.label}</p>
            <p className="text-xs capitalize text-muted">Confidence: {selected.locationConfidence}</p>
            <div className="flex flex-wrap gap-2">
              <StatusPill status={selected.readinessState} />
              <StatusPill status={selected.activityState} />
            </div>
            <dl className="grid gap-1 text-xs">
              <Row label="Activity" value={ACTIVITY_LABELS[selected.activityState] ?? selected.activityState} />
              <Row label="Readiness" value={READINESS_LABELS[selected.readinessState] ?? selected.readinessState} />
              <Row label="Open tasks" value={String(selected.openTaskCount)} />
              <Row label="Next departure" value={selected.nextDeparture ?? '—'} />
            </dl>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}
