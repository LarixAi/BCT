import { equipmentReady } from './equipment'
import type { OnboardingStageId, VehicleProfile } from './types'

export interface OnboardingCheckItem {
  id: string
  label: string
  met: boolean
  href?: string
}

const REQUIRED_DOCS = ['mot', 'insurance', 'tax'] as const
const REQUIRED_EQUIPMENT = ['fire extinguisher', 'first aid', 'fuel card']
const BASELINE_ZONE_MIN = 3

function docVerified(profile: VehicleProfile, type: string): boolean {
  const doc = profile.documents.find((d) => d.requirementType === type)
  return doc?.verificationStatus === 'verified'
}

export function getOnboardingStageChecks(
  profile: VehicleProfile,
  stageId: OnboardingStageId,
  duplicateRegistrations: string[] = [],
): OnboardingCheckItem[] {
  switch (stageId) {
    case 'created':
      return [{ id: 'created', label: 'Vehicle record created', met: true }]
    case 'identity_verified':
      return [
        { id: 'reg', label: 'Registration number recorded', met: Boolean(profile.registrationNumber?.trim()) },
        { id: 'make', label: 'Make and model recorded', met: Boolean(profile.make?.trim() && profile.model?.trim()) },
        { id: 'vin', label: 'VIN or fleet number recorded', met: Boolean(profile.vin?.trim() || profile.fleetNumber?.trim()) },
        {
          id: 'dup',
          label: 'No duplicate registration in fleet',
          met: !duplicateRegistrations.includes(profile.registrationNumber.toUpperCase()),
        },
      ]
    case 'specification_complete':
      return [
        { id: 'seats', label: 'Seating capacity configured', met: profile.seatingCapacity > 0 },
        { id: 'category', label: 'Vehicle category set', met: Boolean(profile.vehicleCategory) },
        { id: 'fuel', label: 'Fuel type configured', met: Boolean(profile.fuelType) },
        {
          id: 'wc',
          label: 'Wheelchair capacity recorded',
          met: profile.vehicleCategory !== 'accessible' || profile.wheelchairCapacity > 0,
        },
      ]
    case 'documents_complete':
      return REQUIRED_DOCS.map((type) => ({
        id: type,
        label: `${type.toUpperCase()} verified`,
        met: docVerified(profile, type),
        href: 'documents',
      }))
    case 'baseline_inspection': {
      const baseline = profile.damageRecords.filter((r) => r.baseline)
      const withPhoto = baseline.filter((r) => r.imageDataUrl || r.imageFileName)
      return [
        {
          id: 'baseline_count',
          label: `At least ${BASELINE_ZONE_MIN} baseline damage zones recorded`,
          met: baseline.length >= BASELINE_ZONE_MIN,
          href: 'damage',
        },
        {
          id: 'baseline_photo',
          label: 'At least one baseline photo attached',
          met: withPhoto.length > 0,
          href: 'damage',
        },
      ]
    }
    case 'equipment_inventory': {
      const missing = equipmentReady(profile.equipment, REQUIRED_EQUIPMENT)
      return [
        ...REQUIRED_EQUIPMENT.map((name) => ({
          id: name,
          label: `${name} assigned and serviceable`,
          met: !missing.includes(name),
          href: 'equipment',
        })),
        {
          id: 'all_assigned',
          label: 'All fixed equipment assigned',
          met: profile.equipment.filter((e) => e.category === 'fixed').every((e) => e.assigned && e.serviceable),
          href: 'equipment',
        },
      ]
    }
    case 'initial_inspection': {
      const passed = profile.checks.some(
        (c) => ['pmi', 'yard_release'].includes(c.checkType) && c.result === 'pass',
      )
      return [
        {
          id: 'inspection',
          label: 'Initial safety inspection recorded (PMI or yard release, pass)',
          met: passed,
          href: 'checks',
        },
        {
          id: 'defects',
          label: 'No open defects',
          met: profile.openDefectCount === 0,
        },
      ]
    }
    case 'release_review':
      return [
        {
          id: 'release',
          label: 'Release engine allows allocation',
          met: profile.release.canAllocate,
        },
        ...profile.release.failures.map((f, i) => ({
          id: `failure-${i}`,
          label: f.message,
          met: false,
        })),
      ]
    case 'approved':
      return [{ id: 'approved', label: 'Approved for service', met: profile.onboarding.approvedAt != null }]
    default:
      return []
  }
}

export function validateOnboardingStage(
  profile: VehicleProfile,
  stageId: OnboardingStageId,
  duplicateRegistrations: string[] = [],
): string[] {
  return getOnboardingStageChecks(profile, stageId, duplicateRegistrations)
    .filter((c) => !c.met)
    .map((c) => c.label)
}

export function onboardingStageReady(
  profile: VehicleProfile,
  stageId: OnboardingStageId,
  duplicateRegistrations: string[] = [],
): boolean {
  return validateOnboardingStage(profile, stageId, duplicateRegistrations).length === 0
}
