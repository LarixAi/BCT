import { getSupabaseClient } from "@/lib/supabase/client";

async function getAuthenticatedUserId(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Write a driver-portal action to fleet_audit_logs. */
export async function logDriverAudit(payload) {
  const supabase = getSupabaseClient();
  const actorUserId = await getAuthenticatedUserId(supabase);
  if (!actorUserId) return;

  const { error } = await supabase.from("fleet_audit_logs").insert({
    actor_portal: "driver",
    actor_user_id: actorUserId,
    ...payload,
  });
  if (error) console.warn("fleet_audit_logs insert failed:", error.message);
}
