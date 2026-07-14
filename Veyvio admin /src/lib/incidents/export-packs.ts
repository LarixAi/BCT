import { CATEGORY_LABELS, SEVERITY_DISPLAY, STATUS_LABELS } from './constants'
import type { IncidentDetailRecord } from './types'

function section(title: string, lines: string[]): string {
  return [`## ${title}`, ...lines, ''].join('\n')
}

export function buildRegulatorExportPack(incident: IncidentDetailRecord): string {
  const lines: string[] = [
    '# Incident regulatory export pack',
    `Generated: ${new Date().toISOString()}`,
    `Reference: ${incident.incidentRef}`,
    '',
    section('Incident summary', [
      `Title: ${incident.title}`,
      `Category: ${CATEGORY_LABELS[incident.category] ?? incident.category}`,
      `Severity: ${SEVERITY_DISPLAY[incident.severity] ?? incident.severity}`,
      `Status: ${STATUS_LABELS[incident.status] ?? incident.status}`,
      `Occurred: ${incident.occurredAt}`,
      `Location: ${incident.location ?? incident.depotName}`,
      `Reported by: ${incident.reportedBy}`,
    ]),
    section('Operational summary', [incident.operationalSummary ?? incident.fullDescription]),
    section('People involved', incident.people.map((p) => `${p.name} (${p.role}) — injury: ${p.injuryStatus}`)),
    section('Regulatory assessments', incident.regulatoryAssessments.map((r) => `${r.label}: ${r.status}${r.decision ? ` — ${r.decision}` : ''}`)),
    section('Corrective actions', incident.correctiveActions.map((a) => `${a.title} — ${a.status} — due ${a.dueDate}`)),
    section('Timeline', incident.timeline.map((e) => `${e.occurredAt} — ${e.action} — ${e.actorName}${e.detail ? ` (${e.detail})` : ''}`)),
  ]
  return lines.join('\n')
}

export function buildInsurerExportPack(incident: IncidentDetailRecord): string {
  const lines: string[] = [
    '# Incident insurer notification pack',
    `Generated: ${new Date().toISOString()}`,
    `Reference: ${incident.incidentRef}`,
    '',
    section('Claim summary', [
      `Incident: ${incident.title}`,
      `Date/time: ${incident.occurredAt}`,
      `Location: ${incident.location ?? '—'}`,
      `Vehicle: ${incident.operationalLinks.vehicleRegistration ?? '—'}`,
      `Driver: ${incident.operationalLinks.driverName ?? '—'}`,
      `Run: ${incident.operationalLinks.runReference ?? '—'}`,
    ]),
    section('Damage and injury', [
      incident.fullDescription,
      ...incident.people.filter((p) => p.injuryStatus !== 'none').map((p) => `Injury — ${p.name}: ${p.injuryStatus}`),
    ]),
    section('Evidence index', incident.evidence.map((e) => `${e.kind}: ${e.label} (${e.uploadedAt})`)),
    section('Vehicle status', [
      `Vehicle operational: ${incident.vehicleStillOperational ? 'Yes' : 'No — VOR'}`,
      `Linked defect: ${incident.operationalLinks.linkedDefectId ?? 'None'}`,
    ]),
  ]
  return lines.join('\n')
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
