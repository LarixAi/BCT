import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FleetResourcesHubData, FleetResourcesSettings } from '@/lib/fleet-resources/types'
import { api } from '@/lib/api/client'

export function SettingsTab({ hub }: { hub: FleetResourcesHubData }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FleetResourcesSettings>({ ...hub.settings })

  const save = useMutation({
    mutationFn: () => api.updateFleetResourcesSettings(form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fleet-resources-hub'] }),
  })

  function set<K extends keyof FleetResourcesSettings>(key: K, value: FleetResourcesSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Resource policies</h2>
        <p className="text-sm text-slate-600">
          Receipt, odometer and approval thresholds for the fleet ledger.
        </p>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Require receipt above (£)</span>
        <input
          type="number"
          value={form.requireReceiptAbove}
          onChange={(e) => set('requireReceiptAbove', Number(e.target.value))}
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.requireOdometer}
          onChange={(e) => set('requireOdometer', e.target.checked)}
        />
        <span>Require odometer on fuel / AdBlue top-ups</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.blockPurchaseWhenVor}
          onChange={(e) => set('blockPurchaseWhenVor', e.target.checked)}
        />
        <span>Flag purchases when vehicle is VOR</span>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Max litres per transaction</span>
        <input
          type="number"
          value={form.maxLitresPerTransaction}
          onChange={(e) => set('maxLitresPerTransaction', Number(e.target.value))}
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Manager approval above (£)</span>
        <input
          type="number"
          value={form.managerApprovalAbove}
          onChange={(e) => set('managerApprovalAbove', Number(e.target.value))}
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Company MPG baseline</span>
        <input
          type="number"
          step="0.1"
          value={form.companyMpgBaseline}
          onChange={(e) => set('companyMpgBaseline', Number(e.target.value))}
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Minimum tread depth (mm)</span>
        <input
          type="number"
          step="0.1"
          value={form.minTreadDepthMm}
          onChange={(e) => set('minTreadDepthMm', Number(e.target.value))}
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Low fuel warning (%)</span>
        <input
          type="number"
          value={form.lowFuelPercent}
          onChange={(e) => set('lowFuelPercent', Number(e.target.value))}
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>

      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate()}
        className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {save.isPending ? 'Saving…' : 'Save policies'}
      </button>
      {save.isSuccess && <p className="text-sm text-emerald-700">Policies saved.</p>}
    </div>
  )
}
