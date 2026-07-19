import { describe, expect, it } from 'vitest'
import { applyExceptionOverlays, buildExceptionsInbox, normalizeCategory } from './build-exceptions-inbox'
import { countBySeverity, filterExceptions } from './exception-filters'
import { buildExceptionKpis } from './exception-kpis'
import { suggestedActionsFor } from './suggested-actions'
import type { OperationalException } from '@/lib/types'

function row(partial: Partial<OperationalException> & Pick<OperationalException, 'id'>): OperationalException {
  return {
    severity: 'high',
    title: 'Test',
    category: 'driver',
    relatedRecord: 'R',
    relatedHref: '/',
    depot: 'Wembley',
    raisedAt: '08:00',
    ageMinutes: 10,
    slaMinutesRemaining: 5,
    owner: null,
    status: 'new',
    lastUpdate: '08:00',
    ...partial,
  }
}

describe('normalizeCategory', () => {
  it('maps legacy trip/passenger categories', () => {
    expect(normalizeCategory('trip')).toBe('journey')
    expect(normalizeCategory('passenger')).toBe('customer')
    expect(normalizeCategory('yard')).toBe('yard')
  })
})

describe('buildExceptionsInbox', () => {
  it('composes catalog and live sources, critical first, SLA breach before peers', () => {
    const inbox = buildExceptionsInbox({
      includeCatalog: false,
      driverExceptions: [
        row({ id: 'a', severity: 'medium', slaMinutesRemaining: 10 }),
        row({ id: 'b', severity: 'critical', slaMinutesRemaining: 5 }),
        row({ id: 'c', severity: 'critical', slaMinutesRemaining: -2, ageMinutes: 40 }),
      ],
    })

    expect(inbox.map((e) => e.id)).toEqual(['c', 'b', 'a'])
  })

  it('includes catalog by default', () => {
    const inbox = buildExceptionsInbox({ includeCatalog: true })
    expect(inbox.some((e) => e.id === 'CAT-JNY-NOT-COLLECTED')).toBe(true)
    expect(inbox.some((e) => e.category === 'yard')).toBe(true)
  })
})

describe('filterExceptions + KPIs', () => {
  const rows = [
    row({ id: '1', severity: 'critical', status: 'new', owner: null, escalated: true, slaMinutesRemaining: -1 }),
    row({ id: '2', severity: 'high', status: 'assigned', owner: 'Sarah', category: 'vehicle' }),
    row({ id: '3', severity: 'low', status: 'resolved', ageMinutes: 20 }),
  ]

  it('filters smart chips', () => {
    expect(filterExceptions(rows, { smart: 'sla_breached', module: 'all' })).toHaveLength(1)
    expect(filterExceptions(rows, { smart: 'assigned_to_me', module: 'all', currentUserName: 'Sarah' })).toHaveLength(1)
    expect(filterExceptions(rows, { smart: 'vehicle', module: 'all' })).toHaveLength(1)
  })

  it('counts severity and KPIs', () => {
    expect(countBySeverity(rows).critical).toBe(1)
    const kpis = buildExceptionKpis(rows)
    expect(kpis.criticalOpen).toBe(1)
    expect(kpis.awaitingAssignment).toBe(1)
    expect(kpis.escalated).toBe(1)
    expect(kpis.resolvedToday).toBe(1)
  })
})

describe('suggested actions + overlays', () => {
  it('returns type-specific suggestions for VOR and licence', () => {
    expect(suggestedActionsFor(row({ id: 'v', typeCode: 'vehicle_vor', category: 'vehicle' }))[0]?.title).toMatch(
      /replacement/i,
    )
    expect(suggestedActionsFor(row({ id: 'l', typeCode: 'driver_licence_expired', category: 'compliance' })).length).toBeGreaterThan(
      1,
    )
  })

  it('applies soft overlays', () => {
    const [updated] = applyExceptionOverlays([row({ id: 'x', status: 'new', owner: null })], {
      x: { status: 'investigating', owner: 'You', escalated: true },
    })
    expect(updated.status).toBe('investigating')
    expect(updated.owner).toBe('You')
    expect(updated.escalated).toBe(true)
  })
})
