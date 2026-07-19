import type {
  AssignDriverTrainingInput,
  DriverRequirementHistoryItem,
  DriverRequirementState,
  RejectDriverRequirementInput,
  RequestDriverRequirementsInput,
} from '@/lib/drivers/types'

type Stored = DriverRequirementState & {
  history: DriverRequirementHistoryItem[]
}

const store = new Map<string, Map<string, Stored>>()

function bucket(driverId: string) {
  if (!store.has(driverId)) store.set(driverId, new Map())
  return store.get(driverId)!
}

function ensure(driverId: string, key: string): Stored {
  const b = bucket(driverId)
  const existing = b.get(key)
  if (existing) return existing
  const created: Stored = {
    id: `${driverId}:${key}`,
    definitionKey: key,
    requirementType: key === 'app_account' ? 'account_setup' : 'document',
    statusOverride: null,
    assignedToName: null,
    dueAt: null,
    lastRequestedAt: null,
    lastRequestedChannels: [],
    openedAt: null,
    requestCount: 0,
    reminderCount: 0,
    lastReminderAt: null,
    rejectionReason: null,
    internalNote: null,
    updatedAt: null,
    history: [],
  }
  b.set(key, created)
  return created
}

function listStates(driverId: string): DriverRequirementState[] {
  return [...bucket(driverId).values()].map(({ history: _h, ...rest }) => rest)
}

export const mockDriverRequirementsApi = {
  list(driverId: string) {
    return { driverId, requirements: listStates(driverId) }
  },

  request(driverId: string, input: RequestDriverRequirementsInput, actorName: string) {
    const now = new Date()
    const applied: string[] = []
    const skipped: string[] = []
    const minHours = input.minHoursSinceLastRequest ?? 0
    const mode = input.mode ?? 'request'

    for (const key of input.definitionKeys) {
      const row = ensure(driverId, key)
      if (mode === 'resend' && minHours > 0 && row.lastRequestedAt) {
        const last = new Date(row.lastRequestedAt).getTime()
        if (now.getTime() - last < minHours * 3600_000) {
          skipped.push(key)
          continue
        }
      }
      const isReminder = mode === 'resend' || row.requestCount > 0
      row.lastRequestedAt = now.toISOString()
      row.lastRequestedChannels = input.channels
      row.requestCount += 1
      row.dueAt = input.dueAt
      row.statusOverride = 'request_sent'
      row.updatedAt = now.toISOString()
      if (isReminder) {
        row.reminderCount += 1
        row.lastReminderAt = now.toISOString()
      }
      row.history.unshift({
        id: `req-${Date.now()}-${key}`,
        channels: input.channels,
        status: 'sent',
        message: input.message ?? null,
        dueAt: input.dueAt,
        sentAt: now.toISOString(),
        openedAt: null,
        requestedByName: actorName,
        reminderCount: isReminder ? 1 : 0,
        lastReminderAt: isReminder ? now.toISOString() : null,
      })
      applied.push(key)
    }

    return {
      driverId,
      sentAt: now.toISOString(),
      count: applied.length,
      skipped,
      requirements: listStates(driverId),
    }
  },

  assignTraining(driverId: string, input: AssignDriverTrainingInput, actorName: string) {
    const row = ensure(driverId, input.definitionKey)
    const now = new Date().toISOString()
    row.statusOverride = 'training_assigned'
    row.assignedToName = input.trainer || actorName
    row.dueAt = input.deadline
    row.updatedAt = now
    row.history.unshift({
      id: `assign-${Date.now()}`,
      channels: [],
      status: 'completed',
      message: `Assigned via ${input.delivery}`,
      dueAt: input.deadline,
      sentAt: now,
      openedAt: null,
      requestedByName: actorName,
      reminderCount: 0,
      lastReminderAt: null,
    })
    const { history: _omit, ...requirement } = row
    return { requirement }
  },

  reject(driverId: string, definitionKey: string, input: RejectDriverRequirementInput, actorName: string) {
    const row = ensure(driverId, definitionKey)
    const now = new Date().toISOString()
    row.statusOverride = 'rejected'
    row.rejectionReason = input.reasonCode
    row.internalNote = input.instructions
    row.dueAt = input.deadline
    row.updatedAt = now
    row.history.unshift({
      id: `reject-${Date.now()}`,
      channels: ['in_app', 'email'],
      status: 'sent',
      message: input.instructions,
      dueAt: input.deadline,
      sentAt: now,
      openedAt: null,
      requestedByName: actorName,
      reminderCount: 0,
      lastReminderAt: null,
    })
    const { history: _h, ...requirement } = row
    return { requirement }
  },

  markStatus(
    driverId: string,
    definitionKey: string,
    status: 'not_applicable' | 'waived',
    actorName: string,
  ) {
    const row = ensure(driverId, definitionKey)
    const now = new Date().toISOString()
    row.statusOverride = status
    row.updatedAt = now
    row.history.unshift({
      id: `status-${Date.now()}`,
      channels: [],
      status: 'completed',
      message: `Marked ${status}`,
      dueAt: row.dueAt,
      sentAt: now,
      openedAt: null,
      requestedByName: actorName,
      reminderCount: 0,
      lastReminderAt: null,
    })
    const { history: _h, ...requirement } = row
    return { requirement }
  },

  submitEvidence(
    driverId: string,
    definitionKey: string,
    actorName: string,
    options?: { label?: string; message?: string },
  ) {
    const row = ensure(driverId, definitionKey)
    const now = new Date().toISOString()
    row.statusOverride = 'submitted'
    row.updatedAt = now
    row.history.unshift({
      id: `submit-${Date.now()}`,
      channels: ['in_app'],
      status: 'sent',
      message: options?.message ?? 'Evidence submitted for review',
      dueAt: row.dueAt,
      sentAt: now,
      openedAt: null,
      requestedByName: actorName,
      reminderCount: 0,
      lastReminderAt: null,
    })
    const { history: _h, ...requirement } = row
    return { requirement }
  },

  history(driverId: string, definitionKey: string) {
    return {
      driverId,
      definitionKey,
      history: ensure(driverId, definitionKey).history,
    }
  },
}
