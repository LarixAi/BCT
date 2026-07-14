/** Frontend-only mode — no veymo API required. Set VITE_MOCK_API=false to use the real API. */
export const isMockApi = import.meta.env.VITE_MOCK_API !== 'false'
