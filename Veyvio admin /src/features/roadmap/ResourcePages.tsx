import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'

type ResourceRow = Record<string, unknown>
type Column = { key: string; label: string }

type ResourcePageDefinition = {
  title: string
  description: string
  endpoint: string
  columns: Column[]
  objectKey?: string
  detail?: boolean
  rule?: string
}

function readValue(row: ResourceRow, key: string): unknown {
  return key.split('.').reduce<unknown>((value, part) => {
    if (!value || typeof value !== 'object') return undefined
    return (value as ResourceRow)[part]
  }, row)
}

function formatValue(value: unknown): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toLocaleString('en-GB')
  if (Array.isArray(value)) return value.map(formatValue).join(', ')
  if (typeof value === 'object') {
    const object = value as ResourceRow
    return String(object.label ?? object.name ?? object.reason ?? object.status ?? 'Recorded')
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  }
  return String(value).replaceAll('_', ' ')
}

function rowsFromData(data: unknown, objectKey?: string): ResourceRow[] {
  if (Array.isArray(data)) return data as ResourceRow[]
  if (!data || typeof data !== 'object') return []
  const object = data as ResourceRow
  if (objectKey && Array.isArray(object[objectKey])) return object[objectKey] as ResourceRow[]
  if (Array.isArray(object.items)) return object.items as ResourceRow[]
  if (Array.isArray(object.results)) return object.results as ResourceRow[]
  if (Array.isArray(object.drivers) || Array.isArray(object.vehicles)) {
    return [
      ...((object.drivers as ResourceRow[] | undefined) ?? []).map((row) => ({ ...row, resourceType: 'Driver' })),
      ...((object.vehicles as ResourceRow[] | undefined) ?? []).map((row) => ({ ...row, resourceType: 'Vehicle' })),
    ]
  }
  return [object]
}

function ResourcePage({ definition }: { definition: ResourcePageDefinition }) {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const baseEndpoint = definition.endpoint
    .replace(':id', params.id ?? '')
    .replace(':dutyId', params.dutyId ?? '')
    .replace(':workOrderId', params.workOrderId ?? '')
    .replace(':inspectionId', params.inspectionId ?? '')
    .replace(':passengerId', params.passengerId ?? '')
    .replace(':customerId', params.customerId ?? '')
    .replace(':schoolId', params.schoolId ?? '')
    .replace(':contractId', params.contractId ?? '')
    .replace(':conversationId', params.conversationId ?? '')
  const endpoint = baseEndpoint === '/search'
    ? `/search?q=${encodeURIComponent(searchParams.get('q') ?? '')}`
    : baseEndpoint

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['command-resource', endpoint],
    queryFn: () => api.getCommandResource<unknown>(endpoint),
  })
  const rows = useMemo(() => rowsFromData(data, definition.objectKey), [data, definition.objectKey])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{definition.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">{definition.description}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
          Live backend
        </span>
      </div>

      {definition.rule && (
        <div className="rounded-lg border border-command-200 bg-command-50 px-4 py-3 text-sm text-command-900">
          <span className="font-semibold">Operational rule: </span>{definition.rule}
        </div>
      )}

      <SectionCard
        title={definition.detail ? 'Record summary' : definition.title}
        description={isLoading ? 'Loading current operational data…' : `${rows.length} ${definition.detail ? 'record' : 'results'}`}
      >
        {isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error instanceof Error ? error.message : `Could not load ${definition.title.toLowerCase()}`}
          </div>
        ) : isLoading ? (
          <div className="space-y-3" aria-label="Loading">
            <div className="h-8 animate-pulse rounded bg-slate-100" />
            <div className="h-8 animate-pulse rounded bg-slate-100" />
            <div className="h-8 animate-pulse rounded bg-slate-100" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-600">No records currently require attention.</p>
        ) : definition.detail ? (
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {definition.columns.map((column) => (
              <div key={column.key} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{column.label}</dt>
                <dd className="mt-1 text-sm font-medium capitalize text-slate-900">{formatValue(readValue(rows[0], column.key))}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  {definition.columns.map((column) => <th key={column.key} className="pb-2 pr-4 font-medium">{column.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={String(row.id ?? index)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    {definition.columns.map((column) => {
                      const value = readValue(row, column.key)
                      const isStatus = column.key.toLowerCase().includes('status') || column.key.toLowerCase().includes('priority')
                      return (
                        <td key={column.key} className="py-3 pr-4 capitalize text-slate-700">
                          {isStatus ? <StatusPill status={formatValue(value)} /> : formatValue(value)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function definePage(definition: ResourcePageDefinition) {
  return function DefinedResourcePage() {
    return <ResourcePage definition={definition} />
  }
}

const operationalColumns: Column[] = [
  { key: 'reference', label: 'Reference' },
  { key: 'title', label: 'Operational record' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
]

const detailColumns: Column[] = [
  { key: 'reference', label: 'Reference' },
  { key: 'name', label: 'Name' },
  { key: 'title', label: 'Record' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created' },
  { key: 'updatedAt', label: 'Updated' },
]

export const DutiesPage = definePage({ title: 'Driver duties', description: 'Manage sign-on, working time, breaks, availability and duty completion.', endpoint: '/duties', columns: [{ key: 'reference', label: 'Duty' }, { key: 'dutyDate', label: 'Date' }, { key: 'startTime', label: 'Start' }, { key: 'status', label: 'Status' }], rule: 'Duty boundaries and working-time controls govern whether Dispatch may assign more work.' })
export const DutyDetailPage = definePage({ title: 'Duty detail', description: 'The complete working period, assigned work, breaks and audit evidence.', endpoint: '/duties/:dutyId', columns: detailColumns, detail: true })
export const AvailabilityPage = definePage({ title: 'Resource availability', description: 'Driver and vehicle capacity considered together before assignment.', endpoint: '/availability', columns: [{ key: 'resourceType', label: 'Type' }, { key: 'firstName', label: 'First name' }, { key: 'lastName', label: 'Last name' }, { key: 'registrationNumber', label: 'Registration' }, { key: 'status', label: 'Position' }], rule: 'Availability combines duty, qualifications, compliance, capacity, depot and live commitments.' })
export const CancellationsPage = definePage({ title: 'Cancellations', description: 'Cancellation reason, notice, passenger impact and financial treatment.', endpoint: '/cancellations', columns: [{ key: 'reference', label: 'Booking' }, { key: 'cancelledAt', label: 'Cancelled' }, { key: 'cancellation.reason', label: 'Reason' }, { key: 'status', label: 'Status' }] })
export const HandoverPage = definePage({ title: 'Shift handover', description: 'Unresolved operational work passed between controllers, depots and shifts.', endpoint: '/handover', columns: operationalColumns, rule: 'A handover is complete only when its receiving owner explicitly accepts it.' })
export const StaffEditPage = definePage({ title: 'Edit staff member', description: 'Employment, role, depot access and operational contact details.', endpoint: '/staff/:id', columns: detailColumns, detail: true })

export const WorkOrdersPage = definePage({ title: 'Maintenance work orders', description: 'Workshop work, service impact, evidence and return-to-service dependencies.', endpoint: '/maintenance/work-orders', columns: operationalColumns, rule: 'Repair completion never returns a vehicle to service without verification and approval.' })
export const WorkOrderDetailPage = definePage({ title: 'Work order detail', description: 'Work, parts, supplier, evidence, cost and approval history.', endpoint: '/maintenance/work-orders/:workOrderId', columns: detailColumns, detail: true })
export const ComplianceDashboardPage = definePage({ title: 'Compliance dashboard', description: 'The current legal and operational eligibility position across people and fleet.', endpoint: '/compliance', columns: [{ key: 'clearPercent', label: 'Operationally clear' }, { key: 'expiring', label: 'Expiring' }, { key: 'blocked', label: 'Blocked' }], detail: true })
export const ComplianceExpiriesPage = definePage({ title: 'Compliance expiries', description: 'Documents approaching expiry with service impact and named ownership.', endpoint: '/compliance/expiries', objectKey: 'items', columns: [{ key: 'entityType', label: 'Type' }, { key: 'entityLabel', label: 'Resource' }, { key: 'documentType', label: 'Document' }, { key: 'daysUntilExpiry', label: 'Days' }, { key: 'status', label: 'Status' }] })
export const SafeguardingPage = definePage({ title: 'Safeguarding', description: 'Restricted passenger-safety concerns and the controls required for transport.', endpoint: '/safeguarding', columns: operationalColumns, rule: 'Sensitive information is permissioned, audited and limited to transport delivery needs.' })
export const RiskAssessmentsPage = definePage({ title: 'Risk assessments', description: 'Operational risks, active controls, review dates and accountable owners.', endpoint: '/risk-assessments', columns: [{ key: 'reference', label: 'Assessment' }, { key: 'title', label: 'Scope' }, { key: 'riskLevel', label: 'Risk' }, { key: 'reviewDueAt', label: 'Review' }, { key: 'status', label: 'Status' }] })
export const InspectionDetailPage = definePage({ title: 'Inspection detail', description: 'Inspection scope, findings, evidence and linked corrective actions.', endpoint: '/inspections/:inspectionId', columns: detailColumns, detail: true })
export const CorrectiveActionsPage = definePage({ title: 'Corrective actions', description: 'Actions arising from incidents, inspections, defects and failed controls.', endpoint: '/corrective-actions', columns: operationalColumns, rule: 'Closure requires evidence and independent verification.' })
export const PassengerDetailPage = definePage({ title: 'Passenger detail', description: 'Mobility needs, safeguarding controls, approved contacts and transport history.', endpoint: '/passengers/:passengerId', columns: detailColumns, detail: true })
export const CustomerDetailPage = definePage({ title: 'Customer detail', description: 'Customer contacts, passengers, bookings, contracts and service performance.', endpoint: '/customers/:customerId', columns: detailColumns, detail: true })
export const SchoolDetailPage = definePage({ title: 'School or organisation detail', description: 'Site contacts, access controls, arrival windows and active services.', endpoint: '/schools/:schoolId', columns: detailColumns, detail: true })
export const ContractDetailPage = definePage({ title: 'Contract detail', description: 'Service rules, pricing, performance, documents and change history.', endpoint: '/contracts/:contractId', columns: detailColumns, detail: true })
export const ConversationDetailPage = definePage({ title: 'Conversation detail', description: 'Operational messages, recipients, delivery evidence and linked work.', endpoint: '/messages/:conversationId', columns: detailColumns, detail: true })
export const CommunicationDeliveryPage = definePage({ title: 'Communication delivery', description: 'Proof that instructions were sent, delivered, opened or acknowledged.', endpoint: '/communication/delivery', columns: [{ key: 'subject', label: 'Message' }, { key: 'channel', label: 'Channel' }, { key: 'deliveryState', label: 'Delivery' }, { key: 'acknowledgedAt', label: 'Acknowledged' }, { key: 'createdAt', label: 'Sent' }] })

export const RolesPage = definePage({ title: 'Roles and permissions', description: 'Company roles, permission families, scope and assigned users.', endpoint: '/settings/roles', columns: [{ key: 'roleKey', label: 'Role' }, { key: 'label', label: 'Name' }, { key: 'userCount', label: 'Users' }, { key: 'status', label: 'Status' }] })
export const InvitationsPage = definePage({ title: 'User invitations', description: 'Sent, accepted, expired and cancelled Command invitations.', endpoint: '/settings/invitations', columns: [{ key: 'email', label: 'Email' }, { key: 'roleKey', label: 'Role' }, { key: 'invitedAt', label: 'Invited' }, { key: 'status', label: 'Status' }] })
export const SecuritySettingsPage = definePage({ title: 'Security settings', description: 'Authentication, MFA, sessions and privileged access controls.', endpoint: '/company', columns: [{ key: 'settings.security.mfaRequired', label: 'MFA required' }, { key: 'settings.security.sessionHours', label: 'Session hours' }, { key: 'status', label: 'Company status' }], detail: true })
export const NotificationSettingsPage = definePage({ title: 'Notification settings', description: 'Company escalation channels, timing and acknowledgement requirements.', endpoint: '/company', columns: [{ key: 'settings.notifications', label: 'Notification policy' }, { key: 'status', label: 'Company status' }], detail: true })
export const GlobalSearchPage = definePage({ title: 'Global search', description: 'Find vehicles, people, bookings and operational records across the active company.', endpoint: '/search', objectKey: 'results', columns: [{ key: 'type', label: 'Type' }, { key: 'label', label: 'Result' }, { key: 'status', label: 'Status' }, { key: 'href', label: 'Location' }] })
export const ProfilePage = definePage({ title: 'My profile', description: 'Personal details, preferences and account security.', endpoint: '/profile', columns: [{ key: 'firstName', label: 'First name' }, { key: 'lastName', label: 'Last name' }, { key: 'email', label: 'Email' }, { key: 'platformRole', label: 'Role' }], detail: true })
export const ImportsPage = definePage({ title: 'Import centre', description: 'Validated, reviewable imports with row-level failure evidence.', endpoint: '/imports', columns: [{ key: 'fileName', label: 'File' }, { key: 'resourceType', label: 'Data' }, { key: 'rowCount', label: 'Rows' }, { key: 'errorCount', label: 'Errors' }, { key: 'status', label: 'Status' }] })
export const ExportsPage = definePage({ title: 'Export centre', description: 'Permission-controlled exports with retention and download auditing.', endpoint: '/exports', columns: [{ key: 'fileName', label: 'File' }, { key: 'resourceType', label: 'Dataset' }, { key: 'rowCount', label: 'Rows' }, { key: 'createdAt', label: 'Created' }, { key: 'status', label: 'Status' }] })
