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

/** Light auth hero — matches Driver sign-in typography with Command blue accent. */
export function CommandAuthHero({ className }: { className?: string }) {
  return (
    <div className={cn('text-center', className)}>
      <p className="m-0">
        <span className="text-[1.65rem] font-bold leading-none tracking-[-0.04em] text-[#0B0E14]">
          Veyvio
        </span>
        <span className="ml-2 text-sm font-semibold tracking-[0.04em] text-command-500">Command</span>
      </p>
      <p className="mt-2 text-[0.8125rem] tracking-[0.02em] text-[#5B8C9B]">Move smarter. Operate safer.</p>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Planning, dispatch, monitoring and administration for transport operations.
      </p>
    </div>
  )
}
