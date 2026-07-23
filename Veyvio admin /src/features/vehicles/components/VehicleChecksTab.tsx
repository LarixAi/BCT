import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { VehicleInspectionsPanel } from '@/features/inspections/VehicleInspectionsPanel'
import { CHECK_TEMPLATE_AREAS, CHECK_TYPE_LABELS } from '@/lib/vehicles/checks'
import type { VehicleCheckType, VehicleProfile } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'

export function VehicleChecksTab({
  vehicle,
  actorName,
  showInitialInspectionAction = false,
}: {
  vehicle: VehicleProfile
  actorName?: string
  showInitialInspectionAction?: boolean
}) {
  const queryClient = useQueryClient()

  const recordInspection = useMutation({
    mutationFn: () =>
      api.recordVehicleCheck(
        vehicle.id,
        { checkType: 'yard_release', result: 'pass', notes: 'Initial safety inspection — onboarding' },
        actorName ?? 'System',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-profile', vehicle.id] })
    },
  })

  const hasInitialInspection = vehicle.checks.some(
    (c) => ['pmi', 'yard_release'].includes(c.checkType) && c.result === 'pass',
  )

  return (
    <div className="space-y-4">
      <VehicleInspectionsPanel vehicleId={vehicle.id} registrationNumber={vehicle.registrationNumber} />

      {showInitialInspectionAction && !hasInitialInspection && actorName && (
        <SectionCard title="Initial safety inspection" description="Required for onboarding release review">
          <button
            type="button"
            onClick={() => recordInspection.mutate()}
            disabled={recordInspection.isPending}
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-60"
          >
            Record passing yard release inspection
          </button>
        </SectionCard>
      )}

      <SectionCard title="Check history" description={`${vehicle.checks.length} records`}>
        {vehicle.checks.length === 0 ? (
          <p className="text-sm text-muted">No checks recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {vehicle.checks.map((c) => (
              <li key={c.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{CHECK_TYPE_LABELS[c.checkType] ?? c.checkType}</p>
                  <StatusPill status={c.result === 'pass' ? 'compliant' : c.result === 'fail' ? 'non_compliant' : 'warning'} />
                </div>
                <p className="text-ink-soft">
                  {new Date(c.checkDate).toLocaleString('en-GB')} · {c.performedBy} · {c.sourceApplication}
                </p>
                {c.mileage != null && <p className="text-xs text-muted">Mileage: {c.mileage.toLocaleString()} mi</p>}
                {c.notes && <p className="text-xs text-muted">{c.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Check templates" description="Areas inspected by check type">
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(CHECK_TEMPLATE_AREAS) as VehicleCheckType[]).map((type) => (
            <div key={type} className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium text-ink">{CHECK_TYPE_LABELS[type]}</p>
              <p className="mt-1 text-xs text-ink-soft">{CHECK_TEMPLATE_AREAS[type].join(' · ')}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
