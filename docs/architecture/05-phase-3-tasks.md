# Phase 3 — Tasks Module

## Scope

Operational task workflow for yard staff: view, accept, assign, and complete work items with offline queue support.

### Delivered

- **Task types** — `src/types/tasks.ts` (kind, priority, status, links to vehicle/defect/trip)
- **Seed data** — `src/data/tasks-fixtures.ts` (5 realistic depot tasks)
- **Domain** — `src/domain/tasks/task-stats.ts`, `task-workflow.ts`
- **Store** — `tasks` in yard store; `acceptTask`, `completeTask`, `assignTask`; bootstrap hydration
- **UI** — `/tasks` list with filters (open, mine, all, done); `/tasks/$taskId` detail
- **Permissions** — `task.assign` for manager assignment; accept/complete for assignees
- **Sync** — `task.update` outbox mutation on accept, assign, complete
- **Home** — urgent tasks surface in attention strip

### Workflows

| Action | Who | Result |
|--------|-----|--------|
| Accept | Any user on open/assigned task | `in_progress`, assignee set, `task.update` queued |
| Assign | `task.assign` permission | `assigned` to team member |
| Complete | Assignee on `in_progress` task | `completed` with optional note |

### Sprint 2 — automation & scan

- **Auto-create tasks** — `src/domain/tasks/task-automation.ts`
  - Defect raised → defect task (priority by severity)
  - VOR opened → inspection task
  - Failed check sections → defect tasks
  - Blocked departure → trip task (deduped per trip)
- **Store** — `commitTripState()` merges trip recomputation + automation; `task.update` with `action: "create"` queued
- **Home** — “My tasks” board (top 3 by priority / assignee)
- **Scan** — `task:task_1` / `veyvio:task:…` deep-links; open tasks shown per vehicle

### Sprint 3 — equipment split & task completion

- **Equipment domain** — `src/domain/equipment/equipment-mutations.ts`
  - Pure assign / unassign / restock / report / clear mutations
  - Store delegates to domain; audit + outbox stay in Zustand
- **Task auto-close** — `src/domain/tasks/task-completion.ts`
  - Check passed → closes open `check` tasks for that vehicle
  - Trip ready → closes open trip blocker tasks (not check tasks)
  - Trip released → closes all open tasks for that trip
  - VOR cleared → closes open `inspection` tasks
  - Completions queued as `task.update` with `action: "complete"` and `auto: true`

### Sprint 4 — defect resolve

- **Domain** — `src/domain/yard/defect-workflow.ts` (`canResolveDefect`, `applyResolveDefect`)
- **Permission** — `defect.resolve` for managers, maintenance, ops
- **Store** — `resolveDefect()` marks resolved, queues `defect.resolve`, auto-closes linked defect tasks
- **UI** — defect detail resolve form; defects list shows recently resolved

### Not yet implemented

- Push notifications for new assignments
- Server-side task API

## Next recommended steps

1. **Live API** — wire `getYardApi()` when backend is ready (`VITE_API_BASE_URL`)
2. **Mobile / QR camera** — Capacitor scan integration
3. **Dispatch integration** — external trip feed
