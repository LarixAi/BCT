/** Live API is the default. Mock is opt-in for tests/Storybook only. */
export const isMockApi = import.meta.env.VITE_MOCK_API === 'true'

/** Hybrid operations mock removed — never combine live auth with demo operational data. */
export const useOperationsMock = false
