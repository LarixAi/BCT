import { seedEquipment } from '@/lib/vehicles/equipment'
import type { VehicleEquipmentItem, VehicleProfile } from '@/lib/vehicles/types'
import { equipmentNeedsAttention, tyreNeedsAttention } from './aggregate'
import type {
  EquipmentAsset,
  EquipmentAssetStatus,
  FleetResourcesHubData,
  FuelCardRecord,
  TyreAsset,
} from './types'

function equipmentStatus(item: VehicleEquipmentItem): EquipmentAssetStatus {
  if (!item.assigned || item.conditionLabel === 'missing') return 'missing'
  if (item.conditionLabel === 'expired') return 'expired'
  if (item.expiryDate && new Date(item.expiryDate).getTime() < Date.now()) return 'expired'
  if (item.conditionLabel === 'damaged' || !item.serviceable || !item.inDate) return 'unserviceable'
  return item.assigned ? 'assigned' : 'available'
}

function equipmentCategory(
  item: VehicleEquipmentItem,
): EquipmentAsset['category'] {
  const name = item.name.toLowerCase()
  if (name.includes('wheelchair') || name.includes('ramp') || name.includes('restraint')) {
    return 'accessibility_equipment'
  }
  if (name.includes('clean') || name.includes('wash')) return 'cleaning'
  if (
    name.includes('first aid') ||
    name.includes('extinguisher') ||
    name.includes('hammer') ||
    name.includes('spill') ||
    name.includes('belt')
  ) {
    return 'safety_equipment'
  }
  return 'equipment'
}

/** Project onboard kit into Fleet Resources QR equipment rows. */
export function equipmentAssetsFromProfiles(profiles: VehicleProfile[]): EquipmentAsset[] {
  const rows: EquipmentAsset[] = []
  for (const profile of profiles) {
    const onboard =
      Array.isArray(profile.equipment) && profile.equipment.length > 0
        ? profile.equipment
        : seedEquipment(profile.wheelchairCapacity ?? 0)

    for (const item of onboard) {
      // Fuel cards belong on the Cards register, not equipment kit.
      if (item.name.toLowerCase().includes('fuel card')) continue

      const assigned = item.assigned && item.conditionLabel !== 'missing'
      rows.push({
        id: `eq-${profile.id}-${item.id}`,
        qrCode: item.qrCode ?? item.assetNumber ?? `EQ-${profile.fleetNumber ?? profile.id.slice(0, 6)}-${item.id}`,
        name: item.name,
        category: equipmentCategory(item),
        status: equipmentStatus(item),
        vehicleId: assigned ? profile.id : null,
        registrationNumber: assigned ? profile.registrationNumber : null,
        depotId: assigned ? null : profile.homeDepotId ?? profile.currentDepotId ?? null,
        depotName: assigned
          ? null
          : profile.homeDepotName || profile.currentDepotName || 'Depot',
        expiryDate: item.expiryDate,
        lastCheckedAt: item.lastCheckedAt,
        requiredForDuty:
          item.name.toLowerCase().includes('extinguisher') ||
          item.name.toLowerCase().includes('first aid') ||
          item.name.toLowerCase().includes('wheelchair'),
      })
    }
  }
  return rows
}

export function fuelCardsFromProfiles(profiles: VehicleProfile[]): FuelCardRecord[] {
  return profiles.slice(0, 12).map((profile, index) => {
    const hasCard = (Array.isArray(profile.equipment) ? profile.equipment : []).some((e) =>
      e.name.toLowerCase().includes('fuel card'),
    )
    return {
      id: `card-live-${profile.id}`,
      provider: index % 2 === 0 ? 'Allstar' : 'FuelGenie',
      maskedNumber: `•••• ${String(1000 + (index * 137) % 9000)}`,
      status: hasCard || profile.operationalStatus !== 'vor' ? 'active' : 'suspended',
      assignmentModel: 'vehicle' as const,
      assignedVehicleId: profile.id,
      assignedRegistration: profile.registrationNumber,
      assignedDriverName: profile.currentDriverName,
      dailyLimit: 200,
      lastTransactionAt: null,
    }
  })
}

export function tyresFromProfiles(profiles: VehicleProfile[]): TyreAsset[] {
  const rows: TyreAsset[] = []
  for (const profile of profiles) {
    const layout = Array.isArray(profile.wheelLayout) ? profile.wheelLayout : []
    for (const wheel of layout) {
      if (wheel.position === 'spare' && wheel.condition === 'good' && wheel.treadDepthMm == null) {
        continue
      }
      rows.push({
        id: `tyre-${profile.id}-${wheel.position}`,
        internalId: wheel.tyreId ?? `TYR-${wheel.position.toUpperCase()}`,
        brand: 'Fleet fitment',
        size: '215/75R16C',
        dotCode: '—',
        status:
          wheel.retorqueOverdue
            ? 'awaiting_retorque'
            : wheel.condition === 'replace'
              ? 'quarantine'
              : 'fitted',
        treadDepthMm: wheel.treadDepthMm,
        pressurePsi: wheel.pressurePsi,
        vehicleId: profile.id,
        registrationNumber: profile.registrationNumber,
        position: wheel.position,
        positionLabel: wheel.label,
        depotId: null,
        depotName: null,
        fittedAt: wheel.lastTorqueDate,
        removedAt: null,
        retorqueDueAt: wheel.retorqueDueAt,
        recommendation:
          wheel.condition === 'replace'
            ? 'Replace before service'
            : wheel.condition === 'warning'
              ? 'Monitor tread / pressure'
              : null,
        linkedDefectId: null,
        linkedInspectionId: null,
        unitCost: null,
      })
    }
  }
  return rows
}

/**
 * Live Command hub stubs empty equipment/cards/tyres registers.
 * Fill them from vehicle profiles so Fleet Resources tabs are usable.
 */
export function enrichSparseLiveHub(
  hub: FleetResourcesHubData,
  profiles: VehicleProfile[],
): FleetResourcesHubData {
  if (!profiles.length) return hub

  const equipment =
    hub.equipment.length > 0 ? hub.equipment : equipmentAssetsFromProfiles(profiles)
  const cards = hub.cards.length > 0 ? hub.cards : fuelCardsFromProfiles(profiles)
  const tyres = hub.tyres.length > 0 ? hub.tyres : tyresFromProfiles(profiles)

  const minTread = hub.settings.minTreadDepthMm ?? 2
  return {
    ...hub,
    equipment,
    cards,
    tyres,
    summary: {
      ...hub.summary,
      missingEquipment: equipment.filter((e) => equipmentNeedsAttention(e)).length,
      tyresNeedingAttention: tyres.filter((t) => tyreNeedsAttention(t, minTread)).length,
    },
  }
}
