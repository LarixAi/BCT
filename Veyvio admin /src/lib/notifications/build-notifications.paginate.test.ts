import { describe, expect, it } from 'vitest'
import { paginateNotifications } from './build-notifications'

describe('paginateNotifications', () => {
  const rows = Array.from({ length: 37 }, (_, i) => ({ id: String(i + 1) }))

  it('returns the first page of pageSize items', () => {
    const page = paginateNotifications(rows, 1, 15)
    expect(page.items).toHaveLength(15)
    expect(page.items[0]?.id).toBe('1')
    expect(page.total).toBe(37)
    expect(page.totalPages).toBe(3)
    expect(page.page).toBe(1)
  })

  it('returns the last partial page', () => {
    const page = paginateNotifications(rows, 3, 15)
    expect(page.items).toHaveLength(7)
    expect(page.items[0]?.id).toBe('31')
    expect(page.page).toBe(3)
  })

  it('clamps out-of-range pages', () => {
    expect(paginateNotifications(rows, 99, 15).page).toBe(3)
    expect(paginateNotifications(rows, 0, 15).page).toBe(1)
  })

  it('handles an empty list as a single empty page', () => {
    const page = paginateNotifications([], 2, 15)
    expect(page.items).toEqual([])
    expect(page.totalPages).toBe(1)
    expect(page.page).toBe(1)
  })
})
