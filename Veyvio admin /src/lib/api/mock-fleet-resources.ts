import { buildFleetResourcesHub } from '@/lib/fleet-resources/aggregate'
import { flagFuelAnomalies } from '@/lib/fleet-resources/fuel-rules'
import { createFleetResourcesSeed } from '@/lib/fleet-resources/seed'
import type {
  EquipmentAsset,
  FleetResourcesHubData,
  FleetResourcesSettings,
  ResourceCategory,
  ResourceTransaction,
  ResourceTransactionType,
  StockTransferRow,
  TyreAsset,
} from '@/lib/fleet-resources/types'
import { mockVehiclesApi } from './mock-vehicles'

const seed = createFleetResourcesSeed()
let transactions = [...seed.transactions]
let stock = [...seed.stock]
let cards = [...seed.cards]
let purchaseRequests = [...seed.purchaseRequests]
let tyres = [...seed.tyres]
let equipment = [...seed.equipment]
let stockTransfers = [...seed.stockTransfers]
let settings: FleetResourcesSettings = { ...seed.settings }
let seq = 200

function hub(): FleetResourcesHubData {
  return buildFleetResourcesHub({
    catalogue: seed.catalogue,
    transactions,
    stock,
    cards,
    purchaseRequests,
    settings,
    profiles: mockVehiclesApi.list(),
    tyres,
    equipment,
    stockTransfers,
    integrations: seed.integrations,
    budgets: seed.budgets,
    wholeLife: seed.wholeLife,
  })
}

function appendTx(partial: Omit<ResourceTransaction, 'id' | 'createdAt'> & { id?: string }): ResourceTransaction {
  const row: ResourceTransaction = {
    ...partial,
    id: partial.id ?? `rtx-new-${seq++}`,
    createdAt: new Date().toISOString(),
  }
  transactions = [row, ...transactions]
  return row
}

export const mockFleetResourcesApi = {
  hub,

  recordTransaction(input: {
    resourceCategory: ResourceCategory
    resourceItemId: string
    resourceName: string
    transactionType: ResourceTransactionType
    quantity: number
    unit: string
    unitPrice?: number | null
    vehicleId?: string | null
    driverName?: string | null
    supplierName?: string | null
    odometer?: number | null
    receiptFileName?: string | null
    fuelCardId?: string | null
    notes?: string | null
    depotName?: string | null
    workOrderId?: string | null
    actorName: string
  }): ResourceTransaction {
    const profile = input.vehicleId ? mockVehiclesApi.get(input.vehicleId) : null
    const gross =
      input.unitPrice != null ? Math.round(input.quantity * input.unitPrice * 100) / 100 : null
    const anomalyFlags = flagFuelAnomalies(
      {
        quantity: input.quantity,
        unit: input.unit,
        resourceCategory: input.resourceCategory,
        odometer: input.odometer ?? null,
        receiptFileName: input.receiptFileName ?? null,
        grossAmount: gross,
      },
      {
        maxLitres: settings.maxLitresPerTransaction,
        requireReceiptAbove: settings.requireReceiptAbove,
        requireOdometer: settings.requireOdometer,
      },
    )

    const row = appendTx({
      depotId: profile?.currentDepotId ?? profile?.homeDepotId ?? 'depot-wembley',
      depotName: input.depotName ?? profile?.currentDepotName ?? profile?.homeDepotName ?? 'Wembley Depot',
      resourceCategory: input.resourceCategory,
      resourceItemId: input.resourceItemId,
      resourceName: input.resourceName,
      transactionType: input.transactionType,
      quantity: input.quantity,
      unit: input.unit,
      unitPrice: input.unitPrice ?? null,
      vatAmount: gross != null ? Math.round(gross * 0.2 * 100) / 100 : null,
      grossAmount: gross,
      vehicleId: input.vehicleId ?? null,
      registrationNumber: profile?.registrationNumber ?? null,
      driverId: null,
      driverName: input.driverName ?? null,
      staffName: input.actorName,
      supplierName: input.supplierName ?? null,
      workOrderId: input.workOrderId ?? null,
      defectId: null,
      odometer: input.odometer ?? null,
      fuelLevelBefore: null,
      fuelLevelAfter: null,
      fullTank: null,
      receiptFileName: input.receiptFileName ?? null,
      fuelCardId: input.fuelCardId ?? null,
      status: anomalyFlags.length > 0 ? 'queried' : 'submitted',
      anomalyFlags,
      notes: input.notes ?? null,
      createdBy: input.actorName,
      approvedBy: null,
    })

    if (
      (input.transactionType === 'issue' || input.transactionType === 'dispense') &&
      input.resourceItemId
    ) {
      stock = stock.map((s) => {
        if (s.resourceItemId !== input.resourceItemId) return s
        const available = Math.max(0, s.available - input.quantity)
        const status =
          available <= 0 ? 'out' : available < s.minimum ? (available < s.minimum * 0.5 ? 'reorder' : 'low') : 'normal'
        return { ...s, available, status }
      })
    }
    if (input.transactionType === 'purchase' && input.resourceItemId) {
      stock = stock.map((s) => {
        if (s.resourceItemId !== input.resourceItemId) return s
        const available = s.available + input.quantity
        const status =
          available <= 0 ? 'out' : available < s.minimum ? (available < s.minimum * 0.5 ? 'reorder' : 'low') : 'normal'
        return { ...s, available, status }
      })
    }

    return row
  },

  fitTyre(input: {
    tyreId: string
    vehicleId: string
    position: string
    positionLabel: string
    actorName: string
  }): TyreAsset {
    const profile = mockVehiclesApi.get(input.vehicleId)
    if (!profile) throw new Error('Vehicle not found')
    const tyre = tyres.find((t) => t.id === input.tyreId)
    if (!tyre) throw new Error('Tyre not found')

    tyres = tyres.map((t) => {
      if (t.id !== input.tyreId) {
        if (
          t.vehicleId === input.vehicleId &&
          t.position === input.position &&
          t.status === 'fitted'
        ) {
          return {
            ...t,
            status: 'removed' as const,
            vehicleId: null,
            registrationNumber: null,
            position: null,
            positionLabel: null,
            removedAt: new Date().toISOString(),
            depotId: 'depot-wembley',
            depotName: 'Wembley Depot',
          }
        }
        return t
      }
      return {
        ...t,
        status: 'awaiting_retorque' as const,
        vehicleId: input.vehicleId,
        registrationNumber: profile.registrationNumber,
        position: input.position,
        positionLabel: input.positionLabel,
        fittedAt: new Date().toISOString(),
        removedAt: null,
        depotId: null,
        depotName: null,
        retorqueDueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        recommendation: 'Complete re-torque sign-off',
      }
    })

    appendTx({
      depotId: profile.currentDepotId ?? 'depot-wembley',
      depotName: profile.currentDepotName ?? 'Wembley Depot',
      resourceCategory: 'tyre',
      resourceItemId: 'res-tyre-215',
      resourceName: `${tyre.brand} ${tyre.size}`,
      transactionType: 'fit',
      quantity: 1,
      unit: 'each',
      unitPrice: tyre.unitCost,
      vatAmount: tyre.unitCost != null ? Math.round(tyre.unitCost * 0.2 * 100) / 100 : null,
      grossAmount: tyre.unitCost,
      vehicleId: input.vehicleId,
      registrationNumber: profile.registrationNumber,
      driverId: null,
      driverName: null,
      staffName: input.actorName,
      supplierName: null,
      workOrderId: null,
      defectId: null,
      odometer: profile.mileage,
      fuelLevelBefore: null,
      fuelLevelAfter: null,
      fullTank: null,
      receiptFileName: null,
      fuelCardId: null,
      status: 'approved',
      anomalyFlags: [],
      notes: `Fitted ${input.positionLabel}`,
      createdBy: input.actorName,
      approvedBy: input.actorName,
    })

    return tyres.find((t) => t.id === input.tyreId)!
  },

  removeTyre(input: { tyreId: string; actorName: string; quarantine?: boolean }): TyreAsset {
    const tyre = tyres.find((t) => t.id === input.tyreId)
    if (!tyre) throw new Error('Tyre not found')
    tyres = tyres.map((t) =>
      t.id === input.tyreId
        ? {
            ...t,
            status: input.quarantine ? ('quarantine' as const) : ('removed' as const),
            vehicleId: null,
            registrationNumber: null,
            position: null,
            positionLabel: null,
            removedAt: new Date().toISOString(),
            depotId: 'depot-wembley',
            depotName: 'Wembley Depot',
            retorqueDueAt: null,
          }
        : t,
    )

    if (tyre.vehicleId) {
      appendTx({
        depotId: 'depot-wembley',
        depotName: 'Wembley Depot',
        resourceCategory: 'tyre',
        resourceItemId: 'res-tyre-215',
        resourceName: `${tyre.brand} ${tyre.size}`,
        transactionType: 'remove',
        quantity: 1,
        unit: 'each',
        unitPrice: null,
        vatAmount: null,
        grossAmount: null,
        vehicleId: tyre.vehicleId,
        registrationNumber: tyre.registrationNumber,
        driverId: null,
        driverName: null,
        staffName: input.actorName,
        supplierName: null,
        workOrderId: null,
        defectId: tyre.linkedDefectId,
        odometer: null,
        fuelLevelBefore: null,
        fuelLevelAfter: null,
        fullTank: null,
        receiptFileName: null,
        fuelCardId: null,
        status: 'approved',
        anomalyFlags: [],
        notes: input.quarantine ? 'Removed to quarantine' : 'Removed to stock',
        createdBy: input.actorName,
        approvedBy: input.actorName,
      })
    }

    return tyres.find((t) => t.id === input.tyreId)!
  },

  rotateTyres(input: {
    vehicleId: string
    aTyreId: string
    bTyreId: string
    actorName: string
  }): TyreAsset[] {
    const a = tyres.find((t) => t.id === input.aTyreId)
    const b = tyres.find((t) => t.id === input.bTyreId)
    if (!a || !b) throw new Error('Tyres not found')
    tyres = tyres.map((t) => {
      if (t.id === a.id) {
        return {
          ...t,
          position: b.position,
          positionLabel: b.positionLabel,
          status: 'awaiting_retorque' as const,
          retorqueDueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          recommendation: 'Complete re-torque after rotation',
        }
      }
      if (t.id === b.id) {
        return {
          ...t,
          position: a.position,
          positionLabel: a.positionLabel,
          status: 'awaiting_retorque' as const,
          retorqueDueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          recommendation: 'Complete re-torque after rotation',
        }
      }
      return t
    })
    return tyres.filter((t) => t.vehicleId === input.vehicleId)
  },

  assignEquipment(input: {
    equipmentId: string
    vehicleId: string | null
    actorName: string
  }): EquipmentAsset {
    const profile = input.vehicleId ? mockVehiclesApi.get(input.vehicleId) : null
    equipment = equipment.map((e) =>
      e.id === input.equipmentId
        ? {
            ...e,
            status: input.vehicleId ? ('assigned' as const) : ('available' as const),
            vehicleId: input.vehicleId,
            registrationNumber: profile?.registrationNumber ?? null,
            depotId: input.vehicleId ? null : e.depotId ?? 'depot-wembley',
            depotName: input.vehicleId ? null : e.depotName ?? 'Wembley Depot',
            lastCheckedAt: new Date().toISOString(),
          }
        : e,
    )
    return equipment.find((e) => e.id === input.equipmentId)!
  },

  transferStock(input: {
    resourceItemId: string
    resourceName: string
    quantity: number
    unit: string
    fromDepotId: string
    fromDepotName: string
    toDepotId: string
    toDepotName: string
    actorName: string
  }): StockTransferRow {
    const row: StockTransferRow = {
      id: `xfer-new-${seq++}`,
      resourceItemId: input.resourceItemId,
      resourceName: input.resourceName,
      quantity: input.quantity,
      unit: input.unit,
      fromDepotId: input.fromDepotId,
      fromDepotName: input.fromDepotName,
      toDepotId: input.toDepotId,
      toDepotName: input.toDepotName,
      status: 'pending',
      requestedBy: input.actorName,
      createdAt: new Date().toISOString(),
    }
    stockTransfers = [row, ...stockTransfers]
    appendTx({
      depotId: input.fromDepotId,
      depotName: input.fromDepotName,
      resourceCategory: 'consumable',
      resourceItemId: input.resourceItemId,
      resourceName: input.resourceName,
      transactionType: 'transfer',
      quantity: input.quantity,
      unit: input.unit,
      unitPrice: null,
      vatAmount: null,
      grossAmount: null,
      vehicleId: null,
      registrationNumber: null,
      driverId: null,
      driverName: null,
      staffName: input.actorName,
      supplierName: null,
      workOrderId: null,
      defectId: null,
      odometer: null,
      fuelLevelBefore: null,
      fuelLevelAfter: null,
      fullTank: null,
      receiptFileName: null,
      fuelCardId: null,
      status: 'submitted',
      anomalyFlags: [],
      notes: `Transfer to ${input.toDepotName}`,
      createdBy: input.actorName,
      approvedBy: null,
    })
    return row
  },

  receiveTransfer(id: string, actorName: string): StockTransferRow | null {
    stockTransfers = stockTransfers.map((t) =>
      t.id === id ? { ...t, status: 'received' as const } : t,
    )
    const row = stockTransfers.find((t) => t.id === id) ?? null
    if (row) {
      stock = stock.map((s) => {
        if (s.depotId === row.toDepotId && s.resourceItemId === row.resourceItemId) {
          const available = s.available + row.quantity
          return {
            ...s,
            available,
            status:
              available <= 0
                ? 'out'
                : available < s.minimum
                  ? available < s.minimum * 0.5
                    ? 'reorder'
                    : 'low'
                  : 'normal',
          }
        }
        if (s.depotId === row.fromDepotId && s.resourceItemId === row.resourceItemId) {
          const available = Math.max(0, s.available - row.quantity)
          return {
            ...s,
            available,
            status:
              available <= 0
                ? 'out'
                : available < s.minimum
                  ? available < s.minimum * 0.5
                    ? 'reorder'
                    : 'low'
                  : 'normal',
          }
        }
        return s
      })
      void actorName
    }
    return row
  },

  updateSettings(patch: Partial<FleetResourcesSettings>): FleetResourcesSettings {
    settings = { ...settings, ...patch }
    return settings
  },

  approvePurchase(id: string, actorName: string) {
    purchaseRequests = purchaseRequests.map((p) =>
      p.id === id ? { ...p, status: 'approved' as const } : p,
    )
    void actorName
    return purchaseRequests.find((p) => p.id === id) ?? null
  },
}
