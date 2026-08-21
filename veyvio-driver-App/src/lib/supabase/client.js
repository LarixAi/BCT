import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import {
  custodyMode,
  driverAuthSessionStorage,
  isNativeDriverAuthCustody,
  clearDriverAuthSessionStorage,
} from "./auth-session-storage";

let client = null;

/**
 * Wave 3E-2: native platforms persist Supabase auth in OS secure storage.
 * Browser/dev continues to use localStorage via the same adapter (explicit fallback).
 */
export function getSupabaseClient() {
  if (!client) {
    client = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        storage: driverAuthSessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: !isNativeDriverAuthCustody(),
      },
    });
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info(`[veyvio-driver] auth custody mode: ${custodyMode()}`);
    }
  }
  return client;
}

/** Used by sign-out paths that must wipe persisted credentials without server revoke. */
export async function clearPersistedSupabaseAuth(supabase = client) {
  const storageKey = supabase?.auth?.storageKey;
  await clearDriverAuthSessionStorage(storageKey);
}
