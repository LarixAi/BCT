import type { OnboardingStage, OnboardingStageId, VehicleOnboardingState } from './types'

export const ONBOARDING_STAGE_DEFS: { id: OnboardingStageId; label: string; description: string }[] = [
  { id: 'created', label: 'Create vehicle', description: 'Registration, VIN and fleet number recorded' },
  { id: 'identity_verified', label: 'Identity verification', description: 'Duplicate registration/VIN checks passed' },
  { id: 'specification_complete', label: 'Specification', description: 'Capacity, accessibility and fuel configuration captured' },
  { id: 'documents_complete', label: 'Documents', description: 'MOT, insurance, tax and certificates uploaded and verified' },
  { id: 'baseline_inspection', label: 'Baseline body inspection', description: 'Yard records baseline damage on all body zones' },
  { id: 'equipment_inventory', label: 'Equipment inventory', description: 'Fixed and removable equipment assigned' },
  { id: 'initial_inspection', label: 'Initial safety inspection', description: 'Qualified inspection and roadworthiness declaration' },
  { id: 'release_review', label: 'Release review', description: 'Release engine evaluates all mandatory requirements' },
  { id: 'approved', label: 'Approved for service', description: 'Authorised for operational use' },
]

export function createInitialOnboarding(): VehicleOnboardingState {
  const stages: OnboardingStage[] = ONBOARDING_STAGE_DEFS.map((s, i) => ({
    ...s,
    status: i === 0 ? 'complete' : 'pending',
    completedAt: i === 0 ? new Date().toISOString() : null,
    completedBy: i === 0 ? 'System' : null,
  }))
  return {
    currentStage: 'identity_verified',
    stages,
    approvedAt: null,
    approvedBy: null,
  }
}

export function onboardingProgress(state: VehicleOnboardingState): number {
  const complete = state.stages.filter((s) => s.status === 'complete').length
  return Math.round((complete / state.stages.length) * 100)
}

export function nextOnboardingStage(current: OnboardingStageId): OnboardingStageId | null {
  const idx = ONBOARDING_STAGE_DEFS.findIndex((s) => s.id === current)
  if (idx < 0 || idx >= ONBOARDING_STAGE_DEFS.length - 1) return null
  return ONBOARDING_STAGE_DEFS[idx + 1]!.id
}

export function advanceOnboardingStage(
  state: VehicleOnboardingState,
  stageId: OnboardingStageId,
  actorName: string,
): VehicleOnboardingState {
  const completedAt = new Date().toISOString()
  const stages = state.stages.map((s) => {
    if (s.id === stageId) {
      return { ...s, status: 'complete' as const, completedAt, completedBy: actorName }
    }
    if (stageId === 'release_review' && s.id === 'approved') {
      return { ...s, status: 'complete' as const, completedAt, completedBy: actorName }
    }
    if (s.id === nextOnboardingStage(stageId) && stageId !== 'release_review') {
      return { ...s, status: 'in_progress' as const }
    }
    return s
  })
  const next = stageId === 'release_review' ? 'approved' : (nextOnboardingStage(stageId) ?? 'approved')
  return {
    ...state,
    stages,
    currentStage: next,
    approvedAt: stageId === 'release_review' ? completedAt : state.approvedAt,
    approvedBy: stageId === 'release_review' ? actorName : state.approvedBy,
  }
}

export function isOnboardingComplete(state: VehicleOnboardingState): boolean {
  return state.stages.every((s) => s.status === 'complete')
}
