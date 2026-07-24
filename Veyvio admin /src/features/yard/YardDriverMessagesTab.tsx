import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'
import type { YardDriverMessage, YardHubData } from '@/lib/yard/types'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function YardDriverMessagesTab({ hub }: { hub: YardHubData }) {
  const queryClient = useQueryClient()
  const messages = hub.driverMessages ?? []
  const [selected, setSelected] = useState<YardDriverMessage | null>(messages[0] ?? null)
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')

  const send = useMutation({
    mutationFn: () => {
      if (!selected?.driverId || !selected.conversationId) {
        throw new Error('Select a driver conversation first.')
      }
      return api.replyYardMessage({
        conversationId: selected.conversationId,
        driverId: selected.driverId,
        body: reply.trim(),
      })
    },
    onSuccess: async () => {
      setReply('')
      setError('')
      await queryClient.invalidateQueries({ queryKey: tKey(['yard-hub']) })
    },
    onError: (err: Error) => setError(err.message || 'Reply could not be sent.'),
  })

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <SectionCard title="Driver → Yard messages">
        <p className="mb-3 text-sm text-ink-soft">
          Messages drivers send to Yard (or both). Replies show in the Driver app from Yard.
        </p>
        {messages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface-muted px-3 py-6 text-center text-sm text-ink-soft">
            No yard messages yet. Drivers choose “Yard” or “Dispatch and Yard” in Contact ops.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {messages.map((m) => (
              <li key={`${m.id}-${m.sentAt}`}>
                <button
                  type="button"
                  onClick={() => setSelected(m)}
                  className={`w-full px-1 py-3 text-left ${
                    selected?.conversationId === m.conversationId ? 'bg-command-50' : ''
                  }`}
                >
                  <p className="font-medium text-ink">{m.driverName}</p>
                  <p className="text-sm text-ink-soft">{m.subject}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">{m.body}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title={selected ? selected.subject : 'Conversation'}
        action={
          selected?.driverId ? (
            <Link
              to={`/drivers/${selected.driverId}?tab=messages`}
              className="text-sm font-medium text-command-600 hover:underline"
            >
              Open driver
            </Link>
          ) : null
        }
      >
        {!selected ? (
          <p className="text-sm text-muted">Select a message to reply.</p>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-surface-muted p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {selected.driverName} · {selected.sourceApp || 'DRIVER'}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{selected.body}</p>
              <p className="mt-2 text-xs text-muted">
                {selected.sentAt
                  ? new Date(selected.sentAt).toLocaleString('en-GB')
                  : '—'}
              </p>
            </div>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Reply as Yard…"
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="button"
              disabled={!reply.trim() || send.isPending}
              onClick={() => send.mutate()}
              className="rounded-lg bg-command-600 px-3 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
            >
              {send.isPending ? 'Sending…' : 'Send Yard reply'}
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
