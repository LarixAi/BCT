import { Link } from 'react-router-dom'
import { BUDGET_HEALTH_LABEL } from '@/lib/fleet-resources/constants'
import type { FleetResourcesHubData } from '@/lib/fleet-resources/types'

export function FinanceTab({ hub }: { hub: FleetResourcesHubData }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Budgets & whole-life cost</h2>
        <p className="text-sm text-slate-600">
          Phase 5 stubs — cost centres, budget health and replacement signals from resource spend.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-slate-900">Cost centre budgets</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Cost centre</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">Budget</th>
                <th className="px-3 py-2">Spent</th>
                <th className="px-3 py-2">Forecast</th>
                <th className="px-3 py-2">Health</th>
              </tr>
            </thead>
            <tbody>
              {hub.budgets.map((b) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{b.costCentre}</td>
                  <td className="px-3 py-2">{b.category}</td>
                  <td className="px-3 py-2 tabular-nums">{b.period}</td>
                  <td className="px-3 py-2 tabular-nums">£{b.budgetAmount.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">£{b.spentAmount.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">£{b.forecastAmount.toLocaleString()}</td>
                  <td
                    className={`px-3 py-2 font-medium ${
                      b.status === 'over'
                        ? 'text-red-700'
                        : b.status === 'watch'
                          ? 'text-amber-800'
                          : 'text-emerald-700'
                    }`}
                  >
                    {BUDGET_HEALTH_LABEL[b.status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-slate-900">Whole-life / replacement</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Vehicle</th>
                <th className="px-3 py-2">Resource spend YTD</th>
                <th className="px-3 py-2">Est. life left</th>
                <th className="px-3 py-2">Signal</th>
              </tr>
            </thead>
            <tbody>
              {hub.wholeLife.map((w) => (
                <tr key={w.vehicleId} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <Link
                      to={`/vehicles/${w.vehicleId}`}
                      className="font-semibold tabular-nums text-command-700 hover:underline"
                    >
                      {w.registrationNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2 tabular-nums">£{w.resourceSpendYtd.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {w.estimatedRemainingLifeYears != null
                      ? `${w.estimatedRemainingLifeYears} yrs`
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {w.replacementSuggested ? (
                      <span className="font-medium text-amber-900">
                        Review replacement — {w.reason}
                      </span>
                    ) : (
                      <span className="text-slate-600">No replacement signal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
