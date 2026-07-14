import { SEVERITY_DISPLAY, WORKFLOW_STATUS_LABELS } from './constants'
import type { DefectRegisterRow } from './types'

function escapeCsv(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function defectsToCsv(rows: DefectRegisterRow[]): string {
  const headers = [
    'Defect ID',
    'Severity',
    'Vehicle',
    'Fleet number',
    'Defect',
    'Category',
    'Availability',
    'Source',
    'Reported',
    'Location',
    'Assigned to',
    'Status',
    'SLA remaining',
    'Age (hours)',
    'Overdue',
    'Recurring',
  ]

  const lines = rows.map((row) =>
    [
      row.defectRef,
      SEVERITY_DISPLAY[row.severity] ?? row.severity,
      row.registrationNumber,
      row.fleetNumber,
      row.description,
      row.category,
      row.vehicleAvailability,
      row.source,
      row.reportedAt,
      row.location ?? row.depotName,
      row.assignee,
      WORKFLOW_STATUS_LABELS[row.workflowStatus] ?? row.workflowStatus,
      row.slaMinutesRemaining,
      Math.round(row.ageMinutes / 60),
      row.isOverdue ? 'Yes' : 'No',
      row.isRecurring ? 'Yes' : 'No',
    ]
      .map(escapeCsv)
      .join(','),
  )

  return [headers.join(','), ...lines].join('\n')
}

export function downloadDefectsCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
