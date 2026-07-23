/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_BYPASS_AUTH?: string;
  readonly VITE_E2E?: string;
  readonly VITE_USE_MOCK_API?: string;
  readonly VITE_USE_MOCK_AUTH?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_COMMAND_API_BASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
