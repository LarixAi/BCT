import type { IncidentAutomationRule, IncidentCategory, IncidentSeverity } from './types'

export const DEFAULT_INCIDENT_AUTOMATION_RULES: IncidentAutomationRule[] = [
  {
    id: 'rule-collision',
    name: 'Collision reported',
    trigger: 'road_collision',
    enabled: true,
    actions: ['create_incident', 'block_vehicle', 'preserve_telematics', 'notify_control', 'insurer_assessment'],
    description: 'Capture GPS, manifest, and telematics; block vehicle and start insurer assessment',
  },
  {
    id: 'rule-passenger-injury',
    name: 'Passenger injury',
    trigger: 'passenger_injury',
    enabled: true,
    actions: ['create_welfare_record', 'restrict_medical', 'schedule_follow_up', 'assess_riddor'],
    description: 'Create welfare record, restrict medical details, assess RIDDOR relevance',
  },
  {
    id: 'rule-missing-child',
    name: 'Missing child or vulnerable passenger',
    trigger: 'passenger_missing',
    enabled: true,
    actions: ['classify_critical', 'alert_safeguarding', 'preserve_manifest', 'block_closure'],
    description: 'Critical classification, safeguarding alert, manifest preservation',
  },
  {
    id: 'rule-data-breach',
    name: 'Data security incident',
    trigger: 'data_security',
    enabled: true,
    actions: ['restrict_access', 'notify_dpo', 'start_ico_clock', 'record_containment'],
    description: 'Restrict access, notify DPO, start 72-hour ICO assessment clock',
  },
  {
    id: 'rule-equipment-failure',
    name: 'Accessibility equipment failure',
    trigger: 'accessibility_failure',
    enabled: true,
    actions: ['create_defect', 'mark_equipment_unavailable', 'create_inspection'],
    description: 'Create linked defect and inspection job',
  },
  {
    id: 'rule-telematics',
    name: 'Telematics harsh event',
    trigger: 'telematics_alert',
    enabled: true,
    actions: ['create_near_miss', 'preserve_telematics', 'notify_safety'],
    description: 'Auto-create near-miss incident from telematics collision detection',
  },
]

export function rulesForCategory(category: IncidentCategory): IncidentAutomationRule[] {
  return DEFAULT_INCIDENT_AUTOMATION_RULES.filter((r) => r.trigger === category && r.enabled)
}

export function rulesForTelematicsEvent(eventType: string): IncidentAutomationRule[] {
  if (['harsh_braking', 'collision_detected', 'rollover_detected'].includes(eventType)) {
    return DEFAULT_INCIDENT_AUTOMATION_RULES.filter((r) => r.trigger === 'telematics_alert' && r.enabled)
  }
  return []
}

export function formatIncidentAutomationActions(actions: string[]): string {
  return actions.map((a) => a.replace(/_/g, ' ')).join(' · ')
}

export function shouldAutoBlockVehicle(severity: IncidentSeverity, category: IncidentCategory): boolean {
  return severity === 'critical' || category === 'road_collision' || category === 'vehicle_fire'
}
