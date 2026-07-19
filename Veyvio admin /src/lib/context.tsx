import { createContext, useContext, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import { todayIsoDate } from './api/mappers'
import type { ConnectionStatus } from './types'
import { useAuth } from './auth-context'

interface DepotOption {
  id: string
  name: string
}

interface OperationalContextValue {
  companyName: string
  userName: string
  depotId: string
  setDepotId: (id: string) => void
  operationalDate: string
  operationalDateIso: string
  connectionStatus: ConnectionStatus
  setConnectionStatus: (status: ConnectionStatus) => void
  depots: DepotOption[]
}

const OperationalContext = createContext<OperationalContextValue | null>(null)

export function OperationalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [depotId, setDepotId] = useState('all')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('live')

  const { data: depots = [] } = useQuery({
    queryKey: ['depots'],
    queryFn: () => api.getDepots(),
    enabled: !!user?.activeTenantId,
    staleTime: 60_000,
  })

  const { data: driverSummary } = useQuery({
    queryKey: ['driver-directory-summary'],
    queryFn: () => api.getDriverDirectorySummary(),
    enabled: !!user?.activeTenantId,
    staleTime: 45_000,
    refetchInterval: 45_000,
  })

  const derivedConnection: ConnectionStatus =
    connectionStatus !== 'live'
      ? connectionStatus
      : (driverSummary?.appNotRecentlySynced ?? 0) > 5
        ? 'delayed'
        : 'live'

  const depotOptions: DepotOption[] = [
    { id: 'all', name: 'All depots' },
    ...depots.map((d) => ({ id: d.id, name: d.name })),
  ]

  const value: OperationalContextValue = {
    companyName: user?.tenantName ?? 'Veyvio Command',
    userName: user ? user.firstName : 'User',
    depotId,
    setDepotId,
    operationalDate: new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    operationalDateIso: todayIsoDate(),
    connectionStatus: derivedConnection,
    setConnectionStatus,
    depots: depotOptions,
  }

  return (
    <OperationalContext.Provider value={value}>{children}</OperationalContext.Provider>
  )
}

export function useOperationalContext() {
  const ctx = useContext(OperationalContext)
  if (!ctx) throw new Error('useOperationalContext must be used within OperationalProvider')
  return ctx
}
