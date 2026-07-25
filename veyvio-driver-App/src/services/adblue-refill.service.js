import {
  commandGetDriverAdBlueRecords,
  commandPostDriverAdBlueRefill,
} from "@/lib/command-api";
import { getSupabaseClient } from "@/lib/supabase/client";

async function readAccessToken() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function loadAdBlueRecords(vehicleId) {
  const token = await readAccessToken();
  if (!token) return { ok: false, message: "Sign in again to load AdBlue history." };
  return commandGetDriverAdBlueRecords(token, vehicleId);
}

export async function submitAdBlueRefill(payload) {
  const token = await readAccessToken();
  if (!token) return { ok: false, message: "Sign in again to record AdBlue." };
  return commandPostDriverAdBlueRefill(token, payload);
}
