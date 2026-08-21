/** UK (en-GB) date/time display for Veyvio Yard — Europe/London. */

export const UK_LOCALE = 'en-GB'
export const UK_TIME_ZONE = 'Europe/London'

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

export function formatUkDate(
  value: string | number | Date | null | undefined,
  style: 'short' | 'medium' | 'long' = 'medium',
  fallback = '—',
): string {
  const d = parseUkInstant(value)
  if (!d) return fallback
  const opts: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: UK_TIME_ZONE }
      : style === 'long'
        ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: UK_TIME_ZONE }
        : { day: 'numeric', month: 'short', year: 'numeric', timeZone: UK_TIME_ZONE }
  return d.toLocaleDateString(UK_LOCALE, opts)
}

export function formatUkDateTime(
  value: string | number | Date | null | undefined,
  fallback = '—',
): string {
  const d = parseUkInstant(value)
  if (!d) return fallback
  return d.toLocaleString(UK_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: UK_TIME_ZONE,
  })
}

export function formatUkTime(
  value: string | number | Date | null | undefined,
  fallback = '—',
): string {
  const d = parseUkInstant(value)
  if (!d) return fallback
  return d.toLocaleTimeString(UK_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: UK_TIME_ZONE,
  })
}
