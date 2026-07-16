import { describe, expect, it } from "vitest";
import {
  ProductionConfigurationError,
  assertProductionConfiguration,
  getApiBaseUrl,
  isMockApi,
} from "./config";

describe("Driver API configuration", () => {
  it("uses real transport when mock API is not explicitly enabled", () => {
    expect(isMockApi({ PROD: false })).toBe(false);
  });

  it("allows explicit mock API in development", () => {
    expect(isMockApi({ PROD: false, VITE_USE_MOCK_API: "true" })).toBe(true);
  });

  it("rejects mock API in production", () => {
    expect(() =>
      assertProductionConfiguration({
        isProduction: true,
        useMockApi: "true",
      }),
    ).toThrowError(
      new ProductionConfigurationError("Mock API is not permitted in production"),
    );
  });

  it("rejects development authentication bypass in production", () => {
    expect(() =>
      assertProductionConfiguration({
        isProduction: true,
        devBypassAuth: "true",
      }),
    ).toThrowError(
      new ProductionConfigurationError(
        "Development authentication bypass is not permitted in production",
      ),
    );
  });

  it("uses the configured API base URL for real transport", () => {
    expect(
      getApiBaseUrl({
        PROD: true,
        VITE_API_BASE_URL: "https://driver-api.veyvio.example",
      }),
    ).toBe("https://driver-api.veyvio.example");
  });
});
