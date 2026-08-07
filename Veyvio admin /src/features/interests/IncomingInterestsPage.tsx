import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'
import {
  INTEREST_STATUS_LABELS,
  activityLabel,
  type InterestDetail,
  type InterestListItem,
  type InterestStatus,
  type InterestSummary,
} from '@/lib/interests/types'
import {
  displayValue,
  isJourneyInterest,
  resolveJourneyRequest,
  type JourneyRequestFields,
} from '@/lib/interests/journey-request'
import { InterestJourneyMap } from '@/features/interests/InterestJourneyMap'

const EMPTY_SUMMARY: InterestSummary = {
  newToday: 0,
  awaitingReview: 0,
  assigned: 0,
  contacted: 0,
  qualified: 0,
  converted: 0,
  closed: 0,
  spam: 0,
}

const STATUS_OPTIONS = Object.entries(INTEREST_STATUS_LABELS) as Array<[InterestStatus, string]>

function formatWhen(value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  const shown = displayValue(value)
  if (!shown || shown === '—') return null
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className={`mt-0.5 text-sm text-ink${shown.includes('\n') ? ' whitespace-pre-wrap' : ''}`}>
        {shown}
      </dd>
    </div>
  )
}

function StatusPill({ status }: { status: InterestStatus }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-ink">
      {INTEREST_STATUS_LABELS[status] ?? status}
    </span>
  )
}

function JourneyTripCard({
  journey,
  fallbackMessage,
  wavRequired,
}: {
  journey: JourneyRequestFields
  fallbackMessage: string | null
  wavRequired: boolean
}) {
  const pickup = displayValue(journey.pickup)
  const destination = displayValue(journey.destination)
  const hasRoute = Boolean(pickup || destination)

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">Journey request</h2>
          <p className="text-sm text-ink-soft">Not a confirmed booking — review before scheduling.</p>
        </div>
        {wavRequired ? (
          <span className="rounded-md bg-attention/15 px-2 py-1 text-xs font-semibold text-attention">
            WAV required
          </span>
        ) : null}
      </div>

      {hasRoute ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
          <div className="rounded-lg border border-border bg-surface-muted/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Pickup</p>
            <p className="mt-1 text-sm font-medium text-ink">{pickup ?? '—'}</p>
            {displayValue(journey.pickupCoords) ? (
              <p className="mt-1 text-xs tabular-nums text-muted">{journey.pickupCoords}</p>
            ) : null}
          </div>
          <div className="hidden items-center justify-center text-ink-soft sm:flex" aria-hidden>
            →
          </div>
          <div className="rounded-lg border border-border bg-surface-muted/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Destination</p>
            <p className="mt-1 text-sm font-medium text-ink">{destination ?? '—'}</p>
            {displayValue(journey.destinationCoords) ? (
              <p className="mt-1 text-xs tabular-nums text-muted">{journey.destinationCoords}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <InterestJourneyMap journey={journey} />

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Travel date" value={journey.travelDate} />
        <Field label="Preferred pickup time" value={journey.preferredPickupTime} />
        <Field label="Return time" value={journey.returnTime} />
        <Field label="Time flexibility" value={journey.timeFlexibility} />
        <Field label="Journey type" value={journey.journeyType} />
        <Field label="Service" value={journey.service} />
        <Field label="Passengers" value={journey.passengers} />
        <Field label="Membership" value={journey.membershipStatus} />
        <Field label="Passenger / membership no." value={journey.passengerNumber} />
        <Field label="Accessibility" value={journey.accessibility} />
        <Field label="Wheelchair travel" value={journey.wheelchairTravel} />
        <Field label="Emergency contact" value={journey.emergencyContact} />
      </dl>

      {displayValue(journey.notes) ? (
        <div className="mt-4 rounded-lg border border-border/80 bg-surface-muted/40 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Passenger notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{journey.notes}</p>
        </div>
      ) : null}

      {!hasRoute && fallbackMessage ? (
        <div className="mt-4 rounded-lg border border-dashed border-border px-3 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Submitted details</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{fallbackMessage}</p>
        </div>
      ) : null}
    </section>
  )
}

function ContactCard({ data }: { data: InterestDetail }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-base font-semibold text-ink">Contact</h2>
      <dl className="mt-3 grid gap-3">
        <Field label="Name" value={data.contactName} />
        <Field label="Phone" value={data.contactPhone} />
        <Field label="Email" value={data.contactEmail} />
        <Field label="Preferred contact" value={data.preferredContactMethod} />
        <Field label="Postcode" value={data.postcode} />
        <Field label="Borough" value={data.borough} />
      </dl>
    </section>
  )
}

function RecordMetaCard({ data }: { data: InterestDetail }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-base font-semibold text-ink">Record</h2>
      <dl className="mt-3 grid gap-3">
        <Field label="Source" value={data.sourceLabel ?? data.source} />
        <Field label="API integration" value={data.integrationLabel} />
        <Field label="Request id" value={data.requestId} />
        <Field label="External id" value={data.externalSubmissionId} />
        <Field
          label="Privacy"
          value={
            data.privacyAccepted
              ? `Accepted${data.privacyNoticeVersion ? ` · ${data.privacyNoticeVersion}` : ''}`
              : 'Missing'
          }
        />
        <Field label="Consent at" value={formatWhen(data.consentAcceptedAt)} />
        <Field label="Marketing" value={data.marketingAccepted ? 'Accepted' : 'Not accepted'} />
        <Field label="Owner" value={data.assignedToName ?? 'Unassigned'} />
      </dl>
    </section>
  )
}

export function IncomingInterestsPage() {
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [accessibility, setAccessibility] = useState('')
  const [marketing, setMarketing] = useState('')
  const [q, setQ] = useState('')

  const params = useMemo(() => {
    // Only include set filters so the empty key matches the sidebar badge cache.
    const next: import('@/lib/interests/types').InterestListParams = {}
    if (status) next.status = status
    if (source) next.source = source
    if (accessibility) next.accessibility = accessibility
    if (marketing) next.marketing = marketing
    const search = q.trim()
    if (search) next.q = search
    return next
  }, [status, source, accessibility, marketing, q])

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: tKey(['interests', params]),
    queryFn: () => api.getInterestSubmissions(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const summary = data?.summary ?? EMPTY_SUMMARY
  const items = data?.items ?? []
  const sources = [...new Set(items.map((item) => item.source).filter(Boolean))].sort()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Incoming Interests</h1>
          <p className="text-sm text-ink-soft">
            Register-interest submissions from partner websites. Review, assign, contact, convert, or close —
            every change is audited.
          </p>
        </div>
        {isFetching && !isLoading ? (
          <p className="text-xs text-muted">Refreshing…</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <SummaryCard label="New today" value={summary.newToday} />
        <SummaryCard label="Awaiting review" value={summary.awaitingReview} />
        <SummaryCard label="Assigned" value={summary.assigned} />
        <SummaryCard label="Contacted" value={summary.contacted} />
        <SummaryCard label="Qualified" value={summary.qualified} />
        <SummaryCard label="Converted" value={summary.converted} />
        <SummaryCard label="Closed" value={summary.closed} />
        <SummaryCard label="Suspected spam" value={summary.spam} />
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, reference, postcode"
          className="min-w-[14rem] flex-1 rounded-lg border border-border px-3 py-1.5 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
        >
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={accessibility}
          onChange={(e) => setAccessibility(e.target.value)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
        >
          <option value="">Accessibility: any</option>
          <option value="true">WAV required</option>
          <option value="false">WAV not required</option>
        </select>
        <select
          value={marketing}
          onChange={(e) => setMarketing(e.target.value)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
        >
          <option value="">Marketing: any</option>
          <option value="true">Marketing accepted</option>
          <option value="false">Marketing declined</option>
        </select>
      </div>

      {error ? (
        <p className="rounded-lg border border-critical/30 bg-critical/5 px-3 py-2 text-sm text-critical">
          {error instanceof Error ? error.message : 'Could not load interest submissions.'}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted/60 text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-3 py-2 font-medium">Reference</th>
              <th className="px-3 py-2 font-medium">Received</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Postcode</th>
              <th className="px-3 py-2 font-medium">Service</th>
              <th className="px-3 py-2 font-medium">Access</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Assigned</th>
              <th className="px-3 py-2 font-medium">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-ink-soft">
                  Loading interest register…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-ink-soft">
                  No interest submissions yet. Partner websites submit via the Register Interest API.
                </td>
              </tr>
            ) : (
              items.map((item) => <InterestRow key={item.id} item={item} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InterestRow({ item }: { item: InterestListItem }) {
  const journey = isJourneyInterest(item)
  return (
    <tr className="border-b border-border/70 hover:bg-surface-muted/40">
      <td className="px-3 py-2 font-medium tabular-nums">
        <Link className="text-command-700 hover:underline" to={`/interests/${item.id}`}>
          {item.reference}
        </Link>
        {journey ? (
          <span className="ml-2 rounded bg-command-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-command-700">
            Journey
          </span>
        ) : null}
        {item.possibleDuplicate ? (
          <span className="ml-2 rounded bg-attention/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-attention">
            Possible duplicate
          </span>
        ) : null}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-ink-soft">{formatWhen(item.createdAt)}</td>
      <td className="px-3 py-2">{item.contactName}</td>
      <td className="px-3 py-2 tabular-nums">{item.postcode ?? '—'}</td>
      <td className="px-3 py-2">{item.service ?? '—'}</td>
      <td className="px-3 py-2">
        {item.wheelchairAccessibleVehicleRequired ? 'WAV required' : '—'}
      </td>
      <td className="px-3 py-2">{item.sourceLabel ?? item.source}</td>
      <td className="px-3 py-2">{INTEREST_STATUS_LABELS[item.status] ?? item.status}</td>
      <td className="px-3 py-2">{item.assignedToName ?? '—'}</td>
      <td className="px-3 py-2 whitespace-nowrap text-ink-soft">{formatWhen(item.lastActivityAt)}</td>
    </tr>
  )
}

export function InterestDetailPage() {
  const { interestId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<InterestStatus | ''>('')
  const [note, setNote] = useState('')
  const [assignTo, setAssignTo] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: tKey(['interests', interestId]),
    queryFn: () => api.getInterestSubmission(interestId),
    enabled: Boolean(interestId),
  })

  const usersQuery = useQuery({
    queryKey: tKey(['company-users']),
    queryFn: () => api.getUsers(),
  })

  const patchMutation = useMutation({
    mutationFn: () =>
      api.patchInterestSubmission(interestId, {
        status: status || undefined,
        assignedToUserId: assignTo === '' ? undefined : assignTo === '__clear__' ? null : assignTo,
        note: note.trim() || undefined,
      }),
    onSuccess: async () => {
      setNote('')
      setStatus('')
      setAssignTo('')
      setFormError(null)
      await queryClient.invalidateQueries({ queryKey: tKey(['interests']) })
      await queryClient.invalidateQueries({ queryKey: tKey(['interests', interestId]) })
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Could not update this interest.')
    },
  })

  const acceptMutation = useMutation({
    mutationFn: () => api.acceptInterestSubmission(interestId),
    onSuccess: async (result) => {
      setFormError(null)
      setActionMessage(
        result.alreadyConverted
          ? 'Already accepted — opening Jobs.'
          : `Accepted as job ${result.tripReference ?? ''}. Opening Jobs…`,
      )
      await queryClient.invalidateQueries({ queryKey: tKey(['interests']) })
      await queryClient.invalidateQueries({ queryKey: tKey(['operational-trips']) })
      const path =
        result.jobsPath ||
        (result.serviceDate ? `/jobs?serviceDate=${encodeURIComponent(result.serviceDate)}` : '/jobs')
      navigate(path)
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Could not accept this journey as a job.')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: () =>
      api.rejectInterestSubmission(interestId, {
        reason: rejectReason.trim() || undefined,
        notifyCustomer: true,
      }),
    onSuccess: async (result) => {
      setFormError(null)
      setRejectReason('')
      setActionMessage(
        result.customerNotified
          ? 'Request rejected. Customer has been emailed.'
          : result.notifyError
            ? `Request rejected. Customer email was not sent (${result.notifyError}).`
            : 'Request rejected.',
      )
      await queryClient.invalidateQueries({ queryKey: tKey(['interests']) })
      await queryClient.invalidateQueries({ queryKey: tKey(['interests', interestId]) })
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Could not reject this request.')
    },
  })

  if (isLoading) {
    return <p className="text-sm text-ink-soft">Loading interest record…</p>
  }
  if (error || !data) {
    return (
      <p className="rounded-lg border border-critical/30 bg-critical/5 px-3 py-2 text-sm text-critical">
        {error instanceof Error ? error.message : 'Interest submission not found.'}
      </p>
    )
  }

  const users = (Array.isArray(usersQuery.data) ? usersQuery.data : []) as Array<{
    user?: { id: string; firstName?: string; lastName?: string; email?: string }
  }>
  const journey = resolveJourneyRequest(data)
  const journeyMode = Boolean(journey) || isJourneyInterest(data)
  const canDecide =
    data.status !== 'converted' && data.status !== 'closed' && data.status !== 'spam'
  const canAcceptJob = journeyMode && Boolean(journey?.pickup || journey?.destination || data.message)
  const busy = acceptMutation.isPending || rejectMutation.isPending || patchMutation.isPending

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/interests" className="text-sm text-command-700 hover:underline">
            ← Incoming Interests
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tabular-nums text-ink">{data.reference}</h1>
            <StatusPill status={data.status} />
            {journeyMode ? (
              <span className="rounded-full bg-command-50 px-2.5 py-0.5 text-xs font-semibold text-command-700">
                Journey request
              </span>
            ) : (
              <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
                Register interest
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Received {formatWhen(data.createdAt)}
            {data.sourceLabel || data.source ? ` · ${data.sourceLabel ?? data.source}` : ''}
          </p>
        </div>
        {data.possibleDuplicate ? (
          <span className="rounded-lg bg-attention/15 px-3 py-1 text-sm font-medium text-attention">
            Possible duplicate within 24 hours
          </span>
        ) : null}
      </div>

      {canDecide ? (
        <section className="rounded-xl border-2 border-command-300 bg-command-50 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-[16rem] flex-1">
              <h2 className="text-base font-semibold text-ink">Decision</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {canAcceptJob
                  ? 'Accept job creates a trackable job on the Jobs page for the travel date. Reject closes this request and emails the customer when an email is on file.'
                  : 'Reject closes this request and emails the customer when an email is on file. Accept job needs a journey request with pickup and destination.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !canAcceptJob}
                title={
                  canAcceptJob
                    ? 'Create a job and open the Jobs page'
                    : 'Only journey requests with pickup/destination can be accepted as jobs'
                }
                onClick={() => acceptMutation.mutate()}
                className="rounded-lg bg-command-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-command-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {acceptMutation.isPending ? 'Accepting…' : 'Accept job'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => rejectMutation.mutate()}
                className="rounded-lg border border-critical/40 bg-white px-4 py-2.5 text-sm font-semibold text-critical hover:bg-critical/5 disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={2}
            placeholder="Optional reject reason (sent to the customer)"
            className="mt-3 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
          />
        </section>
      ) : null}

      {data.status === 'converted' && data.convertedTripId ? (
        <section className="rounded-xl border border-ready/30 bg-ready/5 px-4 py-3 text-sm text-ink">
          Accepted as a job.{' '}
          <Link
            className="font-medium text-command-700 hover:underline"
            to={`/jobs?serviceDate=${encodeURIComponent(
              journey?.travelDate ?? new Date().toISOString().slice(0, 10),
            )}`}
          >
            Open Jobs for this travel date →
          </Link>
        </section>
      ) : null}

      {actionMessage ? (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">{actionMessage}</p>
      ) : null}
      {formError ? (
        <p className="rounded-lg border border-critical/30 bg-critical/5 px-3 py-2 text-sm text-critical">
          {formError}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)]">
        <div className="space-y-4">
          {journeyMode && journey ? (
            <JourneyTripCard
              journey={journey}
              fallbackMessage={data.message}
              wavRequired={data.wheelchairAccessibleVehicleRequired}
            />
          ) : (
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-base font-semibold text-ink">Transport need</h2>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Service" value={data.service} />
                <Field
                  label="Journey types"
                  value={data.journeyTypes?.length ? data.journeyTypes.join(', ') : null}
                />
                <Field label="Passengers" value={data.passengerCount} />
                <Field
                  label="Accessibility"
                  value={
                    data.wheelchairAccessibleVehicleRequired
                      ? 'Wheelchair-accessible vehicle required'
                      : null
                  }
                />
                <div className="sm:col-span-2">
                  <Field label="Message" value={data.message} />
                </div>
              </dl>
              {!data.service && !data.message && !(data.journeyTypes?.length) ? (
                <p className="mt-2 text-sm text-ink-soft">No transport-need details were included.</p>
              ) : null}
            </section>
          )}

          <section className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Update workflow</h2>
              <p className="text-sm text-ink-soft">Assign an owner, change status, or leave a staff note.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InterestStatus | '')}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="">Keep current status</option>
                {STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="">Keep current owner</option>
                <option value="__clear__">Unassign</option>
                {users.map((membership) => {
                  const user = membership.user
                  if (!user?.id) return null
                  return (
                    <option key={user.id} value={user.id}>
                      {[user.firstName, user.lastName].filter(Boolean).join(' ') ||
                        user.email ||
                        user.id}
                    </option>
                  )
                })}
              </select>
              <button
                type="button"
                disabled={busy}
                onClick={() => patchMutation.mutate()}
                className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
              >
                {patchMutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Add a contact note or internal comment"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </section>
        </div>

        <div className="space-y-4">
          <ContactCard data={data} />
          <RecordMetaCard data={data} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <h2 className="text-base font-semibold text-ink">Staff notes</h2>
          {(data.staffNotes ?? []).length === 0 ? (
            <p className="text-sm text-ink-soft">No notes yet.</p>
          ) : (
            <ul className="space-y-3">
              {(data.staffNotes ?? []).map((n) => (
                <li key={n.id} className="rounded-lg border border-border/70 px-3 py-2 text-sm">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {n.createdByName} · {formatWhen(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <h2 className="text-base font-semibold text-ink">Activity</h2>
          {(data.activity ?? []).length === 0 ? (
            <p className="text-sm text-ink-soft">No activity recorded yet.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {(data.activity ?? []).map((event) => (
                <li key={event.id} className="flex gap-3 border-b border-border/50 pb-2 last:border-0">
                  <span className="w-32 shrink-0 tabular-nums text-xs text-ink-soft">
                    {formatWhen(event.occurredAt)}
                  </span>
                  <span>
                    <span className="font-medium">{activityLabel(event.action)}</span>
                    {event.afterSnapshot?.status ? (
                      <span className="text-ink-soft">
                        {' '}
                        →{' '}
                        {INTEREST_STATUS_LABELS[String(event.afterSnapshot.status) as InterestStatus] ??
                          String(event.afterSnapshot.status)}
                      </span>
                    ) : null}
                    {event.afterSnapshot?.assignedToName ? (
                      <span className="text-ink-soft"> · {String(event.afterSnapshot.assignedToName)}</span>
                    ) : null}
                    {event.afterSnapshot?.body ? (
                      <span className="block text-ink-soft">{String(event.afterSnapshot.body)}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

