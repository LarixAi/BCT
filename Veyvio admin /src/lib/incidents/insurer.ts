import type { IncidentInsurerConnector, IncidentInsurerSubmission } from './types'

export const INCIDENT_INSURER_CONNECTORS: IncidentInsurerConnector[] = [
  {
    id: 'conn-aviva',
    name: 'Aviva Fleet',
    status: 'connected',
    lastSyncAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
    supportsAutoSubmit: true,
  },
  {
    id: 'conn-zurich',
    name: 'Zurich Commercial',
    status: 'connected',
    lastSyncAt: new Date(Date.now() - 24 * 60 * 60_000).toISOString(),
    supportsAutoSubmit: false,
  },
]

export function defaultInsurerSubmission(): IncidentInsurerSubmission {
  return {
    id: `ins-sub-${Date.now()}`,
    connectorId: 'conn-aviva',
    insurerName: 'Aviva Fleet',
    status: 'not_submitted',
    submittedAt: null,
    externalReference: null,
    lastError: null,
  }
}

export function mockInsurerSubmit(
  submission: IncidentInsurerSubmission,
  incidentRef: string,
): IncidentInsurerSubmission {
  return {
    ...submission,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    externalReference: `AVIVA-${incidentRef.replace(/[^0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
    lastError: null,
  }
}
