import { expect, type Page } from "@playwright/test";

type PilotSession = {
  supabaseUrl: string;
  anonKey: string;
  accessToken: string;
  refreshToken: string;
  email: string;
};

function resolvePilotEnv(): PilotSession | null {
  const email = process.env.VEYVIO_PILOT_EMAIL ?? "";
  const password = process.env.VEYVIO_PILOT_PASSWORD ?? "";
  const anonKey = process.env.VEYVIO_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
  const apiUrl =
    process.env.VEYVIO_API_URL ??
    process.env.VITE_COMMAND_API_BASE_URL ??
    process.env.VITE_API_URL ??
    "";
  const supabaseUrl =
    process.env.VEYVIO_SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    apiUrl.replace(/\/functions\/v1\/command-api\/?$/, "");

  if (!email || !password || !anonKey || !supabaseUrl) return null;
  return { supabaseUrl, anonKey, accessToken: "", refreshToken: "", email };
}

export async function establishPilotSession(page: Page): Promise<PilotSession> {
  const env = resolvePilotEnv();
  if (!env) {
    throw new Error("Missing VEYVIO_PILOT_EMAIL, VEYVIO_PILOT_PASSWORD, VEYVIO_ANON_KEY, or Supabase URL.");
  }

  const password = process.env.VEYVIO_PILOT_PASSWORD ?? "";
  const signIn = await fetch(`${env.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: env.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: env.email, password }),
  });

  if (!signIn.ok) {
    throw new Error(`Pilot sign-in failed: HTTP ${signIn.status}`);
  }

  const session = await signIn.json();
  env.accessToken = session.access_token;
  env.refreshToken = session.refresh_token;

  const projectRef = new URL(env.supabaseUrl).hostname.split(".")[0];
  const storageKey = `sb-${projectRef}-auth-token`;

  await page.goto("/");
  await page.evaluate(
    ({ storageKey, sessionPayload }) => {
      const expiresAt = Math.floor(Date.now() / 1000) + (sessionPayload.expires_in ?? 3600);
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          access_token: sessionPayload.access_token,
          refresh_token: sessionPayload.refresh_token,
          expires_at: expiresAt,
          expires_in: sessionPayload.expires_in ?? 3600,
          token_type: sessionPayload.token_type ?? "bearer",
          user: sessionPayload.user,
        }),
      );
    },
    { storageKey, sessionPayload: session },
  );

  await page.reload();
  await waitForOperationalShell(page);
  return env;
}

export async function waitForOperationalShell(page: Page) {
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByText("Home", { exact: true })).toBeVisible({ timeout: 60_000 });
  return nav;
}

export function hasPilotCredentials() {
  return resolvePilotEnv() !== null;
}
