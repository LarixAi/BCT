export interface RuntimeConfigurationEnv {
  PROD?: boolean;
  VITE_USE_MOCK_API?: string;
  VITE_DEV_BYPASS_AUTH?: string;
  VITE_API_BASE_URL?: string;
}

export interface ProductionConfiguration {
  isProduction: boolean;
  useMockApi?: string;
  devBypassAuth?: string;
}

export class ProductionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionConfigurationError";
  }
}

function isEnabled(value: string | undefined): boolean {
  return value === "true";
}

export function assertProductionConfiguration({
  isProduction,
  useMockApi,
  devBypassAuth,
}: ProductionConfiguration): void {
  if (!isProduction) return;

  if (isEnabled(useMockApi)) {
    throw new ProductionConfigurationError("Mock API is not permitted in production");
  }

  if (isEnabled(devBypassAuth)) {
    throw new ProductionConfigurationError("Development authentication bypass is not permitted in production");
  }
}

export function isProductionBuild(
  env: RuntimeConfigurationEnv = import.meta.env,
): boolean {
  return env.PROD === true;
}

export function assertCurrentRuntimeConfiguration(
  env: RuntimeConfigurationEnv = import.meta.env,
): void {
  assertProductionConfiguration({
    isProduction: isProductionBuild(env),
    useMockApi: env.VITE_USE_MOCK_API,
    devBypassAuth: env.VITE_DEV_BYPASS_AUTH,
  });
}

export function isMockApi(
  env: RuntimeConfigurationEnv = import.meta.env,
): boolean {
  assertCurrentRuntimeConfiguration(env);
  return isEnabled(env.VITE_USE_MOCK_API);
}

export function getApiBaseUrl(
  env: RuntimeConfigurationEnv = import.meta.env,
): string {
  return env.VITE_API_BASE_URL ?? "http://localhost:3000";
}
