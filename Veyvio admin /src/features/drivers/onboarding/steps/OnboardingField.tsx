import { cn } from '@/lib/cn'

export function OnboardingField({
  label,
  value,
  onChange,
  type = 'text',
  required,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  className?: string
}) {
  return (
    <label className={cn('block text-sm', className)}>
      <span className="text-ink-soft">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-ink"
      />
    </label>
  )
}
