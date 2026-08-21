import assert from 'node:assert/strict'
import {
  resolveVehicleImage,
  resolveVehicleModelYear,
  yearFromUkRegistration,
} from '../src/lib/vehicles/vehicle-images.ts'

assert.equal(yearFromUkRegistration('YX25 VEY'), 2025)
assert.equal(yearFromUkRegistration('AB75 CDE'), 2025)
assert.equal(yearFromUkRegistration('AB51 CDE'), 2001)
assert.equal(yearFromUkRegistration('invalid'), null)

assert.equal(resolveVehicleModelYear({ modelYear: 2016, registrationNumber: 'YX25 VEY' }), 2016)
assert.equal(resolveVehicleModelYear({ modelYear: null, registrationNumber: 'YX25 VEY' }), 2025)

assert.equal(
  resolveVehicleImage({
    make: 'Mercedes-Benz',
    model: 'Sprinter',
    modelYear: 2012,
  }),
  '/vehicles/sprinter-pre2019-studio.png',
)
assert.equal(
  resolveVehicleImage({
    make: 'Mercedes-Benz',
    model: 'Sprinter',
    modelYear: 2022,
  }),
  '/vehicles/sprinter-studio.png',
)
assert.equal(
  resolveVehicleImage({
    make: 'Ford',
    model: 'Transit Custom',
    registrationNumber: 'YX25 VEY',
  }),
  '/vehicles/minibus-studio.png',
)
assert.equal(
  resolveVehicleImage({
    make: 'Ford',
    model: 'Transit',
    modelYear: 2014,
  }),
  '/vehicles/sprinter-pre2019-studio.png',
)

console.log('vehicle-images.unit: ok')
