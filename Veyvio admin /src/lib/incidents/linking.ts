import type { IncidentLinkedEntities } from './types'

export function emptyLinkedEntities(): IncidentLinkedEntities {
  return {
    schoolId: null,
    schoolName: null,
    contractId: null,
    contractName: null,
    passengerIds: [],
    passengerNames: [],
    manifestId: null,
    manifestLabel: null,
    manifestVersion: null,
    manifestFrozen: false,
    customerName: null,
    customerId: null,
  }
}

export function linkedEntitiesSummary(links: IncidentLinkedEntities): string {
  const parts: string[] = []
  if (links.schoolName) parts.push(links.schoolName)
  if (links.contractName) parts.push(links.contractName)
  if (links.passengerNames.length) parts.push(`${links.passengerNames.length} passenger(s)`)
  if (links.manifestLabel) parts.push(links.manifestLabel)
  return parts.length ? parts.join(' · ') : 'No linked entities'
}
