import { resolveVehicleImage } from '@/lib/vehicles/vehicle-images'

export function VehicleThumb({
  registrationNumber,
  vehicleCategory,
  make,
  model,
  makeModel,
  modelYear,
  imageUrl,
  size = 'md',
  className = '',
}: {
  registrationNumber?: string | null
  vehicleCategory?: string | null
  make?: string | null
  model?: string | null
  makeModel?: string | null
  modelYear?: number | string | null
  imageUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const src = resolveVehicleImage({
    imageUrl,
    vehicleCategory,
    make,
    model,
    makeModel,
    modelYear,
    registrationNumber,
  })
  const sizeClass =
    size === 'lg'
      ? 'h-28 w-44 sm:h-32 sm:w-52'
      : size === 'sm'
        ? 'h-14 w-24'
        : 'h-20 w-32'

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-xl border border-border bg-white ${sizeClass} ${className}`}
      aria-hidden={registrationNumber ? undefined : true}
    >
      <img
        src={src}
        alt={registrationNumber ? `${registrationNumber} vehicle` : 'Fleet vehicle'}
        className="h-full w-full object-contain object-center p-1"
        loading="lazy"
      />
    </div>
  )
}
