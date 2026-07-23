import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api/client'
import type { MessageRecord } from '@/lib/api/types'
import { conversationKpis, filterConversations, MOCK_CONVERSATIONS } from '@/lib/messages/mock-conversations'
import type { Conversation, ConversationMessage, MessageInboxTab } from '@/lib/messages/types'

const TABS: { id: MessageInboxTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'awaiting', label: 'Awaiting reply' },
  { id: 'assigned', label: 'Assigned to me' },
  { id: 'groups', label: 'Groups' },
  { id: 'archived', label: 'Archived' },
]

function conversationsFromMessages(rows: MessageRecord[]): Conversation[] {
  const byThread = new Map<string, MessageRecord[]>()
  for (const row of rows) {
    const key = row.conversationId ?? row.id
    const list = byThread.get(key) ?? []
    list.push(row)
    byThread.set(key, list)
  }

  return [...byThread.entries()].map(([id, messages]) => {
    const sorted = [...messages].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    const latest = sorted[sorted.length - 1]
    const driverSide = sorted.find((m) => m.driverId)?.recipient ?? latest.recipient
    return {
      id,
      title: latest.subject ?? 'Ops notice',
      participantName: `${driverSide.firstName} ${driverSide.lastName}`.trim() || 'Driver',
      participantRole: 'driver',
      preview: latest.body,
      updatedAt: latest.createdAt,
      unreadCount: sorted.filter((m) => !m.readAt && m.sourceApp === 'DRIVER').length,
      status: 'open',
      priority: 'normal',
      assignedTo: 'You',
      depot: null,
      runRef: null,
      channel: 'app',
      category: 'Operations',
      driverId: latest.driverId ?? undefined,
      messages: sorted.map((m) => ({
        id: m.id,
        conversationId: id,
        kind: 'user' as const,
        senderName: `${m.sender.firstName} ${m.sender.lastName}`.trim() || 'Ops',
        senderRole: m.sourceApp === 'DRIVER' ? 'Driver' : 'Admin',
        body: m.body,
        createdAt: m.createdAt,
        mine: m.sourceApp !== 'DRIVER',
      })),
      context: {
        lines: [
          { label: 'Driver', value: `${driverSide.firstName} ${driverSide.lastName}`.trim() || '—' },
          { label: 'Thread', value: id.slice(0, 8) },
        ],
        hrefs: latest.driverId
          ? [{ label: 'Open driver profile', href: `/drivers/${latest.driverId}` }]
          : [{ label: 'Open live operations', href: '/live-operations' }],
      },
    }
  })
}

export function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<MessageInboxTab>('all')
  const [search, setSearch] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [composeTo, setComposeTo] = useState('')
  const [composeDriverId, setComposeDriverId] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [internalNote, setInternalNote] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [sending, setSending] = useState(false)

  async function reloadLiveMessages() {
    try {
      const rows = await api.getMessages()
      const live = conversationsFromMessages(rows)
      setConversations(live.length ? live : [])
      setLoadError('')
      if (!selectedId && live[0]) setSelectedId(live[0].id)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Messages could not be loaded.')
      setConversations(MOCK_CONVERSATIONS)
      if (!selectedId) setSelectedId(MOCK_CONVERSATIONS[0]?.id ?? null)
    }
  }

  useEffect(() => {
    void reloadLiveMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const conversation = searchParams.get('conversation')
    if (conversation) setSelectedId(conversation)
    if (searchParams.get('compose') === '1') {
      setComposeOpen(true)
      setComposeTo(searchParams.get('to') ?? '')
      setComposeDriverId(searchParams.get('driverId') ?? '')
      const run = searchParams.get('run')
      if (run) setComposeBody(`Regarding ${run}: `)
    }
  }, [searchParams])

  const filtered = useMemo(() => filterConversations(conversations, tab, search), [conversations, tab, search])
  const kpis = useMemo(() => conversationKpis(conversations), [conversations])
  const selected = conversations.find((c) => c.id === selectedId) ?? filtered[0] ?? null

  function selectConversation(id: string) {
    setSelectedId(id)
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
    )
    const next = new URLSearchParams(searchParams)
    next.set('conversation', id)
    next.delete('compose')
    setSearchParams(next, { replace: true })
  }

  async function sendReply() {
    if (!selected || !draft.trim() || internalNote) {
      if (!selected || !draft.trim()) return
      const message: ConversationMessage = {
        id: `local-${Date.now()}`,
        conversationId: selected.id,
        kind: 'internal_note',
        senderName: 'You',
        senderRole: 'Internal note',
        body: draft.trim(),
        createdAt: new Date().toISOString(),
        mine: true,
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selected.id
            ? { ...c, preview: draft.trim(), updatedAt: message.createdAt, messages: [...c.messages, message] }
            : c,
        ),
      )
      setDraft('')
      setInternalNote(false)
      return
    }

    if (!selected.driverId) {
      setLoadError('This thread is not linked to a Driver account yet. Compose from the driver profile.')
      return
    }

    setSending(true)
    try {
      await api.createMessage({
        driverId: selected.driverId,
        conversationId: selected.id,
        subject: selected.title,
        body: draft.trim(),
      })
      setDraft('')
      await reloadLiveMessages()
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Reply could not be sent.')
    } finally {
      setSending(false)
    }
  }

  async function createConversation() {
    if (!composeBody.trim()) return
    if (!composeDriverId.trim()) {
      setLoadError('Open Messages from a driver profile (or pass driverId) so the notice reaches the Driver app.')
      return
    }

    setSending(true)
    try {
      const created = await api.createMessage({
        driverId: composeDriverId.trim(),
        subject: composeTo.trim() || undefined,
        body: composeBody.trim(),
      })
      setComposeOpen(false)
      setComposeTo('')
      setComposeBody('')
      setComposeDriverId('')
      await reloadLiveMessages()
      const next = new URLSearchParams(searchParams)
      next.delete('compose')
      next.set('conversation', created.conversationId ?? created.id)
      setSearchParams(next, { replace: true })
      setSelectedId(created.conversationId ?? created.id)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Messages</h1>
            <p className="mt-0.5 text-sm text-ink-soft">
              Communicate with drivers, staff, customers and operational teams.
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              Live Command threads with the Driver app — not system alerts
            </p>
            {loadError ? <p className="mt-1 text-xs text-amber-700">{loadError}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="rounded-lg border border-command-200 bg-command-50 px-3 py-1.5 text-sm font-medium text-command-800 hover:bg-command-100"
            >
              New message
            </button>
            <Link
              to="/templates"
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
            >
              Templates
            </Link>
            <Link
              to="/notifications"
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
            >
              Notifications
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full max-w-xs rounded-lg border border-border px-3 py-1.5 text-sm"
          />
          <div className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium',
                  tab === t.id ? 'bg-command-600 text-white' : 'bg-surface text-ink-soft ring-1 ring-border',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: 'Unread conversations', value: kpis.unread },
          { title: 'Awaiting reply', value: kpis.awaiting, tone: 'warning' as const },
          { title: 'Assigned to me', value: kpis.assignedToMe },
          { title: 'Urgent', value: kpis.urgent, tone: 'danger' as const },
        ].map((card) => (
          <div
            key={card.title}
            className={cn(
              'rounded-xl border bg-surface p-3',
              card.tone === 'danger' ? 'border-red-200' : card.tone === 'warning' ? 'border-amber-200' : 'border-border',
            )}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{card.title}</p>
            <p
              className={cn(
                'mt-1 text-2xl font-bold tabular-nums',
                card.tone === 'danger' ? 'text-red-800' : card.tone === 'warning' ? 'text-amber-800' : 'text-ink',
              )}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <SectionCard title="Inbox" description={`${filtered.length} conversations`} className="min-h-0 overflow-hidden" flush>
          <div className="max-h-[640px] overflow-auto">
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted">No conversations match this view.</p>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => selectConversation(c.id)}
                      className={cn(
                        'w-full px-3 py-3 text-left hover:bg-surface-muted',
                        selected?.id === c.id && 'bg-command-50',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm', c.unreadCount > 0 ? 'font-semibold text-ink' : 'font-medium text-ink')}>
                          {c.title}
                        </p>
                        <time className="shrink-0 text-[11px] text-muted">
                          {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>
                      <p className="mt-0.5 text-[11px] capitalize text-muted">
                        {c.participantRole} · {c.runRef ?? c.bookingRef ?? c.depot ?? 'General'}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{c.preview}</p>
                      {c.unreadCount > 0 && (
                        <span className="mt-1 inline-flex rounded-full bg-command-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {c.unreadCount} unread
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title={selected?.title ?? 'Conversation'}
          description={
            selected
              ? `${selected.participantRole} · ${selected.depot ?? '—'} · Status: ${selected.status.replace(/_/g, ' ')}`
              : 'Select a conversation'
          }
          className="min-h-0 overflow-hidden"
          flush
        >
          {!selected ? (
            <p className="p-4 text-sm text-muted">
              No conversations yet. Start a message with a driver, customer or team.
            </p>
          ) : (
            <div className="flex h-full min-h-[520px] flex-col">
              <div className="border-b border-border px-4 py-2 text-xs text-ink-soft">
                {[selected.runRef && `Trip ${selected.runRef}`, selected.vehicleRegistration, selected.assignedTo && `Assigned to ${selected.assignedTo}`]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
              <div className="flex-1 space-y-3 overflow-auto p-4">
                {selected.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                      m.kind === 'system'
                        ? 'mx-auto max-w-full border border-dashed border-border bg-surface-muted text-center text-xs text-ink-soft'
                        : m.kind === 'internal_note'
                          ? 'border border-amber-200 bg-amber-50 text-amber-950'
                          : m.mine
                            ? 'ml-auto bg-command-600 text-white'
                            : 'bg-surface-muted text-ink',
                    )}
                  >
                    {m.kind !== 'system' && (
                      <p className={cn('text-[11px] font-medium', m.mine ? 'text-command-100' : 'text-muted')}>
                        {m.senderName} · {m.senderRole}
                      </p>
                    )}
                    <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
                    <p className={cn('mt-1 text-[10px]', m.mine && m.kind === 'user' ? 'text-command-100' : 'text-muted')}>
                      {new Date(m.createdAt).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3">
                <div className="mb-2 flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setInternalNote((v) => !v)}
                    className={cn(
                      'rounded-md border px-2 py-1 font-medium',
                      internalNote ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-border text-ink-soft',
                    )}
                  >
                    Internal note
                  </button>
                  <Link to="/templates" className="rounded-md border border-border px-2 py-1 font-medium text-ink-soft hover:bg-surface-muted">
                    Template
                  </Link>
                  <Link to="/exceptions" className="rounded-md border border-border px-2 py-1 font-medium text-ink-soft hover:bg-surface-muted">
                    Create exception
                  </Link>
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  placeholder={internalNote ? 'Add an internal note (not visible to the driver)…' : 'Type a message…'}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={!draft.trim()}
                    className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Context" description="Related operational record">
          {!selected ? (
            <p className="text-sm text-muted">Context appears when a conversation is selected.</p>
          ) : (
            <div className="space-y-3 text-sm">
              {selected.context.lines.map((line) => (
                <div key={line.label} className="flex justify-between gap-3 border-b border-border pb-2">
                  <span className="text-muted">{line.label}</span>
                  <span className="text-right font-medium text-ink">{line.value}</span>
                </div>
              ))}
              <div className="space-y-2 pt-1">
                {selected.context.hrefs.map((link) => (
                  <Link
                    key={link.href + link.label}
                    to={link.href}
                    className="block rounded-lg border border-border px-3 py-2 text-xs font-medium text-command-700 hover:bg-command-50"
                  >
                    {link.label} →
                  </Link>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {composeOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-midnight/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-4 shadow-xl">
            <h2 className="text-lg font-semibold text-ink">New message</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Send an ops notice to a Driver app account. Prefer opening this from the driver profile so the driver ID is
              filled in.
            </p>
            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-muted">
              Driver name / subject
              <input
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal normal-case text-ink"
                placeholder="Driver name"
              />
            </label>
            <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-muted">
              Driver ID
              <input
                value={composeDriverId}
                onChange={(e) => setComposeDriverId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal normal-case text-ink"
                placeholder="UUID from driver profile"
              />
            </label>
            <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-muted">
              Message
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal normal-case text-ink"
                placeholder="Write the first message…"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sending || !composeDriverId.trim() || !composeBody.trim()}
                onClick={() => void createConversation()}
                className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send to Driver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
