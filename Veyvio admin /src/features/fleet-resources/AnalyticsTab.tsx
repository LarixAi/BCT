import { Link } from 'react-router-dom'
import type { FleetResourcesHubData } from '@/lib/fleet-resources/types'

export function AnalyticsTab({ hub }: { hub: FleetResourcesHubData }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Operational intelligence</h2>
        <p className="text-sm text-slate-600">
          Fuel anomalies, consumption baselines, stock forecasts and tyre recommendations.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-slate-900">Fuel anomalies</h3>
        {hub.anomalies.length === 0 ? (
          <p className="text-sm text-slate-500">No fuel anomalies in the current ledger window.</p>
        ) : (
          <ul className="space-y-2">
            {hub.anomalies.map((a) => (
              <li
                key={a.id}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  a.severity === 'critical'
                    ? 'border-red-200 bg-red-50'
                    : a.severity === 'high'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-medium">{a.title}</p>
                  {a.vehicleId && a.registrationNumber && (
                    <Link
                      to={`/vehicles/${a.vehicleId}`}
                      className="font-semibold tabular-nums text-command-700 hover:underline"
                    >
                      {a.registrationNumber}
                    </Link>
                  )}
                </div>
                <p className="mt-1 opacity-90">{a.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-slate-900">Consumption baselines</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Vehicle</th>
                <th className="px-3 py-2">Actual MPG</th>
                <th className="px-3 py-2">Baseline</th>
                <th className="px-3 py-2">Variance</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {hub.baselines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    Need multiple odometer-linked fills to calculate MPG.
                  </td>
                </tr>
              ) : (
                hub.baselines.map((b) => (
                  <tr key={b.vehicleId} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <Link
                        to={`/vehicles/${b.vehicleId}`}
                        className="font-semibold tabular-nums text-command-700 hover:underline"
                      >
                        {b.registrationNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {b.mpgActual != null ? b.mpgActual.toFixed(1) : '—'}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{b.mpgBaseline.toFixed(1)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {b.variancePct != null ? `${b.variancePct}%` : '—'}
                    </td>
                    <td className="px-3 py-2 capitalize">{b.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-slate-900">Stock forecast (7 days)</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Depot</th>
                <th className="px-3 py-2">Resource</th>
                <th className="px-3 py-2">Available</th>
                <th className="px-3 py-2">Demand 7d</th>
                <th className="px-3 py-2">Days left</th>
                <th className="px-3 py-2">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {hub.forecasts.map((f) => (
                <tr key={`${f.depotName}-${f.resourceItemId}`} className="border-t border-slate-100">
                  <td className="px-3 py-2">{f.depotName}</td>
                  <td className="px-3 py-2 font-medium">{f.resourceName}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {f.available}
                    {f.unit}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {f.projectedDemand7d}
                    {f.unit}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {f.daysUntilStockout != null ? f.daysUntilStockout : '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{f.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-slate-900">Tyre wear / alignment</h3>
        <ul className="space-y-2 text-sm">
          {hub.tyres
            .filter((t) => t.recommendation)
            .map((t) => (
              <li key={t.id} className="rounded-xl border border-slate-200 px-4 py-3">
                <span className="font-semibold tabular-nums">{t.registrationNumber ?? t.depotName}</span>
                {' — '}
                {t.internalId}: {t.recommendation}
                {t.linkedInspectionId && (
                  <>
                    {' '}
                    <Link
                      to={`/inspections/${t.linkedInspectionId}`}
                      className="text-command-700 hover:underline"
                    >
                      Open inspection
                    </Link>
                  </>
                )}
              </li>
            ))}
          {hub.tyres.every((t) => !t.recommendation) && (
            <li className="text-slate-500">No tyre wear recommendations open.</li>
          )}
        </ul>
      </section>
    </div>
  )
}
