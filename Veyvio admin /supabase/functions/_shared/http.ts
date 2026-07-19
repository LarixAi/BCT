export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, content-type, x-client-info, apikey, x-supabase-client-platform, x-supabase-client-platform-version, prefer, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

/** Prefer this over `throw new Response(...)` so Deno/Safari always get CORS headers. */
export class HttpError extends Error {
  status: number
  code: string

  constructor(status: number, message: string, code = 'request_failed') {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

export function apiError(status: number, message: string, code = 'request_failed') {
  return json({ statusCode: status, code, message }, status)
}

function isHttpErrorLike(error: unknown): error is { status: number; message: string; code?: string } {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { status?: unknown; message?: unknown; name?: unknown }
  // Duck-type: Supabase's bundler can break `instanceof HttpError` across modules.
  return (
    typeof candidate.status === 'number' &&
    candidate.status >= 400 &&
    candidate.status < 600 &&
    typeof candidate.message === 'string' &&
    (candidate.name === 'HttpError' || 'code' in candidate)
  )
}

export function toApiErrorResponse(error: unknown, fallback = 'Unexpected server error'): Response {
  if (isHttpErrorLike(error)) {
    return apiError(error.status, error.message, error.code ?? 'request_failed')
  }
  if (error instanceof Response) {
    // Legacy path — never rethrow bare Response (breaks CORS in Safari).
    return apiError(error.status || 500, 'Request failed')
  }
  if (error instanceof Error) {
    return apiError(500, error.message || fallback)
  }
  return apiError(500, fallback)
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new Error('Request body must be valid JSON')
  }
}

export function toCamelCase(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toCamelCase)
  if (!value || typeof value !== 'object' || value instanceof Date) return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      toCamelCase(item),
    ]),
  )
}
