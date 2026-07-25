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
}
