import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'
import type { DriverProfile } from '@/lib/drivers/types'

export function DriverMessagesTab({ driver }: { driver: DriverProfile }) {
  const displayName = `${driver.firstName} ${driver.lastName}`.trim()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [subject, setSubject] = useState(`Message for ${displayName}`)
  const [error, setError] = useState('')

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', 'driver', driver.id],
    queryFn: () => api.getMessages({ driverId: driver.id }),
  })

  const send = useMutation({
    mutationFn: () =>
      api.createMessage({
        driverId: driver.id,
        subject: subject.trim() || `Message for ${displayName}`,
        body: body.trim(),
      }),
    onSuccess: async () => {
      setBody('')
      setError('')
      await queryClient.invalidateQueries({ queryKey: ['messages', 'driver', driver.id] })
      await queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
    onError: (err: Error) => setError(err.message || 'Message could not be sent.'),
  })

  const composeHref = `/messages?compose=1&driverId=${encodeURIComponent(driver.id)}&to=${encodeURIComponent(displayName)}`

  return (
    <div className="space-y-4">
      <SectionCard
        title="Messages and acknowledgements"
        action={
          <Link
            to={composeHref}
            className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700"
          >
            Open Messages
          </Link>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Messages sent here appear in the Driver app inbox for {displayName}. Replies come back to this shared Command
          thread.
        </p>

        <div className="mb-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="Subject"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder={`Write a notice for ${displayName}…`}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            disabled={!body.trim() || send.isPending}
            onClick={() => send.mutate()}
            className="rounded-lg bg-command-600 px-3 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
          >
            {send.isPending ? 'Sending…' : 'Send to Driver app'}
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading messages…</p>
        ) : messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
            <p className="text-sm text-slate-600">No Command messages for this driver yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {messages.slice(0, 20).map((m) => (
              <li key={m.id} className="py-3 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{m.subject ?? 'No subject'}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{m.body}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {m.sender.firstName} {m.sender.lastName}
                      {m.sourceApp ? ` · ${m.sourceApp}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-slate-500">
                    {new Date(m.createdAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
