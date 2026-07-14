/**
 * API mode is mock-first so the app runs fully offline / without a backend.
 * Set VITE_USE_MOCK_API=false AND VITE_API_BASE_URL to use a real API when ready.
 */
export function isMockApi(): boolean {
  if (import.meta.env.VITE_USE_MOCK_API === "false" && import.meta.env.VITE_API_BASE_URL) {
    return false;
  }
  return true;
}

export function getApiBaseUrl(): string | null {
  const url = import.meta.env.VITE_API_BASE_URL;
  return url && url.length > 0 ? url.replace(/\/$/, "") : null;
}
