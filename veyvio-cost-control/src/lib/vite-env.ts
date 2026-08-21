/** Vite plus test-injected env. PROD is boolean in Vite and often a string in unit tests. */
export type ViteLikeEnv = {
  PROD?: boolean | string
  DEV?: boolean | string
  MODE?: string
  [key: string]: string | boolean | undefined
}

export function isViteProduction(env: ViteLikeEnv): boolean {
  if (env.PROD === true || env.PROD === 'true') return true
  if (env.PROD === false || env.PROD === 'false') return false
  return env.MODE === 'production'
}
