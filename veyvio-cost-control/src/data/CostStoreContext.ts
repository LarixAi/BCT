import { createContext, type Context } from 'react'

/** Stable Context identity — kept out of CostStore.tsx so Vite HMR does not blank consumers. */
export const CostStoreContext: Context<any> = createContext<any>(null)
