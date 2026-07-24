import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ResourceCategory, ResourceTransactionType } from '@/lib/fleet-resources/types'
import { api } from '@/lib/api/client'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function RecordTransactionPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const { data: vehicles = [] } = useQuery({
    queryKey: tKey(['vehicle-profiles']),
    queryFn: () => api.getVehicleProfiles(),
  })

  const { data: hub } = useQuery({
    queryKey: tKey(['fleet-resources-hub']),
    queryFn: () => api.getFleetResourcesHub(),
  })

  const [resourceItemId, setResourceItemId] = useState('res-diesel')
  const [transactionType, setTransactionType] = useState<ResourceTransactionType>('top_up')
  const [quantity, setQuantity] = useState(50)
  const [unitPrice, setUnitPrice] = useState(1.48)
  const [vehicleId, setVehicleId] = useState('')
  const [driverName, setDriverName] = useState('')
  const [odometer, setOdometer] = useState('')
  const [receiptFileName, setReceiptFileName] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [notes, setNotes] = useState('')

  const item = hub?.catalogue.find((c) => c.id === resourceItemId)

  const save = useMutation({
    mutationFn: () =>
      api.recordResourceTransaction({
        resourceCategory: (item?.category ?? 'fuel') as ResourceCategory,
        resourceItemId,
        resourceName: item?.name ?? 'Resource',
        transactionType,
        quantity,
        unit: item?.unit ?? 'L',
        unitPrice,
        vehicleId: vehicleId || null,
        driverName: driverName || null,
        supplierName: supplierName || null,
        odometer: odometer ? Number(odometer) : null,
        receiptFileName: receiptFileName || null,
        notes: notes || null,
        actorName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tKey(['fleet-resources-hub']) })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-midnight/30 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface p-4 shadow-xl">
        <h2 className="text-lg font-semibold text-ink">Record resource transaction</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Adds a movement to the shared ledger. Stock levels update from purchases and issues.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Resource</span>
            <select
              value={resourceItemId}
              onChange={(e) => setResourceItemId(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2"
            >
              {(hub?.catalogue ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.unit})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Type</span>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as ResourceTransactionType)}
              className="w-full rounded-lg border border-border px-3 py-2"
            >
              <option value="top_up">Top-up</option>
              <option value="dispense">Dispense</option>
              <option value="issue">Issue</option>
              <option value="purchase">Purchase</option>
              <option value="adjust">Adjust</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink-soft">Quantity</span>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-lg border border-border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink-soft">Unit price (£)</span>
              <input
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="w-full rounded-lg border border-border px-3 py-2"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Vehicle</span>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2"
            >
              <option value="">None (depot / stock)</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Driver name</span>
            <input
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Odometer</span>
            <input
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Receipt file name (stub)</span>
            <input
              value={receiptFileName}
              onChange={(e) => setReceiptFileName(e.target.value)}
              placeholder="e.g. shell-receipt.jpg"
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Supplier / site</span>
            <input
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={save.isPending || quantity <= 0}
            onClick={() => save.mutate()}
            className="rounded-lg bg-command-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {save.isPending ? 'Saving…' : 'Record transaction'}
          </button>
        </div>
      </div>
    </div>
  )
}
