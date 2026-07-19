import { Link } from 'react-router-dom'
import { FUEL_CARD_STATUS_LABEL } from '@/lib/fleet-resources/constants'
import type { FleetResourcesHubData } from '@/lib/fleet-resources/types'

export function CardsTab({ hub }: { hub: FleetResourcesHubData }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Fuel cards</h2>
        <p className="text-sm text-slate-600">
          Light register for Phase 1 — assignment and status only. Provider feeds come later.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Provider</th>
              <th className="px-3 py-2">Number</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Assigned to</th>
              <th className="px-3 py-2">Daily limit</th>
              <th className="px-3 py-2">Last use</th>
            </tr>
          </thead>
          <tbody>
            {hub.cards.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
                  No fuel cards on the register yet. Cards assigned to vehicles will show here.
                </td>
              </tr>
            ) : (
              hub.cards.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{c.provider}</td>
                  <td className="px-3 py-2 tabular-nums">{c.maskedNumber}</td>
                  <td className="px-3 py-2">{FUEL_CARD_STATUS_LABEL[c.status]}</td>
                  <td className="px-3 py-2">
                    {c.assignedVehicleId && c.assignedRegistration ? (
                      <Link
                        to={`/vehicles/${c.assignedVehicleId}`}
                        className="font-semibold tabular-nums text-command-700 hover:underline"
                      >
                        {c.assignedRegistration}
                      </Link>
                    ) : c.assignedDriverName ? (
                      c.assignedDriverName
                    ) : (
                      <span className="text-slate-500">Unassigned</span>
                    )}
                    <div className="text-xs capitalize text-slate-400">{c.assignmentModel}</div>
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {c.dailyLimit != null ? `£${c.dailyLimit}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {c.lastTransactionAt ? new Date(c.lastTransactionAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
