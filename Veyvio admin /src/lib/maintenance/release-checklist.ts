export interface ReleaseCheckItem {
  id: string
  label: string
}

const BASE_CHECKS: ReleaseCheckItem[] = [
  { id: 'brakes', label: 'Brakes' },
  { id: 'steering', label: 'Steering' },
  { id: 'tyres', label: 'Tyres' },
  { id: 'wheels', label: 'Wheels' },
  { id: 'lights', label: 'Lights' },
  { id: 'mirrors', label: 'Mirrors' },
  { id: 'warning_indicators', label: 'Warning indicators' },
  { id: 'emergency_equipment', label: 'Emergency equipment' },
  { id: 'fluid_leaks', label: 'Fluid leaks' },
  { id: 'road_test', label: 'Road test' },
]

const BRAKE_CHECKS: ReleaseCheckItem[] = [
  { id: 'brakes', label: 'Brakes' },
  { id: 'steering', label: 'Steering' },
  { id: 'tyres', label: 'Tyres' },
  { id: 'wheels', label: 'Wheels' },
  { id: 'warning_indicators', label: 'Warning indicators' },
  { id: 'road_test', label: 'Road test' },
]

const BODYWORK_CHECKS: ReleaseCheckItem[] = [
  { id: 'bodywork_hazards', label: 'Bodywork hazards' },
  { id: 'lights', label: 'Lights' },
  { id: 'mirrors', label: 'Mirrors' },
]

export function releaseChecklistForRepairType(repairType?: string): ReleaseCheckItem[] {
  if (!repairType) return BASE_CHECKS
  if (repairType.includes('brake') || repairType === 'repair') return BRAKE_CHECKS
  if (repairType.includes('body')) return BODYWORK_CHECKS
  return BASE_CHECKS
}

export function validateReleaseChecklist(
  repairType: string | undefined,
  checklist: Record<string, boolean> | undefined,
): string[] {
  const required = releaseChecklistForRepairType(repairType)
  if (!checklist) return required.map((c) => `${c.label} not checked`)
  return required.filter((c) => !checklist[c.id]).map((c) => `${c.label} not confirmed`)
}
