import { CATEGORY_LABELS, SEVERITY_DISPLAY, STATUS_LABELS } from './constants'
import type { IncidentRegisterRow } from './types'

function escapeCsv(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function incidentsToCsv(rows: IncidentRegisterRow[]): string {
  const headers = [
    'Reference',
    'Title',
    'Severity',
    'Status',
    'Category',
    'Reported',
    'Depot',
    'Owner',
    'Involved',
    'Journey',
    'Safeguarding',
    'Acknowledged',
    'External flags',
  ]

  const lines = rows.map((row) =>
    [
      row.incidentRef,
      row.title,
      SEVERITY_DISPLAY[row.severity] ?? row.severity,
      STATUS_LABELS[row.status] ?? row.status,
      CATEGORY_LABELS[row.category] ?? row.category,
      row.reportedAt,
      row.depotName,
      row.ownerName,
      row.involvedSummary,
      row.journeyReference,
      row.isSafeguarding ? 'Yes' : 'No',
      row.isAcknowledged ? 'Yes' : 'No',
      row.externalFlags.join('; '),
    ]
      .map(escapeCsv)
      .join(','),
  )

  return [headers.join(','), ...lines].join('\n')
}

export function downloadIncidentsCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
