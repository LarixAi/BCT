export const SCHEDULE_GRID_START_HOUR = 6
export const SCHEDULE_GRID_END_HOUR = 21
export const SCHEDULE_HOUR_HEIGHT_PX = 52

export function parseHHmm(time: string | null | undefined): number {
  if (!time) return SCHEDULE_GRID_START_HOUR * 60
  if (/^\d{4}-\d{2}-\d{2}T/.test(time) || /[zZ]|[+-]\d{2}:\d{2}$/.test(time)) {
    const parsed = new Date(time)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getHours() * 60 + parsed.getMinutes()
    }
  }
  const match = time.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return SCHEDULE_GRID_START_HOUR * 60
  return Number(match[1]) * 60 + Number(match[2])
}

/** Alias used by calendar views when sorting and positioning duties. */
export const parseScheduleTime = parseHHmm

export function formatScheduleTimeRange(
  start: string | null | undefined,
  end?: string | null | undefined,
): string {
  const formatOne = (value: string | null | undefined) => {
    if (!value) return '—'
    if (/^\d{4}-\d{2}-\d{2}T/.test(value) || /[zZ]|[+-]\d{2}:\d{2}$/.test(value)) {
      const parsed = new Date(value)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      }
    }
    const match = value.match(/^(\d{1,2}):(\d{2})/)
    return match ? `${match[1]!.padStart(2, '0')}:${match[2]}` : value
  }
  if (start && end) return `${formatOne(start)} – ${formatOne(end)}`
  return formatOne(start)
}

export function durationMinutes(start: string | null, end: string | null | undefined): number {
  const s = parseHHmm(start)
  const e = parseHHmm(end ?? start)
  return Math.max(45, e - s)
}

export function gridTopPx(start: string | null): number {
  const offset = parseHHmm(start) - SCHEDULE_GRID_START_HOUR * 60
  return Math.max(0, (offset / 60) * SCHEDULE_HOUR_HEIGHT_PX)
}

export function gridHeightPx(start: string | null, end: string | null | undefined): number {
  return (durationMinutes(start, end) / 60) * SCHEDULE_HOUR_HEIGHT_PX
}

export function hourLabels(): string[] {
  const labels: string[] = []
  for (let h = SCHEDULE_GRID_START_HOUR; h <= SCHEDULE_GRID_END_HOUR; h++) {
    labels.push(`${String(h).padStart(2, '0')}:00`)
  }
  return labels
}

export function hourLabel12(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

export function dutyColumnSpan(
  start: string | null,
  end: string | null | undefined,
): { startCol: number; span: number } {
  const startMin = parseHHmm(start)
  const endMin = parseHHmm(end ?? start) + 15
  const gridStart = SCHEDULE_GRID_START_HOUR * 60
  const startCol = Math.max(1, Math.floor((startMin - gridStart) / 60) + 1)
  const endCol = Math.min(
    SCHEDULE_GRID_END_HOUR - SCHEDULE_GRID_START_HOUR + 1,
    Math.ceil((endMin - gridStart) / 60),
  )
  return { startCol, span: Math.max(1, endCol - startCol + 1) }
}

export function shiftIsoDate(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function initialsForName(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}
