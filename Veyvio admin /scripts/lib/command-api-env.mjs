/** Shared URL + credential resolution for live Command API smoke scripts. */
const DEFAULT_API = 'https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api'
const DEFAULT_SUPABASE = 'https://qeckgqjrfbdyxchuncdt.supabase.co'

export function normalizeApiUrl(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return DEFAULT_API
  if (value.startsWith('/')) return `${DEFAULT_SUPABASE}${value}`.replace(/\/$/, '')
  return value.replace(/\/$/, '')
}

export function normalizeSupabaseUrl(apiUrl, explicit) {
  const direct = String(explicit ?? '').trim()
  if (direct) return direct.replace(/\/$/, '')
  const derived = apiUrl.replace(/\/functions\/v1\/command-api\/?$/, '')
  if (derived && derived !== apiUrl) return derived
  return DEFAULT_SUPABASE
}

export function resolveCommandApiEnv() {
  const api = normalizeApiUrl(process.env.VEYVIO_API_URL ?? process.env.VITE_API_URL ?? process.env.VITE_COMMAND_API_BASE_URL)
  const supabase = normalizeSupabaseUrl(api, process.env.VEYVIO_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)
  const anon = String(process.env.VEYVIO_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  return { api, supabase, anon }
}

export function bearerHeaders(anon, token) {
  const headers = { 'Content-Type': 'application/json', apikey: anon }
  const auth = token ?? anon
  if (auth) headers.Authorization = `Bearer ${auth}`
  return headers
}
