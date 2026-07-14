import type { VehicleCategory, WheelPositionState, WheelRetorqueTask } from './types'

const MINIBUS_LAYOUT = [
  { position: 'fl', label: 'Front left' },
  { position: 'fr', label: 'Front right' },
  { position: 'rlo', label: 'Rear outer left' },
  { position: 'rli', label: 'Rear inner left' },
  { position: 'rri', label: 'Rear inner right' },
  { position: 'rro', label: 'Rear outer right' },
  { position: 'spare', label: 'Spare wheel' },
]

const COACH_LAYOUT = [
  { position: 'fl', label: 'Front left' },
  { position: 'fr', label: 'Front right' },
  { position: 'dri', label: 'Drive inner right' },
  { position: 'dro', label: 'Drive outer right' },
  { position: 'tag_lo', label: 'Tag axle outer left' },
  { position: 'tag_li', label: 'Tag axle inner left' },
  { position: 'tag_ri', label: 'Tag axle inner right' },
  { position: 'tag_ro', label: 'Tag axle outer right' },
]

export function defaultWheelLayout(category: VehicleCategory, retorqueDueAt?: string | null): WheelPositionState[] {
  const layout = category === 'coach' ? COACH_LAYOUT : MINIBUS_LAYOUT
  const overdue = retorqueDueAt ? new Date(retorqueDueAt).getTime() < Date.now() : false
  return layout.map((p, i) => ({
    ...p,
    tyreId: `TYR-${p.position.toUpperCase()}`,
    treadDepthMm: 5.5 - i * 0.3,
    pressurePsi: 65,
    lastTorqueDate: retorqueDueAt ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() : null,
    retorqueDueAt: i === 0 && retorqueDueAt ? retorqueDueAt : null,
    retorqueOverdue: i === 0 && overdue,
    condition: (5.5 - i * 0.3) < 2 ? 'replace' : (5.5 - i * 0.3) < 3 ? 'warning' : 'good',
  }))
}

export function createRetorqueTask(positions: string[], technician: string, dueDays = 2): WheelRetorqueTask {
  const dueAt = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString()
  return {
    id: `wrt-${Date.now()}`,
    positions,
    initialTorqueAt: new Date().toISOString(),
    dueAt,
    completedAt: null,
    technician,
    status: 'pending',
  }
}

export function nearestRetorqueDue(layout: WheelPositionState[]): string | null {
  const dates = layout.map((w) => w.retorqueDueAt).filter(Boolean) as string[]
  if (dates.length === 0) return null
  dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  return dates[0]!
}
