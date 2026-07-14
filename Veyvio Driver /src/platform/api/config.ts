export function isMockApi(): boolean {
  return import.meta.env.VITE_USE_MOCK_API !== "false";
}

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
}
