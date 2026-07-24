import { useMemo, useState } from 'react'
import {
  BCT_MAIN_DEPOT_LAYOUT,
  buildSpatialBayStates,
  layoutCapacitySummary,
  resolveYardLayout,
  type YardHubLayoutSnapshot,
  type YardLayoutDefinition,
} from '@veyvio/yard'
import type { YardHubData } from '@/lib/yard/types'
import { SectionCard } from '@/components/ui'

function snapshotToLayout(snapshot: YardHubLayoutSnapshot): YardLayoutDefinition {
  return {
    id: snapshot.layoutId,
    depotCode: snapshot.depotCode,
    name: snapshot.name,
    canvasWidth: snapshot.canvasWidth,
    canvasHeight: snapshot.canvasHeight,
    zones: snapshot.zones,
    bays: snapshot.bays,
    gates: snapshot.gates,
  }
}

export function YardSpatialMapTab({ hub }: { hub: YardHubData }) {
  const layout = useMemo(() => {
    if (hub.yardLayout) return snapshotToLayout(hub.yardLayout)
    if (hub.yardMapEnabled !== false && hub.depotCode) {
      return resolveYardLayout(hub.depotCode) ?? BCT_MAIN_DEPOT_LAYOUT
    }
    return null
  }, [hub.yardLayout, hub.yardMapEnabled, hub.depotCode])

  const [selectedBay, setSelectedBay] = useState<number | null>(null)

  const states = useMemo(() => {
    if (!layout) return []
    const bays = layout.bays.map((b) => ({
      id: b.id,
      bayNumber: b.bayNumber,
      displayName: b.displayName,
    }))
    const vehicles = hub.vehicles.map((v) => ({
      id: v.vehicleId,
      reg: v.registrationNumber,
      bayId: v.bay ? (v.bay.match(/\d+/) ? `BAY-${String(v.bay.match(/\d+/)![0]).padStart(2, '0')}` : v.bay) : '',
      status: v.readinessState === 'vor' ? 'VOR' : 'Available',
    }))
    return buildSpatialBayStates(layout, bays, vehicles)
  }, [layout, hub.vehicles])

  const capacity = layoutCapacitySummary(states)
  const selected = states.find((s) => s.bayNumber === selectedBay) ?? null

  if (!layout) {
    return (
      <SectionCard title="Yard map" description="Spatial layout not configured for this depot.">
        <p className="text-sm text-muted">Enable Live Yard Map on the depot to see the interactive layout.</p>
      </SectionCard>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <SectionCard
        title="Live yard map"
        description={`${capacity.occupied}/${capacity.total} bays occupied · view only`}
      >
        <div className="overflow-auto rounded border border-border bg-[#F5F7FA] p-2">
          <svg
            viewBox={`0 0 ${layout.canvasWidth} ${layout.canvasHeight}`}
            className="h-auto w-full min-w-[640px]"
            role="img"
            aria-label="Depot yard map"
          >
            {layout.zones
              .filter((z) => ['OFFICE', 'CONTAINER', 'PEDESTRIAN', 'ROADWAY', 'NO_PARKING'].includes(z.kind))
              .map((zone) => (
                <polygon
                  key={zone.id}
                  points={zone.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
                  fill={
                    zone.kind === 'PEDESTRIAN'
                      ? '#BBF7D0'
                      : zone.kind === 'ROADWAY'
                        ? '#FEF9C3'
                        : zone.kind === 'NO_PARKING'
                          ? '#FDE68A'
                          : zone.colourKey
                  }
                  opacity={0.55}
                  stroke="#94A3B8"
                  strokeWidth={1}
                />
              ))}
            {layout.bays.map((bay) => {
              const state = states.find((s) => s.layoutBayId === bay.id)
              const occupied = Boolean(state?.vehicle)
              const isVor = state?.vehicle?.status === 'VOR'
              return (
                <g
                  key={bay.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedBay(bay.bayNumber)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setSelectedBay(bay.bayNumber)
                  }}
                >
                  <rect
                    x={bay.geometry.x}
                    y={bay.geometry.y}
                    width={bay.geometry.width}
                    height={bay.geometry.height}
                    rx={4}
                    fill={occupied ? (isVor ? '#FEE2E2' : '#D1FAE5') : '#FEF9F3'}
                    stroke={occupied ? (isVor ? '#B42318' : '#178C4B') : '#D4A574'}
                    strokeWidth={selectedBay === bay.bayNumber ? 3 : 1.5}
                  />
                  <text
                    x={bay.geometry.x + bay.geometry.width / 2}
                    y={bay.geometry.y + 14}
                    textAnchor="middle"
                    className="fill-ink text-[10px] font-bold"
                  >
                    {bay.bayNumber}
                  </text>
                  {state?.vehicle && (
                    <text
                      x={bay.geometry.x + bay.geometry.width / 2}
                      y={bay.geometry.y + bay.geometry.height / 2 + 4}
                      textAnchor="middle"
                      className="fill-ink text-[8px] font-bold"
                    >
                      {state.vehicle.reg}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      </SectionCard>

      {selected && (
        <SectionCard title={selected.displayName}>
          <div className="space-y-2 text-sm">
            <p className="capitalize text-muted">Status: {selected.operationalStatus.replace(/_/g, ' ')}</p>
            {selected.vehicle ? (
              <>
                <p className="text-lg font-semibold">{selected.vehicle.reg}</p>
                <p className="text-xs text-muted">{selected.vehicle.status}</p>
              </>
            ) : (
              <p className="text-muted">Empty bay</p>
            )}
            {selected.isLifo && <p className="text-xs font-semibold text-amber-700">LIFO bay</p>}
            {selected.isReserved && <p className="text-xs font-semibold text-violet-700">Reserved</p>}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
