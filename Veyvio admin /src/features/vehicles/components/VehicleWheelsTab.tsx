import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { resolveFleetResourcesHub } from '@/lib/fleet-resources/resolve-hub'
import type { TyreAsset } from '@/lib/fleet-resources/types'
import type { VehicleProfile, WheelPositionState } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const LEGAL_TREAD_MM = 1.6
const WARN_TREAD_MM = 3

function tyreAlert(w: WheelPositionState): string | null {
  if (w.retorqueOverdue) return 'Re-torque overdue'
  if (w.condition === 'replace') return 'Replace tyre'
  if (w.treadDepthMm != null && w.treadDepthMm < LEGAL_TREAD_MM) return 'Below legal tread'
  if (w.treadDepthMm != null && w.treadDepthMm < WARN_TREAD_MM) return 'Tread low'
  if (w.pressurePsi != null && (w.pressurePsi < 30 || w.pressurePsi > 60)) return 'Pressure issue'
  if (w.condition === 'warning') return 'Uneven wear / attention'
  return null
}

function matchTyre(tyres: TyreAsset[], position: string) {
  const key = position.toLowerCase()
  return tyres.find(
    (t) =>
      (t.position && t.position.toLowerCase() === key) ||
      (t.positionLabel && t.positionLabel.toLowerCase().includes(key)),
  )
}

export function VehicleWheelsTab({ vehicle, actorName }: { vehicle: VehicleProfile; actorName: string }) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<string | null>(vehicle.wheelLayout[0]?.position ?? null)

  const { data: resources } = useQuery({
    queryKey: tKey(['fleet-resources-hub']),
    queryFn: () =>
      resolveFleetResourcesHub({
        fetchLiveHub: () => api.getFleetResourcesHub(),
        fetchProfiles: () => api.getVehicleProfiles(),
      }),
    retry: 1,
  })
  const resourceTyres = (resources?.hub.tyres ?? []).filter((t) => t.vehicleId === vehicle.id)

  const completeRetorque = useMutation({
    mutationFn: (taskId: string) => api.completeVehicleRetorque(vehicle.id, taskId, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tKey(['vehicle-profile', vehicle.id]) })
      queryClient.invalidateQueries({ queryKey: tKey(['vehicle-profiles']) })
    },
  })

  const alerts = useMemo(
    () =>
      vehicle.wheelLayout
        .map((w) => ({ position: w.position, label: w.label, alert: tyreAlert(w) }))
        .filter((a) => a.alert),
    [vehicle.wheelLayout],
  )

  const selectedWheel = vehicle.wheelLayout.find((w) => w.position === selected) ?? vehicle.wheelLayout[0]
  const selectedAsset = selectedWheel ? matchTyre(resourceTyres, selectedWheel.position) : undefined

  const front = vehicle.wheelLayout.filter((w) => /f|front|n/i.test(w.position) || /front/i.test(w.label))
  const rear = vehicle.wheelLayout.filter((w) => !front.includes(w))

  return (
    <div className="space-y-4">
      {alerts.length > 0 && (
        <SectionCard title="Tyre alerts" description="Pulled from wheel layout, Driver and Yard inspections">
          <ul className="space-y-2 text-sm">
            {alerts.map((a) => (
              <li key={a.position} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <span className="font-medium text-amber-950">
                  {a.label}: {a.alert}
                </span>
                <button
                  type="button"
                  onClick={() => setSelected(a.position)}
                  className="text-xs font-medium text-command-700 hover:underline"
                >
                  Inspect wheel
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.1fr)]">
        <SectionCard title="Vehicle diagram" description="Select a wheel for tread, pressure and asset history">
          <div className="mx-auto max-w-xs rounded-2xl border border-border bg-surface-muted p-4">
            <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted">Front</p>
            <div className="grid grid-cols-2 gap-6">
              {(front.length ? front : vehicle.wheelLayout.slice(0, 2)).map((w) => (
                <WheelButton
                  key={w.position}
                  wheel={w}
                  selected={selected === w.position}
                  onSelect={() => setSelected(w.position)}
                />
              ))}
            </div>
            <div className="my-4 h-16 rounded-lg border border-dashed border-border-strong bg-surface/60" />
            <div className="grid grid-cols-2 gap-6">
              {(rear.length ? rear : vehicle.wheelLayout.slice(2)).map((w) => (
                <WheelButton
                  key={w.position}
                  wheel={w}
                  selected={selected === w.position}
                  onSelect={() => setSelected(w.position)}
                />
              ))}
            </div>
            <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted">Rear</p>
          </div>
        </SectionCard>

        <SectionCard
          title={selectedWheel ? selectedWheel.label : 'Wheel detail'}
          description="Manufacturer asset identity when fitted in Fleet Resources"
        >
          {!selectedWheel ? (
            <p className="text-sm text-muted">No wheel layout on this vehicle.</p>
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Tread depth" value={selectedWheel.treadDepthMm != null ? `${selectedWheel.treadDepthMm.toFixed(1)} mm` : '—'} />
              <Detail label="Pressure" value={selectedWheel.pressurePsi != null ? `${selectedWheel.pressurePsi} psi` : '—'} />
              <Detail label="Condition" value={selectedWheel.condition} />
              <Detail
                label="Last torque"
                value={
                  selectedWheel.lastTorqueDate
                    ? new Date(selectedWheel.lastTorqueDate).toLocaleDateString('en-GB')
                    : '—'
                }
              />
              <Detail
                label="Re-torque due"
                value={
                  selectedWheel.retorqueDueAt
                    ? new Date(selectedWheel.retorqueDueAt).toLocaleDateString('en-GB')
                    : '—'
                }
              />
              <Detail label="Alert" value={tyreAlert(selectedWheel) ?? 'None'} />
              <Detail label="Brand / size" value={selectedAsset ? `${selectedAsset.brand} ${selectedAsset.size}` : '—'} />
              <Detail label="DOT / serial" value={selectedAsset?.dotCode ?? selectedAsset?.internalId ?? '—'} />
              <Detail
                label="Fitted"
                value={
                  selectedAsset?.fittedAt
                    ? new Date(selectedAsset.fittedAt).toLocaleDateString('en-GB')
                    : '—'
                }
              />
              <Detail label="Recommendation" value={selectedAsset?.recommendation ?? '—'} />
            </dl>
          )}
          {selectedWheel && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium text-muted">Tread trend (latest reading)</p>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={`h-full rounded-full ${
                    (selectedWheel.treadDepthMm ?? 0) < LEGAL_TREAD_MM
                      ? 'bg-red-500'
                      : (selectedWheel.treadDepthMm ?? 0) < WARN_TREAD_MM
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(100, ((selectedWheel.treadDepthMm ?? 0) / 10) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">Legal minimum {LEGAL_TREAD_MM} mm</p>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Fleet Resources tyre assets"
        description="Fit, remove and rotate in the shared tyre register"
      >
        {resourceTyres.length === 0 ? (
          <p className="text-sm text-muted">No tyre assets currently fitted to this vehicle.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {resourceTyres.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="font-medium">
                    {t.positionLabel ?? t.position} · {t.internalId}
                  </p>
                  <p className="text-xs text-muted">
                    {t.brand} {t.size} · {t.treadDepthMm?.toFixed(1) ?? '—'} mm
                    {t.recommendation ? ` · ${t.recommendation}` : ''}
                  </p>
                </div>
                <Link to="/fleet-resources?tab=tyres" className="text-xs font-medium text-command-600 hover:underline">
                  Open tyre register
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Re-torque tasks">
        {vehicle.retorqueTasks.length === 0 ? (
          <p className="text-sm text-muted">No pending re-torque tasks.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {vehicle.retorqueTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="font-medium">
                    {t.positions.join(', ')} — due {new Date(t.dueAt).toLocaleDateString('en-GB')}
                  </p>
                  <p className="text-xs text-muted">Technician: {t.technician}</p>
                </div>
                {t.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={() => completeRetorque.mutate(t.id)}
                    className="text-xs font-medium text-command-600 hover:underline"
                  >
                    Sign off re-torque
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}

function WheelButton({
  wheel,
  selected,
  onSelect,
}: {
  wheel: WheelPositionState
  selected: boolean
  onSelect: () => void
}) {
  const alert = tyreAlert(wheel)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-h-[72px] flex-col items-center justify-center rounded-full border-2 px-3 py-3 text-center transition ${
        selected
          ? 'border-command-600 bg-command-50 ring-2 ring-command-200'
          : alert
            ? 'border-amber-400 bg-amber-50 hover:border-amber-500'
            : 'border-border-strong bg-surface hover:border-command-400'
      }`}
    >
      <span className="text-xs font-bold">{wheel.label}</span>
      <span className="mt-1 text-[10px] tabular-nums text-ink-soft">
        {wheel.treadDepthMm != null ? `${wheel.treadDepthMm.toFixed(1)} mm` : '—'}
      </span>
      {alert && <StatusPill status="warning" />}
    </button>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium capitalize text-ink">{value}</dd>
    </div>
  )
}
