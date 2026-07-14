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
          <p className="text-xs text-slate-500">Reference</p>
          <p className="font-semibold text-slate-900">{incident.incidentRef}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Incident</p>
          <p className="font-semibold text-slate-900">{CATEGORY_LABELS[incident.category] ?? incident.category}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Reported by</p>
          <p className="font-semibold text-slate-900">{incident.driverName ?? incident.reportedBy} — Driver</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Vehicle</p>
          <p className="font-semibold text-slate-900">{incident.vehicleRegistration ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Journey</p>
          <p className="font-semibold text-slate-900">{incident.journeyReference ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Location</p>
          <p className="font-semibold text-slate-900">{incident.location ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Immediate danger</p>
          <p className="font-semibold text-slate-900">{formatAnswerValue(danger)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Injuries</p>
          <p className="font-semibold text-slate-900">
            {injury === 'not_yet_confirmed' || injury == null ? 'Not yet confirmed' : formatAnswerValue(injury)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Passengers onboard</p>
          <p className="font-semibold text-slate-900">{formatAnswerValue(passengersOnboard)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Journey status</p>
          <p className="font-semibold text-slate-900">
            {journeyContinue === 'no' ? 'Cannot continue' : formatAnswerValue(journeyContinue)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700">
          Driver report: {driverReportStageLabel(report.stage)}
        </span>
        <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700">
          Completeness: {report.completenessScore}%
        </span>
        <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700">
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
          <p className="text-sm font-semibold text-slate-800">Missing information</p>
          <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
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
    return <p className="text-sm text-slate-500">No structured driver submission is linked to this incident.</p>
  }

  const entries = Object.entries(report.originalAnswers)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
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

      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
        {entries.map(([key, field]) => (
          <div key={key} className="px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{formatFieldLabel(key)}</p>
            <p className="mt-1 text-sm text-slate-900">{formatAnswerValue(field.value)}</p>
            <p className="mt-1 text-xs text-slate-500">
              Source: {field.source} · {new Date(field.enteredAt).toLocaleString('en-GB')}
              {field.confidence === 'UNCONFIRMED' || field.value === 'not_yet_confirmed'
                ? ' · Status: Unconfirmed'
                : ''}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Investigation findings are recorded separately and must not overwrite these original driver answers.
      </p>
    </div>
  )
}
