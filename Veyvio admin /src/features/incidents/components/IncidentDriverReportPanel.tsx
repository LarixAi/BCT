import type { IncidentDetailRecord } from '@/lib/incidents/types'
import { CATEGORY_LABELS } from '@/lib/incidents/constants'
import { driverReportStageLabel } from '@veyvio/incidents'

function formatAnswerValue(value: unknown): string {
  if (value === 'yes') return 'Yes'
  if (value === 'no') return 'No'
  if (value === 'unknown') return 'Unknown'
  if (value === 'not_yet_confirmed') return 'Not yet confirmed'
  if (value === 'not_applicable') return 'Not applicable'
  if (value === 'emergency_contacted') return 'Emergency services contacted'
  if (value == null || value === '') return '—'
  return String(value)
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
}

export function IncidentDriverIntakePanel({ incident }: { incident: IncidentDetailRecord }) {
  const report = incident.driverReport
  if (!report || incident.reportingSource !== 'driver_app') return null

  const answers = report.originalAnswers
  const injury = answers.injuryReported?.value
  const danger = answers.immediateDanger?.value
  const journeyContinue = answers.journeyCanContinue?.value
  const passengersOnboard = answers.passengersOnboard?.value

  const missing: string[] = []
  if (injury === 'not_yet_confirmed' || injury == null) missing.push('Injury confirmation')
  if (!answers.policeAttended) missing.push('Police attendance')
  if (!answers.driverStatement) missing.push('Full driver statement')
  if (!answers.otherVehicleRegistration && answers.anotherVehicleInvolved?.value === 'yes') {
    missing.push('Other vehicle details')
  }

  return (
    <div className="rounded-xl border border-command-200 bg-command-50/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-command-700">New driver incident report</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs text-muted">Reference</p>
          <p className="font-semibold text-ink">{incident.incidentRef}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Incident</p>
          <p className="font-semibold text-ink">{CATEGORY_LABELS[incident.category] ?? incident.category}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Reported by</p>
          <p className="font-semibold text-ink">{incident.driverName ?? incident.reportedBy} — Driver</p>
        </div>
        <div>
          <p className="text-xs text-muted">Vehicle</p>
          <p className="font-semibold text-ink">{incident.vehicleRegistration ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Journey</p>
          <p className="font-semibold text-ink">{incident.journeyReference ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Location</p>
          <p className="font-semibold text-ink">{incident.location ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Immediate danger</p>
          <p className="font-semibold text-ink">{formatAnswerValue(danger)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Injuries</p>
          <p className="font-semibold text-ink">
            {injury === 'not_yet_confirmed' || injury == null ? 'Not yet confirmed' : formatAnswerValue(injury)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Passengers onboard</p>
          <p className="font-semibold text-ink">{formatAnswerValue(passengersOnboard)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Journey status</p>
          <p className="font-semibold text-ink">
            {journeyContinue === 'no' ? 'Cannot continue' : formatAnswerValue(journeyContinue)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-surface px-3 py-1 font-medium text-ink-soft">
          Driver report: {driverReportStageLabel(report.stage)}
        </span>
        <span className="rounded-full bg-surface px-3 py-1 font-medium text-ink-soft">
          Completeness: {report.completenessScore}%
        </span>
        <span className="rounded-full bg-surface px-3 py-1 font-medium text-ink-soft">
          App v{report.driverAppVersion}
        </span>
      </div>

      {report.offlineCapture && (
        <p className="mt-3 text-sm text-amber-800">
          Report was captured offline at {new Date(report.offlineCapture.locallySubmittedAt).toLocaleString('en-GB')} and
          uploaded at {new Date(report.offlineCapture.serverReceivedAt).toLocaleString('en-GB')}.
        </p>
      )}

      {missing.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-ink">Missing information</p>
          <ul className="mt-2 list-inside list-disc text-sm text-ink-soft">
            {missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function IncidentDriverReportPanel({ incident }: { incident: IncidentDetailRecord }) {
  const report = incident.driverReport
  if (!report) {
    return <p className="text-sm text-muted">No structured driver submission is linked to this incident.</p>
  }

  const entries = Object.entries(report.originalAnswers)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface-muted p-4 text-sm text-ink-soft">
        <p>
          <span className="font-medium">Submission stage:</span> {driverReportStageLabel(report.stage)}
        </p>
        <p className="mt-1">
          <span className="font-medium">Form version:</span> {report.formDefinitionVersion} · Schema {report.schemaVersion}
        </p>
        <p className="mt-1">
          <span className="font-medium">Driver app:</span> {report.driverAppVersion}
        </p>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border">
        {entries.map(([key, field]) => (
          <div key={key} className="px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{formatFieldLabel(key)}</p>
            <p className="mt-1 text-sm text-ink">{formatAnswerValue(field.value)}</p>
            <p className="mt-1 text-xs text-muted">
              Source: {field.source} · {new Date(field.enteredAt).toLocaleString('en-GB')}
              {field.confidence === 'UNCONFIRMED' || field.value === 'not_yet_confirmed'
                ? ' · Status: Unconfirmed'
                : ''}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted">
        Investigation findings are recorded separately and must not overwrite these original driver answers.
      </p>
    </div>
  )
}
