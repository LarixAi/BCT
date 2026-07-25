import { describe, expect, it } from "vitest";
import {
  ProductionConfigurationError,
  assertProductionApiConfig,
  isProductionBuild,
} from "@/platform/api/production-guards";

describe("production-guards (Blueprint F-03)", () => {
  it("isProductionBuild reflects vitest dev mode", () => {
    expect(isProductionBuild()).toBe(import.meta.env.PROD === true);
  });

  it("rejects mock flags when PROD is true", () => {
    const env = import.meta.env;
    const prevProd = env.PROD;
    const prevMock = env.VITE_USE_MOCK_API;
    try {
      (env as { PROD: boolean }).PROD = true;
      (env as { VITE_USE_MOCK_API?: string }).VITE_USE_MOCK_API = "true";
      expect(() => assertProductionApiConfig()).toThrow(ProductionConfigurationError);
    } finally {
      (env as { PROD: boolean }).PROD = prevProd;
      (env as { VITE_USE_MOCK_API?: string }).VITE_USE_MOCK_API = prevMock;
    }
  });
});
