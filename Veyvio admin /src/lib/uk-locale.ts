/** UK (en-GB) date and time display — 24-hour clock, day-month-year dates. */

export const UK_LOCALE = 'en-GB'
export const UK_TIME_ZONE = 'Europe/London'

const UK_TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: UK_TIME_ZONE,
}
const UK_DATE_SHORT_OPTS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: UK_TIME_ZONE,
}
const UK_DATE_MEDIUM_OPTS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: UK_TIME_ZONE,
}
const UK_DATE_LONG_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: UK_TIME_ZONE,
}
const UK_DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  ...UK_DATE_SHORT_OPTS,
  ...UK_TIME_OPTS,
}

/** Parse ISO date-only (`YYYY-MM-DD`) as local noon so UK day does not shift. */
export function parseUkInstant(value: string | number | Date | null | undefined): Date | null {
  if (value == null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T12:00:00`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatUkTime(value: string | number | Date | null | undefined, fallback = '—'): string {
  const d = parseUkInstant(value)
  if (!d) return fallback
  return d.toLocaleTimeString(UK_LOCALE, UK_TIME_OPTS)
}

export function formatUkDate(
  value: string | number | Date | null | undefined,
  style: 'short' | 'medium' | 'long' = 'medium',
  fallback = '—',
): string {
  const d = parseUkInstant(value)
  if (!d) return fallback
  const opts =
    style === 'short' ? UK_DATE_SHORT_OPTS : style === 'long' ? UK_DATE_LONG_OPTS : UK_DATE_MEDIUM_OPTS
  return d.toLocaleDateString(UK_LOCALE, opts)
}

export function formatUkDateTime(
  value: string | number | Date | null | undefined,
  fallback = '—',
): string {
  const d = parseUkInstant(value)
  if (!d) return fallback
  return d.toLocaleString(UK_LOCALE, UK_DATETIME_OPTS)
}

export function formatUkDateWithWeekday(
  value: string | number | Date | null | undefined,
  fallback = '—',
): string {
  const d = parseUkInstant(value)
  if (!d) return fallback
  return d.toLocaleDateString(UK_LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: UK_TIME_ZONE,
  })
}
