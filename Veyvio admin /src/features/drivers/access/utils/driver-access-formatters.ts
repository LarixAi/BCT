export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function mutationErrorMessage(error: unknown, fallback = 'Action failed') {
  return error instanceof Error ? error.message : fallback
}
