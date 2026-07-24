import type { QueryClient } from '@tanstack/react-query'

const WORKSPACE_EVENT = 'veyvio:workspace-changed'

export type WorkspaceTransition = {
  fromCompanyId?: string | null
  toCompanyId?: string | null
  reason: 'login' | 'logout' | 'company-select' | 'company-switch' | 'session-expired'
}

/** Clear all tenant-bound client state before or after a workspace change. */
export function clearWorkspaceClientState(queryClient: QueryClient, transition: WorkspaceTransition) {
  queryClient.cancelQueries()
  queryClient.clear()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WORKSPACE_EVENT, { detail: transition }))
  }
}

export function onWorkspaceChanged(listener: (detail: WorkspaceTransition) => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  const handler = (event: Event) => {
    listener((event as CustomEvent<WorkspaceTransition>).detail)
  }
  window.addEventListener(WORKSPACE_EVENT, handler)
  return () => window.removeEventListener(WORKSPACE_EVENT, handler)
}
