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
  depots: DepotOption[]
}

const OperationalContext = createContext<OperationalContextValue | null>(null)

export function OperationalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [depotId, setDepotId] = useState('all')

  const { data: depots = [] } = useQuery({
    queryKey: ['depots'],
    queryFn: () => api.getDepots(),
    enabled: !!user?.activeTenantId,
    staleTime: 60_000,
  })

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
    connectionStatus: 'live',
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
