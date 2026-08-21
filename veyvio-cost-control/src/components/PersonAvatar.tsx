/** Deterministic initials avatar for wage-cost members (no photo uploads in Phase 2). */
export function PersonAvatar({
  name,
  hue,
  size = 'md',
}: {
  name: string
  hue: number
  size?: 'sm' | 'md' | 'lg'
}) {
  const initials = initialsFrom(name)
  const h = ((hue % 360) + 360) % 360
  return (
    <span
      className={`person-avatar size-${size}`}
      style={{
        background: `hsl(${h} 42% 36%)`,
      }}
      aria-hidden
    >
      {initials}
    </span>
  )
}

function initialsFrom(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}
