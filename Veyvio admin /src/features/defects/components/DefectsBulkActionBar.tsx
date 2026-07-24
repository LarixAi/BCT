import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { canBulkDefectAction } from '@/lib/defects/permissions'
import { defectsToCsv, downloadDefectsCsv } from '@/lib/defects/export'
import type { DefectRegisterRow } from '@/lib/defects/types'
import { api } from '@/lib/api/client'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function DefectsBulkActionBar({
  selected,
  rows,
  onClear,
}: {
  selected: string[]
  rows: DefectRegisterRow[]
  onClear: () => void
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canBulk = canBulkDefectAction(user?.permissions ?? [])

  const [assignee, setAssignee] = useState('Dave Wilson')
  const [note, setNote] = useState('')

  const selectedRows = rows.filter((r) => selected.includes(r.id))
  const hasCritical = selectedRows.some((r) => r.severity === 'dangerous')

  const bulk = useMutation({
    mutationFn: (action: 'assign_technician' | 'add_note' | 'export') =>
      api.bulkDefectActionHub(
        {
          defectIds: selected,
          action,
          assignee: action === 'assign_technician' ? assignee : undefined,
          note: action === 'add_note' ? note : undefined,
        },
        actorName,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tKey(['defects-hub']) })
      onClear()
      setNote('')
    },
  })

  if (selected.length === 0 || !canBulk) return null

  return (
    <div className="rounded-xl border border-command-200 bg-command-50/50 p-3" data-testid="bulk-action-bar">
      <p className="text-sm font-medium text-ink">{selected.length} defects selected</p>
      {hasCritical && (
        <p className="mt-1 text-xs text-red-700">Safety-critical defects cannot be bulk-assigned or noted — deselect them first.</p>
      )}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="text-ink-soft">Assign technician</span>
          <input value={assignee} onChange={(e) => setAssignee(e.target.value)} className="ml-2 rounded-lg border border-border px-2 py-1 text-sm" />
        </label>
        <button
          type="button"
          disabled={hasCritical || bulk.isPending}
          onClick={() => bulk.mutate('assign_technician')}
          className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Assign
        </button>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Internal note"
          className="rounded-lg border border-border px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={hasCritical || !note || bulk.isPending}
          onClick={() => bulk.mutate('add_note')}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          Add note
        </button>
        <button
          type="button"
          disabled={bulk.isPending}
          onClick={() => {
            const csv = defectsToCsv(selectedRows)
            downloadDefectsCsv(`defects-bulk-${new Date().toISOString().slice(0, 10)}.csv`, csv)
          }}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium"
        >
          Export selected
        </button>
        <button type="button" onClick={onClear} className="rounded-lg px-3 py-1.5 text-sm text-ink-soft">
          Clear
        </button>
      </div>
    </div>
  )
}
