import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'
import type { MessageRecord } from '@/lib/api/types'

type Folder = 'inbox' | 'sent'

export function MessagesPage() {
  const [folder, setFolder] = useState<Folder>('inbox')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', folder],
    queryFn: () => api.getMessages({ folder }),
  })

  const selected = useMemo(
    () => messages.find((m) => m.id === selectedId) ?? messages[0] ?? null,
    [messages, selectedId],
  )

  const unreadCount = messages.filter((m) => !m.readAt && folder === 'inbox').length

  const markRead = useMutation({
    mutationFn: (id: string) => api.markMessageRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  })

  function openMessage(message: MessageRecord) {
    setSelectedId(message.id)
    if (!message.readAt && folder === 'inbox') {
      markRead.mutate(message.id)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
        <p className="text-sm text-slate-600">Internal team messages</p>
      </div>

      <div className="flex gap-2">
        {(['inbox', 'sent'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFolder(f)
              setSelectedId(null)
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              folder === f ? 'bg-command-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {f}
            {f === 'inbox' && unreadCount > 0 && ` (${unreadCount})`}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <SectionCard title={folder === 'inbox' ? 'Inbox' : 'Sent'} description={`${messages.length} messages`}>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-500">No messages in {folder}.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {messages.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => openMessage(m)}
                    className={`w-full px-1 py-3 text-left transition hover:bg-slate-50 ${
                      selected?.id === m.id ? 'bg-command-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!m.readAt && folder === 'inbox' ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                        {m.subject ?? '(no subject)'}
                      </p>
                      <time className="shrink-0 text-xs text-slate-400">
                        {new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </time>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {folder === 'inbox'
                        ? `From ${m.sender.firstName} ${m.sender.lastName}`
                        : `To ${m.recipient.firstName} ${m.recipient.lastName}`}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Message">
          {!selected ? (
            <p className="text-sm text-slate-500">Select a message to read.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selected.subject ?? '(no subject)'}</h2>
                <p className="text-xs text-slate-500">
                  {folder === 'inbox'
                    ? `From ${selected.sender.firstName} ${selected.sender.lastName}`
                    : `To ${selected.recipient.firstName} ${selected.recipient.lastName}`}
                  {' · '}
                  {new Date(selected.createdAt).toLocaleString('en-GB')}
                </p>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{selected.body}</p>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
