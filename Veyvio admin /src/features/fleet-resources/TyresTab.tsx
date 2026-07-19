import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TYRE_STATUS_LABEL } from '@/lib/fleet-resources/constants'
import type { FleetResourcesHubData, TyreAsset } from '@/lib/fleet-resources/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { useState } from 'react'

export function TyresTab({ hub }: { hub: FleetResourcesHubData }) {
  const { user } = useAuth()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'attention' | 'stock' | 'fitted'>('all')

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fleet-resources-hub'] })

  const remove = useMutation({
    mutationFn: (tyreId: string) =>
      api.removeResourceTyre({ tyreId, actorName, quarantine: true }),
    onSuccess: invalidate,
  })

  const fitStock = useMutation({
    mutationFn: (tyre: TyreAsset) =>
      api.fitResourceTyre({
        tyreId: tyre.id,
        vehicleId: 'veh-4',
        position: 'OSR',
        positionLabel: 'Offside rear',
        actorName,
      }),
    onSuccess: invalidate,
  })

  const rotate = useMutation({
    mutationFn: () => {
      const fitted = hub.tyres.filter((t) => t.vehicleId === 'veh-1' && t.status === 'fitted')
      if (fitted.length < 2) throw new Error('Need two fitted tyres on AB12 CDE')
      return api.rotateResourceTyres({
        vehicleId: 'veh-1',
        aTyreId: fitted[0].id,
        bTyreId: fitted[1].id,
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
          <h2 className="text-lg font-semibold text-slate-900">Tyre register</h2>
          <p className="text-sm text-slate-600">
            Individual assets with fit / remove / rotate — re-torque links to the vehicle wheels tab.
          </p>
        </div>
        <button
          type="button"
          onClick={() => rotate.mutate()}
          disabled={rotate.isPending}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Rotate AB12 CDE fronts
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
                : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {byVehicle.size > 0 && filter !== 'stock' && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Vehicle position map</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {[...byVehicle.entries()].map(([vehicleId, list]) => (
              <div key={vehicleId} className="rounded-xl border border-slate-200 p-3">
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
                          : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <div className="font-medium">{t.positionLabel ?? t.position}</div>
                      <div className="text-xs text-slate-600">
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

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
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
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium tabular-nums">{t.internalId}</td>
                <td className="px-3 py-2">
                  {t.brand} {t.size}
                  <div className="text-xs text-slate-500">DOT {t.dotCode}</div>
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
                    <div className="text-xs text-slate-500">{t.positionLabel}</div>
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
                      className="text-xs font-medium text-command-700 hover:underline"
                      onClick={() => fitStock.mutate(t)}
                    >
                      Fit to CD34 EFG
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
