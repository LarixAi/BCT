import type { VehicleDefectEntry } from '@/lib/vehicles/types'
import type { DefectAutomationRule } from './types'

export const DEFAULT_DEFECT_AUTOMATION_RULES: DefectAutomationRule[] = [
  {
    id: 'rule-critical-check',
    name: 'Critical vehicle-check response',
    trigger: 'critical_defect_reported',
    enabled: true,
    actions: ['mark_vor', 'block_dispatch', 'notify_operations', 'create_exception'],
    description: 'Brake/steering critical defects automatically VOR the vehicle and block dispatch',
  },
  {
    id: 'rule-accessibility',
    name: 'Accessibility equipment defect',
    trigger: 'accessibility_defect',
    enabled: true,
    actions: ['apply_wheelchair_restriction', 'notify_dispatch', 'create_maintenance_job'],
    description: 'Wheelchair lift/ramp defects restrict accessible assignments',
  },
  {
    id: 'rule-temp-repair-expiry',
    name: 'Temporary repair expiry',
    trigger: 'temporary_repair_expired',
    enabled: true,
    actions: ['reassess_availability', 'notify_maintenance', 'block_dispatch'],
    description: 'Expired temporary repairs return defect to action required',
  },
  {
    id: 'rule-repeated-component',
    name: 'Repeated component failure',
    trigger: 'recurring_component',
    enabled: true,
    actions: ['flag_recurring', 'notify_maintenance_manager', 'require_root_cause'],
    description: 'Same component failing repeatedly triggers engineering review',
  },
]

export function rulesTriggeredByDefect(defect: VehicleDefectEntry): DefectAutomationRule[] {
  const triggered: DefectAutomationRule[] = []

  if (defect.severity === 'dangerous') {
    triggered.push(DEFAULT_DEFECT_AUTOMATION_RULES.find((r) => r.id === 'rule-critical-check')!)
  }

  if (defect.category === 'accessibility' || defect.component.toLowerCase().includes('wheelchair') || defect.component.toLowerCase().includes('ramp')) {
    triggered.push(DEFAULT_DEFECT_AUTOMATION_RULES.find((r) => r.id === 'rule-accessibility')!)
  }

  return triggered.filter(Boolean)
}

export function formatAutomationActions(actions: string[]): string {
  return actions.map((a) => a.replace(/_/g, ' ')).join(' · ')
}
