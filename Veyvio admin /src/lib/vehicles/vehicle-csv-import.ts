/** Vehicle fleet CSV import — parse, validate, template (browser + Node). */

export const VEHICLE_IMPORT_TEMPLATE_CSV = `registration_number,fleet_number,make,model,model_year,vehicle_category,fuel_type,seating_capacity,wheelchair_capacity,home_depot_name,ownership_type,colour,mot_expiry,insurance_expiry,tax_expiry,tachograph_calibration_expiry,pmi_due_at
YX25 VEY,F-301,Ford,Transit Custom,2025,minibus,diesel,16,0,Primary depot Wembley,owned,White,2027-08-01,2027-01-15,2027-03-31,2027-06-01,2026-09-15
`

export type VehicleImportParsedRow = {
  rowNumber: number
  registrationNumber: string
  fleetNumber: string | null
  make: string
  model: string
  modelYear: number | null
  vehicleCategory: string
  fuelType: string
  seatingCapacity: number
  wheelchairCapacity: number
  homeDepotName: string | null
  homeDepotId: string | null
  ownershipType: string
  colour: string | null
  motExpiry: string | null
  insuranceExpiry: string | null
  taxExpiry: string | null
  tachographCalibrationExpiry: string | null
  pmiDueAt: string | null
}

export type VehicleImportRowError = {
  rowNumber: number
  registrationNumber: string
  reason: string
}

export type VehicleImportParseResult = {
  rowsRead: number
  valid: VehicleImportParsedRow[]
  errors: VehicleImportRowError[]
}

const CATEGORIES = new Set(['minibus', 'accessible', 'coach', 'car', 'mpv', 'van'])
const FUELS = new Set(['diesel', 'petrol', 'electric', 'hybrid', 'hydrogen'])
const OWNERSHIP = new Set(['owned', 'leased', 'hired', 'customer_supplied'])

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]!).map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, ''),
  )
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? '').trim()
    })
    return row
  })
}

function pick(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (value) return value
  }
  return ''
}

function dateOrNull(raw: string): string | null {
  if (!raw) return null
  const value = raw.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  if (Number.isNaN(new Date(`${value}T12:00:00`).getTime())) return null
  return value
}

function normaliseRegistration(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().toUpperCase()
}

function normaliseCategory(raw: string): string {
  const v = raw.trim().toLowerCase().replace(/\s+/g, '_')
  if (CATEGORIES.has(v)) return v
  if (v.includes('access') || v.includes('wheel')) return 'accessible'
  if (v.includes('coach') || v.includes('bus')) return 'coach'
  if (v.includes('mpv') || v.includes('people')) return 'mpv'
  if (v.includes('car') || v.includes('saloon')) return 'car'
  if (v.includes('van')) return 'van'
  return 'minibus'
}

function normaliseFuel(raw: string): string {
  const v = raw.trim().toLowerCase()
  return FUELS.has(v) ? v : 'diesel'
}

function normaliseOwnership(raw: string): string {
  const v = raw.trim().toLowerCase().replace(/\s+/g, '_')
  if (OWNERSHIP.has(v)) return v
  if (v.includes('lease')) return 'leased'
  if (v.includes('hire')) return 'hired'
  if (v.includes('customer')) return 'customer_supplied'
  return 'owned'
}

export function parseVehicleImportCsv(text: string): VehicleImportParseResult {
  const rawRows = parseCsv(text)
  const valid: VehicleImportParsedRow[] = []
  const errors: VehicleImportRowError[] = []
  const seen = new Set<string>()

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2 // header is row 1
    const registrationNumber = normaliseRegistration(
      pick(row, ['registration_number', 'registration', 'reg', 'vrm']),
    )
    const make = pick(row, ['make', 'manufacturer'])
    const model = pick(row, ['model'])

    if (!registrationNumber) {
      errors.push({ rowNumber, registrationNumber: '—', reason: 'Registration is required' })
      return
    }
    if (!make || !model) {
      errors.push({
        rowNumber,
        registrationNumber,
        reason: 'Make and model are required',
      })
      return
    }
    if (seen.has(registrationNumber)) {
      errors.push({
        rowNumber,
        registrationNumber,
        reason: 'Duplicate registration in this file',
      })
      return
    }
    seen.add(registrationNumber)

    const yearRaw = pick(row, ['model_year', 'year'])
    const modelYear = yearRaw ? Number(yearRaw) : null
    if (yearRaw && (!Number.isFinite(modelYear) || modelYear! < 1980 || modelYear! > 2100)) {
      errors.push({ rowNumber, registrationNumber, reason: `Invalid model_year: ${yearRaw}` })
      return
    }

    const seatsRaw = pick(row, ['seating_capacity', 'seats', 'seat_capacity']) || '0'
    const seatingCapacity = Number(seatsRaw)
    if (!Number.isFinite(seatingCapacity) || seatingCapacity < 0) {
      errors.push({ rowNumber, registrationNumber, reason: `Invalid seating_capacity: ${seatsRaw}` })
      return
    }

    const wcRaw = pick(row, ['wheelchair_capacity', 'wheelchair']) || '0'
    const wheelchairCapacity = Number(wcRaw)
    if (!Number.isFinite(wheelchairCapacity) || wheelchairCapacity < 0) {
      errors.push({ rowNumber, registrationNumber, reason: `Invalid wheelchair_capacity: ${wcRaw}` })
      return
    }

    const dateFields: Array<[string, string[]]> = [
      ['mot_expiry', ['mot_expiry', 'mot']],
      ['insurance_expiry', ['insurance_expiry', 'insurance']],
      ['tax_expiry', ['tax_expiry', 'tax']],
      ['tachograph_calibration_expiry', ['tachograph_calibration_expiry', 'tacho_expiry', 'tachograph']],
      ['pmi_due_at', ['pmi_due_at', 'pmi_due', 'next_pmi']],
    ]
    const dates: Record<string, string | null> = {}
    for (const [key, aliases] of dateFields) {
      const raw = pick(row, aliases)
      if (!raw) {
        dates[key] = null
        continue
      }
      const parsed = dateOrNull(raw)
      if (!parsed) {
        errors.push({
          rowNumber,
          registrationNumber,
          reason: `Invalid date for ${key} (use YYYY-MM-DD): ${raw}`,
        })
        return
      }
      dates[key] = parsed
    }

    valid.push({
      rowNumber,
      registrationNumber,
      fleetNumber: pick(row, ['fleet_number', 'fleet', 'fleet_no']) || null,
      make,
      model,
      modelYear: modelYear && Number.isFinite(modelYear) ? modelYear : null,
      vehicleCategory: normaliseCategory(pick(row, ['vehicle_category', 'category', 'type']) || 'minibus'),
      fuelType: normaliseFuel(pick(row, ['fuel_type', 'fuel']) || 'diesel'),
      seatingCapacity,
      wheelchairCapacity,
      homeDepotName: pick(row, ['home_depot_name', 'depot_name', 'depot', 'home_depot']) || null,
      homeDepotId: pick(row, ['home_depot_id', 'depot_id']) || null,
      ownershipType: normaliseOwnership(pick(row, ['ownership_type', 'ownership']) || 'owned'),
      colour: pick(row, ['colour', 'color']) || null,
      motExpiry: dates.mot_expiry ?? null,
      insuranceExpiry: dates.insurance_expiry ?? null,
      taxExpiry: dates.tax_expiry ?? null,
      tachographCalibrationExpiry: dates.tachograph_calibration_expiry ?? null,
      pmiDueAt: dates.pmi_due_at ?? null,
    })
  })

  return { rowsRead: rawRows.length, valid, errors }
}

export function downloadVehicleImportTemplate() {
  const blob = new Blob([VEHICLE_IMPORT_TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'veyvio-vehicle-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function vehiclesToExportCsv(
  vehicles: Array<{
    registrationNumber: string
    fleetNumber?: string | null
    make: string
    model: string
    modelYear?: number | null
    vehicleCategory: string
    fuelType: string
    seatingCapacity: number
    wheelchairCapacity: number
    homeDepotName?: string | null
    ownershipType: string
    colour?: string | null
    motExpiry?: string | null
    insuranceExpiry?: string | null
    taxExpiry?: string | null
    tachographCalibrationExpiry?: string | null
    nextMaintenanceDate?: string | null
  }>,
): string {
  const header =
    'registration_number,fleet_number,make,model,model_year,vehicle_category,fuel_type,seating_capacity,wheelchair_capacity,home_depot_name,ownership_type,colour,mot_expiry,insurance_expiry,tax_expiry,tachograph_calibration_expiry,pmi_due_at'
  const lines = vehicles.map((v) =>
    [
      v.registrationNumber,
      v.fleetNumber ?? '',
      v.make,
      v.model,
      v.modelYear ?? '',
      v.vehicleCategory,
      v.fuelType,
      v.seatingCapacity,
      v.wheelchairCapacity,
      v.homeDepotName ?? '',
      v.ownershipType,
      v.colour ?? '',
      v.motExpiry ?? '',
      v.insuranceExpiry ?? '',
      v.taxExpiry ?? '',
      v.tachographCalibrationExpiry ?? '',
      v.nextMaintenanceDate ?? '',
    ]
      .map((cell) => {
        const raw = String(cell)
        return raw.includes(',') || raw.includes('"') ? `"${raw.replace(/"/g, '""')}"` : raw
      })
      .join(','),
  )
  return [header, ...lines].join('\n') + '\n'
}
