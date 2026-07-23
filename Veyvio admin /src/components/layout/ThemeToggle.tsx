import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme, type ThemePreference } from '@/lib/theme-context'
import { cn } from '@/lib/cn'

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light theme', icon: Sun },
  { value: 'system', label: 'Match system theme', icon: Monitor },
  { value: 'dark', label: 'Dark theme', icon: Moon },
]

/** Light / system / dark toggle. Persists the explicit choice; "system" follows the OS. */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn('inline-flex items-center gap-0.5 rounded-md border border-border bg-page p-0.5', className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = preference === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={label}
            title={label}
            onClick={() => setPreference(value)}
            className={cn(
              'grid h-6 w-6 place-items-center rounded transition',
              active ? 'bg-command-600 text-white' : 'text-muted hover:bg-surface hover:text-ink',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        )
      })}
    </div>
  )
}
