import type { VehicleCategory } from './types'

/** Studio-style fleet thumbnails until per-vehicle photos are uploaded. */
const IMAGES = {
  transitModern: '/vehicles/minibus-studio.png',
  sprinterModern: '/vehicles/sprinter-studio.png',
  sprinterClassic: '/vehicles/sprinter-pre2019-studio.png',
  coach: '/vehicles/coach-studio.png',
  mpv: '/vehicles/mpv-studio.png',
} as const

/** Generation cutovers used when choosing a studio thumbnail. */
const ERA = {
  sprinterModernFrom: 2019,
  transitModernFrom: 2018,
  coachModernFrom: 2015,
  mpvModernFrom: 2016,
} as const

function inferCategory(raw: string | null | undefined): VehicleCategory {
  const value = String(raw ?? '').toLowerCase()
  if (['minibus', 'accessible', 'coach', 'car', 'mpv', 'van'].includes(value)) {
    return value as VehicleCategory
  }
  if (value.includes('coach') || value.includes('bus')) return 'coach'
  if (value.includes('access') || value.includes('wheel')) return 'accessible'
  if (value.includes('mpv') || value.includes('people')) return 'mpv'
  if (value.includes('car') || value.includes('saloon')) return 'car'
  if (value.includes('van') || value.includes('transit') || value.includes('sprinter')) return 'van'
  return 'minibus'
}

/**
 * UK current-format plate age mark → calendar year.
 * Examples: AB25 CDE → 2025, AB75 CDE → 2025, AB51 CDE → 2001.
 */
export function yearFromUkRegistration(registration: string | null | undefined): number | null {
  const compact = String(registration ?? '')
    .replace(/\s+/g, '')
    .toUpperCase()
  const match = compact.match(/^[A-Z]{2}(\d{2})[A-Z]{3}$/)
  if (!match) return null
  const code = Number(match[1])
  if (!Number.isFinite(code)) return null
  if (code >= 1 && code <= 50) return 2000 + code
  if (code >= 51 && code <= 99) return 2000 + (code - 50)
  return null
}

export function resolveVehicleModelYear(input: {
  modelYear?: number | string | null
  registrationNumber?: string | null
}): number | null {
  if (input.modelYear != null && input.modelYear !== '') {
    const year = Number(input.modelYear)
    if (Number.isFinite(year) && year >= 1980 && year <= 2100) return year
  }
  return yearFromUkRegistration(input.registrationNumber)
}

function isClassic(year: number | null, modernFrom: number): boolean {
  return year != null && year < modernFrom
}

export function resolveVehicleImage(input: {
  imageUrl?: string | null
  vehicleCategory?: string | null
  make?: string | null
  model?: string | null
  makeModel?: string | null
  modelYear?: number | string | null
  registrationNumber?: string | null
}): string {
  if (input.imageUrl) return input.imageUrl

  const year = resolveVehicleModelYear(input)
  const makeModel = `${input.make ?? ''} ${input.model ?? ''} ${input.makeModel ?? ''}`.toLowerCase()
  const category = inferCategory(input.vehicleCategory)

  if (makeModel.includes('sprinter') || makeModel.includes('mercedes')) {
    return isClassic(year, ERA.sprinterModernFrom) ? IMAGES.sprinterClassic : IMAGES.sprinterModern
  }
  if (makeModel.includes('coach') || makeModel.includes('irizar') || makeModel.includes('volvo b')) {
    return isClassic(year, ERA.coachModernFrom) ? IMAGES.sprinterClassic : IMAGES.coach
  }
  if (makeModel.includes('transit') || makeModel.includes('ford')) {
    // Older Transits use the classic high-roof van studio until a dedicated gen is added.
    return isClassic(year, ERA.transitModernFrom) ? IMAGES.sprinterClassic : IMAGES.transitModern
  }
  if (makeModel.includes('mpv') || category === 'mpv' || category === 'car') {
    return isClassic(year, ERA.mpvModernFrom) ? IMAGES.sprinterClassic : IMAGES.mpv
  }
  if (category === 'coach') {
    return isClassic(year, ERA.coachModernFrom) ? IMAGES.sprinterClassic : IMAGES.coach
  }
  if (category === 'accessible') {
    return isClassic(year, ERA.sprinterModernFrom) ? IMAGES.sprinterClassic : IMAGES.sprinterModern
  }

  // Default minibus / van fleet look — classic pre-cutover, modern Transit after.
  return isClassic(year, ERA.transitModernFrom) ? IMAGES.sprinterClassic : IMAGES.transitModern
}
