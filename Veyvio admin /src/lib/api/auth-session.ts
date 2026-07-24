/** Decode JWT expiry without verifying signature — used only for client refresh timing. */
export function isAccessTokenExpired(token: string, skewMs = 60_000): boolean {
  try {
    const part = token.split('.')[1]
    if (!part) return true
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
    if (!json.exp) return false
    return json.exp * 1000 - skewMs <= Date.now()
  } catch {
    return true
  }
}

export function resolveSupabaseProjectUrl(apiUrl: string): string | null {
  const direct = import.meta.env.VITE_SUPABASE_URL
  if (direct && String(direct).length > 0) return String(direct).replace(/\/$/, '')
  const match = apiUrl.match(/^(https:\/\/[^/]+\.supabase\.co)/)
  return match?.[1] ?? null
}
