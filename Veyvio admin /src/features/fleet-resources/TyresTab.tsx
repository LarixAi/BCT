import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TYRE_STATUS_LABEL } from '@/lib/fleet-resources/constants'
import type { FleetResourcesHubData, TyreAsset } from '@/lib/fleet-resources/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { useMemo, useState } from 'react'
import { tKey } from '@/lib/tenant/tenant-query-scope'

export function TyresTab({ hub }: { hub: FleetResourcesHubData }) {
  const { user } = useAuth()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'attention' | 'stock' | 'fitted'>('all')

  const invalidate = () => queryClient.invalidateQueries({ queryKey: tKey(['fleet-resources-hub']) })

  const fitTarget = useMemo(() => {
    const fromCosts = hub.vehicleCosts[0]
    if (fromCosts?.vehicleId) {
      return {
        vehicleId: fromCosts.vehicleId,
        registration: fromCosts.registrationNumber,
      }
    }
    const fitted = hub.tyres.find((t) => t.vehicleId && t.registrationNumber)
    if (fitted?.vehicleId) {
      return { vehicleId: fitted.vehicleId, registration: fitted.registrationNumber ?? 'vehicle' }
    }
    return null
  }, [hub.tyres, hub.vehicleCosts])

  const rotatePair = useMemo(() => {
    const byVehicle = new Map<string, TyreAsset[]>()
    for (const tyre of hub.tyres) {
      if (!tyre.vehicleId || (tyre.status !== 'fitted' && tyre.status !== 'awaiting_retorque')) continue
      const list = byVehicle.get(tyre.vehicleId) ?? []
      list.push(tyre)
      byVehicle.set(tyre.vehicleId, list)
    }
    for (const [vehicleId, list] of byVehicle) {
      if (list.length >= 2) {
        return {
          vehicleId,
          registration: list[0]?.registrationNumber ?? 'vehicle',
          aTyreId: list[0].id,
          bTyreId: list[1].id,
        }
      }
    }
    return null
  }, [hub.tyres])

  const remove = useMutation({
    mutationFn: (tyreId: string) =>
      api.removeResourceTyre({ tyreId, actorName, quarantine: true }),
    onSuccess: invalidate,
  })

  const fitStock = useMutation({
    mutationFn: (tyre: TyreAsset) => {
      if (!fitTarget) throw new Error('No live vehicle available to fit this tyre')
      return api.fitResourceTyre({
        tyreId: tyre.id,
        vehicleId: fitTarget.vehicleId,
        position: 'OSR',
        positionLabel: 'Offside rear',
        actorName,
      })
    },
    onSuccess: invalidate,
  })

  const rotate = useMutation({
    mutationFn: () => {
      if (!rotatePair) throw new Error('Need two fitted tyres on the same vehicle')
      return api.rotateResourceTyres({
        vehicleId: rotatePair.vehicleId,
        aTyreId: rotatePair.aTyreId,
        bTyreId: rotatePair.bTyreId,
        actorName,
      })
    },
    onSuccess: invalidate,
  })

  const rows = hub.tyres.filter((t) => {
    if (filter === 'stock') return t.status === 'in_stock' || t.status === 'removed'
    if (filter === 'fitted') return t.status === 'fitted' || t.status === 'awaiting_retorque'
    if (filter === 'attention') {
      return (
        t.status === 'quarantine' ||
        t.status === 'awaiting_retorque' ||
        !!t.recommendation ||
        (t.treadDepthMm != null && t.treadDepthMm < hub.settings.minTreadDepthMm)
      )
    }
    return true
  })

  const byVehicle = new Map<string, TyreAsset[]>()
  for (const t of hub.tyres.filter((x) => x.vehicleId)) {
    const list = byVehicle.get(t.vehicleId!) ?? []
    list.push(t)
    byVehicle.set(t.vehicleId!, list)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Tyre register</h2>
          <p className="text-sm text-ink-soft">
            Individual assets with fit / remove / rotate — re-torque links to the vehicle wheels tab.
          </p>
          {hub.tyres.length === 0 && (
            <p className="mt-2 text-sm text-ink-soft">No tyres recorded for this company yet.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => rotate.mutate()}
          disabled={rotate.isPending || !rotatePair}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted disabled:opacity-60"
          title={
            rotatePair
              ? `Rotate two fitted tyres on ${rotatePair.registration}`
              : 'Need two fitted tyres on the same vehicle'
          }
        >
          {rotatePair ? `Rotate on ${rotatePair.registration}` : 'Rotate unavailable'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['attention', 'Needs attention'],
            ['fitted', 'Fitted'],
            ['stock', 'Stock / removed'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === id
                ? 'bg-command-600 text-white'
                : 'border border-border text-ink-soft hover:bg-surface-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {byVehicle.size > 0 && filter !== 'stock' && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-ink">Vehicle position map</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {[...byVehicle.entries()].map(([vehicleId, list]) => (
              <div key={vehicleId} className="rounded-xl border border-border p-3">
                <Link
                  to={`/vehicles/${vehicleId}?tab=wheels`}
                  className="font-semibold tabular-nums text-command-700 hover:underline"
                >
                  {list[0]?.registrationNumber}
                </Link>
                <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {list.map((t) => (
                    <li
                      key={t.id}
                      className={`rounded-lg border px-2 py-1.5 ${
                        t.recommendation || t.status === 'awaiting_retorque'
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-border bg-surface-muted'
                      }`}
                    >
                      <div className="font-medium">{t.positionLabel ?? t.position}</div>
                      <div className="text-xs text-ink-soft">
                        {t.treadDepthMm?.toFixed(1) ?? '—'} mm · {TYRE_STATUS_LABEL[t.status]}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Spec</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Vehicle / position</th>
              <th className="px-3 py-2">Tread</th>
              <th className="px-3 py-2">Links</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium tabular-nums">{t.internalId}</td>
                <td className="px-3 py-2">
                  {t.brand} {t.size}
                  <div className="text-xs text-muted">DOT {t.dotCode}</div>
                </td>
                <td className="px-3 py-2">{TYRE_STATUS_LABEL[t.status]}</td>
                <td className="px-3 py-2">
                  {t.vehicleId ? (
                    <Link
                      to={`/vehicles/${t.vehicleId}?tab=wheels`}
                      className="font-semibold tabular-nums text-command-700 hover:underline"
                    >
                      {t.registrationNumber}
                    </Link>
                  ) : (
                    t.depotName ?? '—'
                  )}
                  {t.positionLabel && (
                    <div className="text-xs text-muted">{t.positionLabel}</div>
                  )}
                  {t.recommendation && (
                    <div className="text-xs text-amber-800">{t.recommendation}</div>
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {t.treadDepthMm != null ? `${t.treadDepthMm.toFixed(1)} mm` : '—'}
                </td>
                <td className="px-3 py-2 text-xs">
                  {t.linkedDefectId && (
                    <Link to={`/defects`} className="block text-command-700 hover:underline">
                      Defect
                    </Link>
                  )}
                  {t.linkedInspectionId && (
                    <Link
                      to={`/inspections/${t.linkedInspectionId}`}
                      className="block text-command-700 hover:underline"
                    >
                      Inspection
                    </Link>
                  )}
                  {(t.status === 'awaiting_retorque' || t.retorqueDueAt) && t.vehicleId && (
                    <Link
                      to={`/vehicles/${t.vehicleId}?tab=wheels`}
                      className="block text-amber-800 hover:underline"
                    >
                      Re-torque
                    </Link>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {t.status === 'in_stock' && (
                    <button
                      type="button"
                      className="text-xs font-medium text-command-700 hover:underline disabled:opacity-50"
                      disabled={!fitTarget || fitStock.isPending}
                      onClick={() => fitStock.mutate(t)}
                      title={
                        fitTarget
                          ? `Fit to ${fitTarget.registration}`
                          : 'No live vehicle available'
                      }
                    >
                      {fitTarget ? `Fit to ${fitTarget.registration}` : 'Fit unavailable'}
                    </button>
                  )}
                  {(t.status === 'fitted' || t.status === 'awaiting_retorque') && (
                    <button
                      type="button"
                      className="text-xs font-medium text-red-700 hover:underline"
                      onClick={() => remove.mutate(t.id)}
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
