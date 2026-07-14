import type { TachographRecord, VehicleProfile } from './types'

export function defaultTachograph(calibrationExpiry: string | null): TachographRecord | null {
  if (!calibrationExpiry) return null
  return {
    fitted: true,
    type: 'digital',
    make: 'VDO',
    model: 'DTCO 4.1',
    serialNumber: 'TCH-88421',
    calibrationDate: new Date(new Date(calibrationExpiry).getTime() - 730 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    nextCalibrationDate: calibrationExpiry,
    calibrationCentre: 'TachoCal Ltd',
    reviewRequired: false,
    reviewReason: null,
  }
}

export function triggerTachographReview(profile: VehicleProfile, reason: string): TachographRecord | null {
  if (!profile.tachograph) return null
  return {
    ...profile.tachograph,
    reviewRequired: true,
    reviewReason: reason,
  }
}

export function checkTachographReview(profile: VehicleProfile): boolean {
  return profile.tachograph?.reviewRequired === true
}
