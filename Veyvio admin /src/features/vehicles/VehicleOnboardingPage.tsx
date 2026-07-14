import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { getOnboardingStageChecks, onboardingStageReady } from '@/lib/vehicles/onboarding-checks'
import { onboardingProgress } from '@/lib/vehicles/onboarding'
import type { OnboardingStageId, VehicleProfile } from '@/lib/vehicles/types'
import { VehicleBackLink, VehicleProfileHeader } from './components/VehicleProfileHeader'
import { VehicleChecksTab } from './components/VehicleChecksTab'
import { VehicleEquipmentTab } from './components/VehicleEquipmentTab'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

const STAGE_HINTS: Partial<Record<OnboardingStageId, { text: string; href?: string }>> = {
  documents_complete: { text: 'Upload and verify MOT, insurance and tax certificates.', href: 'documents' },
  baseline_inspection: { text: 'Record baseline damage with photos on at least three zones.', href: 'damage' },
  equipment_inventory: { text: 'Confirm fixed and removable equipment is assigned.', href: 'equipment' },
  initial_inspection: { text: 'Record a passing PMI or yard release inspection.', href: 'checks' },
  release_review: { text: 'Release engine will evaluate compliance, defects and readiness.' },
}

export function VehicleOnboardingPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const { data: vehicle, isLoading, error, isError } = useQuery({
    queryKey: ['vehicle-profile', id],
    queryFn: () => api.getVehicleProfile(id!),
    enabled: !!id,
  })

  const { data: fleet = [] } = useQuery({
    queryKey: ['vehicle-profiles'],
    queryFn: () => api.getVehicleProfiles(),
  })

  const advance = useMutation({
    mutationFn: (stageId: OnboardingStageId) => api.advanceVehicleOnboarding(id!, stageId, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-profile', id] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-directory-summary'] })
    },
  })

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>
  if (isError || !vehicle) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Vehicle not found'}</p>
  }

  const otherRegs = fleet.filter((v) => v.id !== vehicle.id).map((v) => v.registrationNumber.toUpperCase())
  const progress = onboardingProgress(vehicle.onboarding)
  const isComplete = vehicle.onboarding.currentStage === 'approved'
  const currentStage = vehicle.onboarding.currentStage
  const currentChecks = getOnboardingStageChecks(vehicle, currentStage, otherRegs)
  const currentReady = onboardingStageReady(vehicle, currentStage, otherRegs)

  return (
    <div className="space-y-6">
      <VehicleBackLink />

      <VehicleProfileHeader
        vehicle={vehicle}
        actions={
          <Link to={`/vehicles/${vehicle.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            View profile
          </Link>
        }
      />

      <SectionCard title="Onboarding wizard" description="Eight stages from identity verification to release approval">
        <div className="mb-6">
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium text-slate-700">Progress</span>
            <span className="text-slate-600">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-command-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {isComplete ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Onboarding complete
            {vehicle.onboarding.approvedBy && ` — approved by ${vehicle.onboarding.approvedBy}`}
            {vehicle.onboarding.approvedAt && ` on ${new Date(vehicle.onboarding.approvedAt).toLocaleDateString('en-GB')}`}.
            <Link to={`/vehicles/${vehicle.id}`} className="ml-2 font-medium underline">
              Open vehicle profile
            </Link>
          </div>
        ) : (
          <ol className="space-y-3">
            {vehicle.onboarding.stages.map((stage, index) => {
              const isCurrent = currentStage === stage.id
              const hint = STAGE_HINTS[stage.id]
              const checks = getOnboardingStageChecks(vehicle, stage.id, otherRegs)
              const ready = onboardingStageReady(vehicle, stage.id, otherRegs)
              return (
                <li
                  key={stage.id}
                  className={`rounded-lg border p-4 ${
                    stage.status === 'complete'
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : isCurrent
                        ? 'border-command-300 bg-command-50/40'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-500">Stage {index + 1}</p>
                      <p className="font-medium text-slate-900">{stage.label}</p>
                      <p className="mt-1 text-sm text-slate-600">{stage.description}</p>
                      {hint && isCurrent && (
                        <p className="mt-2 text-sm text-slate-700">
                          {hint.text}
                          {hint.href && (
                            <Link to={`/vehicles/${vehicle.id}?tab=${hint.href}`} className="ml-2 font-medium text-command-600 hover:underline">
                              Open tab →
                            </Link>
                          )}
                        </p>
                      )}
                      {(isCurrent || stage.status === 'complete') && checks.length > 0 && stage.id !== 'approved' && (
                        <OnboardingChecklist checks={checks} vehicleId={vehicle.id} showOnlyIncomplete={stage.status === 'complete'} />
                      )}
                      {stage.completedAt && (
                        <p className="mt-1 text-xs text-slate-500">
                          Completed {new Date(stage.completedAt).toLocaleString('en-GB')}
                          {stage.completedBy && ` by ${stage.completedBy}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <StageBadge status={stage.status} />
                      {isCurrent && stage.status !== 'complete' && stage.id !== 'approved' && (
                        <>
                          {ready && (
                            <p className="mt-2 text-xs font-medium text-emerald-700">All requirements met</p>
                          )}
                          <button
                            type="button"
                            onClick={() => advance.mutate(stage.id)}
                            disabled={advance.isPending || !ready}
                            className="mt-2 block rounded-lg bg-command-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-command-700 disabled:opacity-60"
                          >
                            Mark complete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {advance.isError && isCurrent && (
                    <p className="mt-2 text-sm text-red-700">{advance.error instanceof Error ? advance.error.message : 'Could not advance'}</p>
                  )}
                </li>
              )
            })}
          </ol>
        )}

        {!isComplete && currentStage === 'equipment_inventory' && (
          <div className="mt-6">
            <VehicleEquipmentTab vehicle={vehicle} editable actorName={actorName} />
          </div>
        )}

        {!isComplete && currentStage === 'initial_inspection' && (
          <div className="mt-6">
            <VehicleChecksTab vehicle={vehicle} actorName={actorName} showInitialInspectionAction />
          </div>
        )}

        {vehicle.lifecycleStatus === 'awaiting_onboarding' && !isComplete && (
          <p className="mt-4 text-sm text-amber-800">
            This vehicle cannot be released for allocation until onboarding is approved.
            {!currentReady && currentChecks.length > 0 && ' Complete the checklist above to continue.'}
          </p>
        )}
      </SectionCard>
    </div>
  )
}

function OnboardingChecklist({
  checks,
  vehicleId,
  showOnlyIncomplete,
}: {
  checks: ReturnType<typeof getOnboardingStageChecks>
  vehicleId: string
  showOnlyIncomplete: boolean
}) {
  const items = showOnlyIncomplete ? checks.filter((c) => !c.met) : checks
  if (items.length === 0) return null

  return (
    <ul className="mt-3 space-y-1 rounded-lg border border-slate-200 bg-white/80 p-3 text-sm">
      {items.map((check) => (
        <li key={check.id} className="flex items-start gap-2">
          <span className={check.met ? 'text-emerald-600' : 'text-slate-400'} aria-hidden>
            {check.met ? '✓' : '○'}
          </span>
          <span className={check.met ? 'text-slate-600 line-through' : 'text-slate-800'}>
            {check.label}
            {!check.met && check.href && (
              <Link to={`/vehicles/${vehicleId}?tab=${check.href}`} className="ml-2 text-command-600 hover:underline">
                Fix →
              </Link>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

function StageBadge({ status }: { status: VehicleProfile['onboarding']['stages'][number]['status'] }) {
  const styles = {
    complete: 'bg-emerald-100 text-emerald-800',
    in_progress: 'bg-command-100 text-command-800',
    pending: 'bg-slate-100 text-slate-600',
    blocked: 'bg-red-100 text-red-800',
  }
  const labels = {
    complete: 'Complete',
    in_progress: 'In progress',
    pending: 'Pending',
    blocked: 'Blocked',
  }
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>
}
