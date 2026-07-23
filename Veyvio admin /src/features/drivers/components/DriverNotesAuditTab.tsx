import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import type { DriverNoteCategory, DriverProfile } from '@/lib/drivers/types'
import { api } from '@/lib/api/client'

const NOTE_CATEGORIES: { value: DriverNoteCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'operational', label: 'Operational' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'welfare', label: 'Welfare' },
  { value: 'performance', label: 'Performance' },
  { value: 'investigation', label: 'Investigation' },
  { value: 'account_support', label: 'Account support' },
  { value: 'restriction', label: 'Restriction' },
  { value: 'return_to_work', label: 'Return to work' },
]

export function DriverNotesAuditTab({
  driver,
  actorName,
  canEdit,
}: {
  driver: DriverProfile
  actorName: string
  canEdit: boolean
}) {
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<DriverNoteCategory>('general')
  const [visibleToDriver, setVisibleToDriver] = useState(false)

  const addNote = useMutation({
    mutationFn: () =>
      api.addDriverNote(driver.id, { category, body: body.trim(), visibleToDriver }, actorName),
    onSuccess: () => {
      setBody('')
      setVisibleToDriver(false)
      queryClient.invalidateQueries({ queryKey: ['driver-profile', driver.id] })
    },
  })

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Internal notes">
        {canEdit ? (
          <form
            className="mb-4 space-y-3 rounded-lg border border-border bg-surface-muted/60 p-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (!body.trim()) return
              addNote.mutate()
            }}
          >
            <label className="block text-sm">
              <span className="text-ink-soft">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DriverNoteCategory)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                {NOTE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Note</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                placeholder="Operational note for the driver record…"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={visibleToDriver}
                onChange={(e) => setVisibleToDriver(e.target.checked)}
              />
              Visible to driver in the app
            </label>
            {addNote.isError ? (
              <p className="text-sm text-red-800">
                {addNote.error instanceof Error ? addNote.error.message : 'Could not save note'}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={addNote.isPending || !body.trim()}
              className="rounded-lg bg-midnight px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
            >
              {addNote.isPending ? 'Saving…' : 'Add note'}
            </button>
          </form>
        ) : null}

        {driver.notes.length === 0 ? (
          <p className="text-sm text-muted">No notes.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {driver.notes.map((n) => (
              <li key={n.id} className="rounded-lg border border-border px-3 py-2">
                <p className="text-xs text-muted">
                  {n.category.replace(/_/g, ' ')} · {n.author} ·{' '}
                  {new Date(n.createdAt).toLocaleString('en-GB')}
                  {n.visibleToDriver ? ' · Visible to driver' : ''}
                </p>
                <p className="mt-1">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Audit history">
        {driver.auditEvents.length === 0 ? (
          <p className="text-sm text-muted">No audit events for this driver yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="pb-2 pr-2">Time</th>
                <th className="pb-2 pr-2">Action</th>
                <th className="pb-2">Actor</th>
              </tr>
            </thead>
            <tbody>
              {driver.auditEvents.map((e) => (
                <tr key={e.id} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-2 text-ink-soft whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2 pr-2">
                    <p>{e.action}</p>
                    {e.reason ? <p className="text-xs text-muted">{e.reason}</p> : null}
                  </td>
                  <td className="py-2 text-ink-soft">{e.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}
