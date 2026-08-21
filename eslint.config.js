import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      "android/**",
      "**/node_modules/**",
      "Veyvio admin /**",
      "veyvio-driver-App/**",
      "packages/**",
      "shared/**",
      "e2e/**",
      "test-results/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
            {
              name: "@/data/mocks/bootstrap",
              message:
                "F-03: import BootstrapPayload / live normalize from @/platform/yard/bootstrap-payload. Mock builder stays under @/data/mocks/bootstrap.",
            },
            {
              name: "@/data/mocks/tenancy",
              message:
                "F-03: mock tenancy is for mock-auth / DEV bypass only. Live routes must use Command depot lists or dynamic import under isMockAuth.",
            },
            {
              name: "@/platform/api/mock-yard-api",
              message:
                "F-03: do not statically import mock-yard-api. Use getYardApi() (loads mock only when VITE_USE_MOCK_API=true).",
            },
            {
              name: "./mock-yard-api",
              message:
                "F-03: do not statically import ./mock-yard-api. Use await import() under VITE_USE_MOCK_API.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  eslintPluginPrettier,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // Avoid failing CI on historical Prettier churn in Yard source.
      "prettier/prettier": "off",
    },
  },
  {
    files: [
      "src/data/mocks/**/*.{ts,tsx}",
      "src/platform/api/mock-*.ts",
      "src/platform/api/index.ts",
      "src/platform/auth/auth-api.mock.ts",
      "src/platform/yard/dev-bypass-bootstrap.ts",
      "src/**/*.{test,spec}.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
);
