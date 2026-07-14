import type { IncidentSettings } from './types'

export const DEFAULT_INCIDENT_SETTINGS: IncidentSettings = {
  requireSeniorAckForCritical: true,
  autoBlockVehicleOnCritical: true,
  autoPauseDriverOnCritical: true,
  icoAssessmentHours: 72,
  riddorAssessmentDays: 15,
  nearMissTrackingEnabled: true,
  welfareFollowUpDays: 7,
  notifyRoles: ['safety_manager', 'safeguarding_lead', 'operations_manager'],
}
