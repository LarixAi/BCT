import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, MoreVertical, User } from 'lucide-react'
import { formatDate } from '@/components/ui/status'
import {
  ACCOUNT_STATUS_LABELS,
  COMPLIANCE_STATUS_LABELS,
  ELIGIBILITY_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  OPERATIONAL_STATUS_LABELS,
} from '@/lib/drivers/constants'
import type { DriverProfile } from '@/lib/drivers/types'
import { countDocumentsPendingAdminReview } from '@/lib/drivers/compliance'
import { cn } from '@/lib/cn'

export type DriverLeaveSummary = {
  remainingLabel: string
  pendingCount: number
  yearLabel: string
}

export function DriverProfileHeader({
  driver,
  actions,
  primaryAction,
  todayDuties = 0,
  leaveSummary,
  onNavigateTab,
}: {
  driver: DriverProfile
  actions?: React.ReactNode
  primaryAction?: React.ReactNode
  todayDuties?: number
  leaveSummary?: DriverLeaveSummary | null
  onNavigateTab?: (tab: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const displayName = driver.preferredName
    ? `${driver.preferredName} (${driver.firstName} ${driver.lastName})`
    : `${driver.firstName} ${driver.lastName}`

  const documentsPending = countDocumentsPendingAdminReview(driver.documents)
  const activeRestrictions = driver.restrictions.filter((r) => r.status === 'active').length
  const accountActive = driver.account?.accountStatus === 'active'

  const eligible =
    driver.eligibility.operationalEligibility === 'eligible' ||
    driver.eligibility.operationalEligibility === 'eligible_with_warning' ||
    driver.eligibility.operationalEligibility === 'emergency_override_active'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DriverBackLink />
        <h1 className="text-xl font-semibold text-ink">Driver details</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <section className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-command-50 text-command-600">
                <User className="h-4 w-4" aria-hidden />
              </div>
              <h2 className="text-sm font-semibold text-ink">Driver information</h2>
            </div>
            {actions ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface-muted hover:text-ink"
                  aria-label="More actions"
                  aria-expanded={menuOpen}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpen ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-10 cursor-default"
                      aria-label="Close menu"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 z-20 mt-1 flex min-w-[220px] flex-col gap-1 rounded-xl border border-border bg-surface p-1.5">
                      <div
                        className="flex flex-col gap-1 [&_a]:block [&_a]:rounded-lg [&_a]:px-3 [&_a]:py-2 [&_a]:text-sm [&_a]:font-medium [&_a]:text-ink [&_a]:hover:bg-surface-muted [&_button]:rounded-lg [&_button]:px-3 [&_button]:py-2 [&_button]:text-left [&_button]:text-sm [&_button]:font-medium [&_button]:text-ink [&_button]:hover:bg-surface-muted"
                        onClick={() => setMenuOpen(false)}
                      >
                        {actions}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted text-xl font-semibold text-ink-soft">
                {driver.firstName[0]}
                {driver.lastName[0]}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-semibold text-ink">{displayName}</h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 text-sm font-medium',
                      accountActive ? 'text-ready' : 'text-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        accountActive ? 'bg-ready' : 'bg-muted',
                      )}
                      aria-hidden
                    />
                    {ACCOUNT_STATUS_LABELS[driver.account?.accountStatus ?? 'draft']}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Tag>{EMPLOYMENT_TYPE_LABELS[driver.employmentType]}</Tag>
                  {driver.depotName ? <Tag>{driver.depotName}</Tag> : null}
                  {driver.employeeNumber ? <Tag>{driver.employeeNumber}</Tag> : null}
                </div>
              </div>
            </div>

            {primaryAction ? <div className="mt-5">{primaryAction}</div> : null}

            <div className="mt-6 border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-ink">Basic information</h4>
              <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <InfoField label="Driver ID" value={driver.reference} />
                <InfoField label="Created" value={formatDate(driver.createdAt)} />
                <InfoField
                  label="Operational status"
                  value={OPERATIONAL_STATUS_LABELS[driver.operationalStatus]}
                />
                <InfoField label="Compliance" value={COMPLIANCE_STATUS_LABELS[driver.complianceStatus]} />
                <InfoField label="Email" value={driver.email ?? '—'} />
                <InfoField label="Phone" value={driver.phone ?? '—'} />
                <InfoField label="Date of birth" value={formatDate(driver.dateOfBirth)} />
                <InfoField label="Emergency contact" value={driver.emergencyContact ?? '—'} />
                <InfoField
                  label="Home address"
                  value={driver.homeAddress ?? '—'}
                  className="sm:col-span-2"
                />
              </dl>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <HighlightCard
            driver={driver}
            eligible={eligible}
            leaveSummary={leaveSummary}
            onNavigateTab={onNavigateTab}
          />

          <div className="grid grid-cols-3 gap-3">
            <SummaryStatCard
              value={String(todayDuties)}
              label="Today's duties"
              detail={todayDuties === 1 ? 'Published today' : 'Published today'}
              onClick={onNavigateTab ? () => onNavigateTab('Schedule') : undefined}
            />
            <SummaryStatCard
              value={String(documentsPending)}
              label="Docs awaiting review"
              detail={documentsPending > 0 ? 'Compliance action' : 'Nothing waiting'}
              onClick={onNavigateTab ? () => onNavigateTab('Compliance') : undefined}
              highlight={documentsPending > 0}
            />
            <SummaryStatCard
              value={String(activeRestrictions)}
              label="Active restrictions"
              detail={activeRestrictions > 0 ? 'May block duty' : 'None active'}
              onClick={onNavigateTab ? () => onNavigateTab('Eligibility') : undefined}
              highlight={activeRestrictions > 0}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}

function HighlightCard({
  driver,
  eligible,
  leaveSummary,
  onNavigateTab,
}: {
  driver: DriverProfile
  eligible: boolean
  leaveSummary?: DriverLeaveSummary | null
  onNavigateTab?: (tab: string) => void
}) {
  if (!eligible) {
    return (
      <section className="rounded-xl border border-attention/30 bg-surface p-5">
        <span className="inline-flex rounded-md bg-surface-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Eligibility blocker
        </span>
        <p className="mt-3 text-lg font-semibold text-ink">Not eligible for duty</p>
        <p className="mt-1 text-sm text-ink-soft">
          {ELIGIBILITY_LABELS[driver.operationalEligibility]} · {driver.eligibility.summary}
        </p>
        {onNavigateTab ? (
          <button
            type="button"
            onClick={() => onNavigateTab('Compliance')}
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-command-600 px-4 py-2.5 text-sm font-semibold text-command-700 hover:bg-command-50"
          >
            Review compliance
          </button>
        ) : null}
      </section>
    )
  }

  const pendingNote =
    leaveSummary && leaveSummary.pendingCount > 0
      ? `${leaveSummary.pendingCount} request${leaveSummary.pendingCount === 1 ? '' : 's'} pending approval`
      : 'No leave pending approval'

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <span className="inline-flex rounded-md bg-surface-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Holiday balance
      </span>
      <p className="mt-3 text-lg font-semibold text-ink">
        {leaveSummary ? `${leaveSummary.remainingLabel} remaining` : 'Leave balance unavailable'}
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        {leaveSummary ? `${leaveSummary.yearLabel} · ${pendingNote}` : pendingNote}
      </p>
      {driver.nextDutyReference ? (
        <p className="mt-3 text-sm text-ink-soft">
          <span className="font-medium text-ink">Next duty:</span> {driver.nextDutyReference}
          {driver.nextDutyTime ? ` · ${driver.nextDutyTime}` : ''}
        </p>
      ) : null}
      {onNavigateTab ? (
        <button
          type="button"
          onClick={() => onNavigateTab('Time off')}
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-command-600 px-4 py-2.5 text-sm font-semibold text-command-700 hover:bg-command-50"
        >
          Open time off
        </button>
      ) : null}
    </section>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-ink-soft">
      {children}
    </span>
  )
}

function InfoField({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  )
}

function SummaryStatCard({
  value,
  label,
  detail,
  onClick,
  highlight = false,
}: {
  value: string
  label: string
  detail: string
  onClick?: () => void
  highlight?: boolean
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative rounded-xl border bg-surface p-3 text-left',
        highlight ? 'border-attention/30' : 'border-border',
        onClick && 'transition hover:border-command-300',
      )}
    >
      {onClick ? (
        <ArrowUpRight className="absolute right-2 top-2 h-3.5 w-3.5 text-muted/60" aria-hidden />
      ) : null}
      <p
        className={cn(
          'text-2xl font-bold tabular-nums',
          highlight ? 'text-attention' : 'text-command-600',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold leading-tight text-ink">{label}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-muted">{detail}</p>
    </Wrapper>
  )
}

export function DriverBackLink() {
  return (
    <Link
      to="/drivers"
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface-muted hover:text-ink"
      aria-label="Back to drivers"
    >
      <ArrowLeft className="h-4 w-4" />
    </Link>
  )
}
