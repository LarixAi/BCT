import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import fs from "node:fs";
import path from "path";
import { assertProductionConfiguration } from "./src/platform/api/config";

const isMobileBuild = process.env.VITE_MOBILE_BUILD === "true";

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => {
        const value = match[2];
        const parsedValue =
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
            ? value.slice(1, -1)
            : value.replace(/\s*#.*$/, "").trim();
        return [match[1], parsedValue];
      }),
  );
}

function loadBuildEnvironment(mode: string): Record<string, string | undefined> {
  const fileEnvironment = [
    ".env",
    ".env.local",
    `.env.${mode}`,
    `.env.${mode}.local`,
  ].reduce(
    (environment, filename) => ({
      ...environment,
      ...parseEnvFile(path.join(__dirname, filename)),
    }),
    {} as Record<string, string>,
  );

  return { ...fileEnvironment, ...process.env };
}

function productionConfigurationGuard() {
  return {
    name: "veyvio-driver-production-configuration-guard",
    enforce: "pre" as const,
    config: (_: unknown, { command, mode }: { command: string; mode: string }) => {
      if (command !== "build") return;

      const env = loadBuildEnvironment(mode);
      assertProductionConfiguration({
        isProduction: true,
        useMockApi: env.VITE_USE_MOCK_API,
        devBypassAuth: env.VITE_DEV_BYPASS_AUTH,
      });
    },
  };
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    ...(isMobileBuild
      ? {
          spa: {
            enabled: true,
            prerender: { outputPath: "index.html" },
          },
        }
      : {}),
  },
  nitro: isMobileBuild ? false : undefined,
  vite: {
    plugins: [productionConfigurationGuard()],
    resolve: {
      alias: {
        "@veyvio/incidents": path.resolve(__dirname, "../shared/veyvio-incidents"),
        "@veyvio/ops": path.resolve(__dirname, "../shared/veyvio-ops"),
      },
    },
    ...(isMobileBuild
      ? {
          build: {
            outDir: "dist/client",
            emptyOutDir: true,
          },
        }
      : {}),
  },
});
