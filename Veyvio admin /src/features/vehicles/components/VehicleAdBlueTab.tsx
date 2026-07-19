import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { formatMileage, normalizeAdBlueRecords } from '@/lib/adblue/normalize'
import { FUEL_TYPE_LABELS } from '@/lib/vehicles/constants'
import type { VehicleProfile } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'

const FILL_LABELS: Record<string, string> = {
  full: 'Filled AdBlue tank',
  partial: 'Partial AdBlue top-up',
  emergency: 'Emergency AdBlue top-up',
}

const SOURCE_LABELS: Record<string, string> = {
  depot_dispenser: 'Depot AdBlue dispenser',
  retail_station: 'Retail AdBlue (forecourt)',
  container: 'Container / jerry can',
  mobile_service: 'Mobile service',
  workshop: 'Workshop',
  other: 'Other',
}

function fuelUsesAdBlue(fuelType: VehicleProfile['fuelType']) {
  return fuelType === 'diesel' || fuelType === 'hybrid'
}

export function VehicleAdBlueTab({ vehicle }: { vehicle: VehicleProfile }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['vehicle-adblue', vehicle.id],
    queryFn: () => api.getVehicleAdBlueRecords(vehicle.id),
  })

  const rows = normalizeAdBlueRecords(data)
  const latest = rows[0]
  const fuelLabel = FUEL_TYPE_LABELS[vehicle.fuelType] ?? vehicle.fuelType
  const adBlueRelevant = fuelUsesAdBlue(vehicle.fuelType)

  return (
    <div className="space-y-4">
      <SectionCard
        title="Fuel vs AdBlue"
        description="These are different tanks and different jobs — do not treat AdBlue as fuel"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fuel</p>
            <p className="mt-1 font-semibold text-slate-900">{fuelLabel}</p>
            <p className="mt-2 text-slate-600">
              Petrol or diesel goes in the <span className="font-medium text-slate-800">fuel tank</span> and
              powers the engine. Electric / hybrid vehicles use charge instead of (or as well as) liquid fuel.
            </p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Fuel type</dt>
                <dd className="font-medium">{fuelLabel}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Fuel / charge level</dt>
                <dd className="font-medium tabular-nums">
                  {vehicle.fuelType === 'electric' && vehicle.batteryLevelPercent != null
                    ? `${vehicle.batteryLevelPercent}% charge`
                    : vehicle.fuelLevelPercent != null
                      ? `${vehicle.fuelLevelPercent}% fuel tank`
                      : '—'}
                </dd>
              </div>
            </dl>
            <Link
              to="/fleet-resources?tab=fuel"
              className="mt-3 inline-block text-sm font-medium text-command-700 hover:underline"
            >
              Fuel purchases & cards →
            </Link>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AdBlue</p>
            <p className="mt-1 font-semibold text-slate-900">
              {adBlueRelevant ? 'Emissions fluid (not fuel)' : 'Not used on this fuel type'}
            </p>
            <p className="mt-2 text-slate-600">
              AdBlue is a urea solution for diesel exhaust treatment. It goes in a{' '}
              <span className="font-medium text-slate-800">separate AdBlue tank</span> — not the fuel tank and
              not into the engine as diesel. Running out can put the vehicle into limp mode or prevent restart.
            </p>
            {!adBlueRelevant && (
              <p className="mt-2 text-amber-900">
                This vehicle is recorded as {fuelLabel}. AdBlue top-ups are normally only required for diesel
                (and some hybrid diesel) vehicles.
              </p>
            )}
            <Link
              to="/fleet-resources?tab=fluids"
              className="mt-3 inline-block text-sm font-medium text-command-700 hover:underline"
            >
              AdBlue & fluids stock →
            </Link>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Current AdBlue status" description="Last recorded AdBlue top-up — not a fuel fill">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading AdBlue history…</p>
        ) : error ? (
          <p className="text-sm text-red-800">
            {error instanceof Error ? error.message : 'Could not load AdBlue records'}
          </p>
        ) : latest ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-500">Last AdBlue addition</dt>
              <dd className="font-medium">
                {latest.occurredAt ? new Date(latest.occurredAt).toLocaleString('en-GB') : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">AdBlue amount</dt>
              <dd className="font-medium tabular-nums">
                {latest.amountLitres != null ? `${latest.amountLitres} L` : '—'} ·{' '}
                {FILL_LABELS[latest.fillType] ?? latest.fillType}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Mileage at top-up</dt>
              <dd className="font-medium tabular-nums">{formatMileage(latest.mileage)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Recorded by</dt>
              <dd className="font-medium">
                {latest.recordedByName || '—'}
                <span className="block text-xs text-slate-500">{latest.recordedByRole || '—'}</span>
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-slate-500">
            {adBlueRelevant
              ? 'No AdBlue top-ups recorded yet. Yard and drivers record AdBlue from the vehicle or duty menus — not as a diesel fill.'
              : 'No AdBlue records for this vehicle.'}
          </p>
        )}
      </SectionCard>

      <SectionCard title="AdBlue history" description={`${rows.length} AdBlue record${rows.length === 1 ? '' : 's'}`}>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">
            AdBlue litres only. Diesel/petrol purchases appear under Fleet Resources → Fuel.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                  <th className="pb-2 pr-3 font-medium">Date / time</th>
                  <th className="pb-2 pr-3 font-medium">Mileage</th>
                  <th className="pb-2 pr-3 font-medium">AdBlue amount</th>
                  <th className="pb-2 pr-3 font-medium">Source</th>
                  <th className="pb-2 pr-3 font-medium">Added by</th>
                  <th className="pb-2 pr-3 font-medium">Recorded by</th>
                  <th className="pb-2 font-medium">Warning</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50">
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      {row.occurredAt ? new Date(row.occurredAt).toLocaleString('en-GB') : '—'}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatMileage(row.mileage)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {row.amountLitres != null ? `${row.amountLitres} L` : '—'}
                      <span className="block text-xs text-slate-500">
                        {FILL_LABELS[row.fillType] ?? row.fillType}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      {SOURCE_LABELS[row.sourceType] ?? row.sourceType ?? '—'}
                      {row.sourceLabel ? <span className="block text-xs text-slate-500">{row.sourceLabel}</span> : null}
                    </td>
                    <td className="py-2.5 pr-3">
                      {row.physicallyAddedBy === 'self'
                        ? row.recordedByName
                        : row.physicallyAddedByName ?? row.physicallyAddedBy ?? '—'}
                    </td>
                    <td className="py-2.5 pr-3">
                      {row.recordedByName || '—'}
                      <span className="block text-xs text-slate-500">{row.recordedByRole || '—'}</span>
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <StatusPill status={row.warningBefore === 'none' ? 'compliant' : 'warning'} />
                        {row.createDefectSuggested && <StatusPill status="non_compliant" />}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Cleared: {(row.warningCleared ?? 'not_checked').replace(/_/g, ' ')}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
