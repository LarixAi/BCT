/**
 * Blueprint Part F rule 3 — production must never use mock or demo operational data.
 */

export class ProductionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionConfigurationError";
  }
}

export function isProductionBuild(): boolean {
  return import.meta.env.PROD === true;
}

/** Throws when a production build is configured with demo/mock flags. */
export function assertProductionApiConfig(): void {
  if (!isProductionBuild()) return;

  if (import.meta.env.VITE_USE_MOCK_API === "true") {
    throw new ProductionConfigurationError(
      "VITE_USE_MOCK_API must not be true in production builds.",
    );
  }
  if (import.meta.env.VITE_DEV_BYPASS_AUTH === "true") {
    throw new ProductionConfigurationError(
      "VITE_DEV_BYPASS_AUTH must not be true in production builds.",
    );
  }
  if (import.meta.env.VITE_USE_MOCK_AUTH === "true") {
    throw new ProductionConfigurationError(
      "VITE_USE_MOCK_AUTH must not be true in production builds.",
    );
  }

  const apiUrl =
    import.meta.env.VITE_API_URL ?? import.meta.env.VITE_COMMAND_API_BASE_URL ?? "";
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
  if (!String(apiUrl).trim() || !String(anonKey).trim()) {
    throw new ProductionConfigurationError(
      "Production Yard requires VITE_API_URL (or VITE_COMMAND_API_BASE_URL) and VITE_SUPABASE_ANON_KEY.",
    );
  }
}
