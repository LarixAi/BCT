import type { CurrencyCode, Money } from './types'

const ZERO = 0

/** Parse a decimal money string into minor units. Rejects invalid input. */
export function parseMoneyToMinor(value: string | number, currency: CurrencyCode = 'GBP'): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Invalid money amount')
    return Math.round(value * 100)
  }
  const cleaned = value.trim().replace(/£/g, '').replace(/,/g, '')
  if (!cleaned || !/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Invalid money amount: ${value}`)
  }
  const negative = cleaned.startsWith('-')
  const [pounds, pence = '0'] = cleaned.replace('-', '').split('.')
  const minor = Number(pounds) * 100 + Number(pence.padEnd(2, '0').slice(0, 2))
  void currency
  return negative ? -minor : minor
}

export function money(amountMinor: number, currency: CurrencyCode = 'GBP'): Money {
  if (!Number.isInteger(amountMinor)) {
    throw new Error('Money must use integer minor units')
  }
  return { amountMinor, currency }
}

export function addMinor(...values: number[]): number {
  return values.reduce((sum, v) => sum + v, ZERO)
}

export function formatMoney(amountMinor: number, currency: CurrencyCode = 'GBP'): string {
  const abs = Math.abs(amountMinor)
  const sign = amountMinor < 0 ? '-' : ''
  const major = Math.floor(abs / 100)
  const minor = String(abs % 100).padStart(2, '0')
  if (currency === 'GBP') return `${sign}£${major.toLocaleString('en-GB')}.${minor}`
  return `${sign}${major}.${minor} ${currency}`
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`)
  }
}

export function sumMoney(items: Money[]): Money {
  if (!items.length) return money(0)
  const currency = items[0].currency
  for (const item of items) assertSameCurrency(item, money(0, currency))
  return money(
    items.reduce((s, i) => s + i.amountMinor, 0),
    currency,
  )
}
