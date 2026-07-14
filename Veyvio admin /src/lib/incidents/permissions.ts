export function canViewIncidents(permissions: string[]): boolean {
  return permissions.includes('incidents.view') || permissions.includes('incidents.manage')
}

export function canReportIncident(permissions: string[]): boolean {
  return permissions.includes('incidents.report') || permissions.includes('incidents.manage')
}

export function canAcknowledgeIncident(permissions: string[]): boolean {
  return permissions.includes('incidents.acknowledge') || permissions.includes('incidents.manage')
}

export function canInvestigateIncident(permissions: string[]): boolean {
  return permissions.includes('incidents.investigate') || permissions.includes('incidents.manage')
}

export function canAssignIncident(permissions: string[]): boolean {
  return permissions.includes('incidents.assign') || permissions.includes('incidents.manage')
}

export function canCloseIncident(permissions: string[]): boolean {
  return permissions.includes('incidents.close') || permissions.includes('incidents.manage')
}

export function canViewSafeguardingIncident(permissions: string[]): boolean {
  return permissions.includes('incidents.safeguarding') || permissions.includes('incidents.manage')
}

export function canViewMedicalIncident(permissions: string[]): boolean {
  return permissions.includes('incidents.medical') || permissions.includes('incidents.manage') || permissions.includes('incidents.safeguarding')
}

export function canUploadIncidentEvidence(permissions: string[]): boolean {
  return permissions.includes('incidents.evidence') || permissions.includes('incidents.manage') || permissions.includes('incidents.investigate')
}

export function canExportIncidents(permissions: string[]): boolean {
  return permissions.includes('incidents.export') || permissions.includes('incidents.manage') || permissions.includes('incidents.view')
}

export function canAssessRegulatory(permissions: string[]): boolean {
  return permissions.includes('incidents.regulatory') || permissions.includes('incidents.manage')
}

export function canEscalateIncident(permissions: string[]): boolean {
  return permissions.includes('incidents.escalate') || permissions.includes('incidents.manage')
}

export function canReopenIncident(permissions: string[]): boolean {
  return permissions.includes('incidents.reopen') || permissions.includes('incidents.manage')
}

export function canContainIncident(permissions: string[]): boolean {
  return permissions.includes('incidents.contain') || permissions.includes('incidents.manage')
}

export function canCreateDefectFromIncident(permissions: string[]): boolean {
  return permissions.includes('incidents.create_defect') || permissions.includes('incidents.manage')
}

export function canManageIncidentSettings(permissions: string[]): boolean {
  return permissions.includes('incidents.manage') || permissions.includes('incidents.configure')
}

export function canExportIncidentPacks(permissions: string[]): boolean {
  return permissions.includes('incidents.export') || permissions.includes('incidents.regulatory') || permissions.includes('incidents.manage')
}
