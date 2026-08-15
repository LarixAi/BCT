import assert from 'node:assert/strict'
import { parseVehicleImportCsv, VEHICLE_IMPORT_TEMPLATE_CSV } from '../src/lib/vehicles/vehicle-csv-import.ts'

const parsed = parseVehicleImportCsv(VEHICLE_IMPORT_TEMPLATE_CSV)
assert.equal(parsed.rowsRead, 1)
assert.equal(parsed.errors.length, 0)
assert.equal(parsed.valid.length, 1)
assert.equal(parsed.valid[0]?.registrationNumber, 'YX25 VEY')
assert.equal(parsed.valid[0]?.vehicleCategory, 'minibus')
assert.equal(parsed.valid[0]?.motExpiry, '2027-08-01')

const bad = parseVehicleImportCsv(`registration_number,make,model
,Ford,Transit
AB12 CDE,,Transit
AB12 CDE,Ford,Transit
AB12 CDE,Ford,Transit
`)
assert.equal(bad.errors.length, 3)
assert.equal(bad.valid.length, 1)

console.log('vehicle-csv-import.unit: ok')
