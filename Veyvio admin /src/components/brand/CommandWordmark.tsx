import { cn } from '@/lib/cn'

type CommandWordmarkProps = {
  /** Dark midnight surfaces use inverted (white) VEYVIO */
  inverted?: boolean
  compact?: boolean
  align?: 'center' | 'left'
  className?: string
}

/** VEYVIO · COMMAND lockup — Command Blue product accent. */
export function CommandWordmark({
  inverted = false,
  compact = false,
  align = 'center',
  className,
}: CommandWordmarkProps) {
  return (
    <div className={cn('select-none', align === 'center' ? 'text-center' : 'text-left', className)}>
      <div
        className={cn(
          'font-extrabold tracking-tight',
          compact ? 'text-base leading-none' : 'text-3xl leading-none',
          inverted ? 'text-white' : 'text-midnight',
        )}
      >
        VEYVIO
      </div>
      <div
        className={cn(
          'mt-1 font-semibold uppercase text-command-500',
          compact ? 'text-[9px] tracking-[0.28em]' : 'text-xs tracking-[0.38em]',
        )}
      >
        Command
      </div>
    </div>
  )
}
