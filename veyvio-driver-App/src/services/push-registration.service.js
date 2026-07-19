import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { getSupabaseClient } from "@/lib/supabase/client";

const APP_VERSION = "1.0.0";

/**
 * Push requires google-services.json in android/app/ at build time.
 * Without it, PushNotifications.register() crashes the native app (Firebase not initialized).
 * Set VITE_ENABLE_PUSH=true in .env.local only after adding that file and rebuilding.
 */
export function isPushAvailable() {
  if (!Capacitor.isNativePlatform()) return false;
  return import.meta.env.VITE_ENABLE_PUSH === "true";
}

async function ensureAndroidChannel() {
  if (!isPushAvailable() || Capacitor.getPlatform() !== "android") return;
  try {
    await PushNotifications.createChannel({
      id: "driver_alerts",
      name: "Driver alerts",
      description: "Job, message and compliance alerts — shown on lock screen",
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      sound: "default",
    });
  } catch (err) {
    console.warn("Push channel setup failed:", err);
  }
}

export async function savePushToken({ token, driverId, userId, organisationId, deviceName }) {
  const supabase = getSupabaseClient();
  const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";

  const { error } = await supabase.from("driver_devices").upsert(
    {
      organisation_id: organisationId,
      driver_id: driverId,
      user_id: userId,
      platform,
      push_token: token,
      device_name: deviceName ?? null,
      app_version: APP_VERSION,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "driver_id,push_token" },
  );

  if (error) throw new Error(error.message);
}

export async function touchPushTokenLastSeen(driverId, token) {
  if (!driverId || !token) return;
  const supabase = getSupabaseClient();
  await supabase
    .from("driver_devices")
    .update({ last_seen_at: new Date().toISOString(), is_active: true })
    .eq("driver_id", driverId)
    .eq("push_token", token);
}

/** Browser session heartbeat so yard can show drivers as online without native push. */
export async function touchDriverWebPresence({ driverId, userId, organisationId }) {
  if (!driverId || !userId || !organisationId) return;
  const supabase = getSupabaseClient();
  const pushToken = `web-session:${userId}`;
  await supabase.from("driver_devices").upsert(
    {
      organisation_id: organisationId,
      driver_id: driverId,
      user_id: userId,
      platform: "web",
      push_token: pushToken,
      device_name: "Browser",
      app_version: APP_VERSION,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "driver_id,push_token" },
  );
}

export async function registerForPushNotifications({ driverId, userId, organisationId }) {
  if (!isPushAvailable()) {
    return { ok: false, reason: "not_configured" };
  }

  await ensureAndroidChannel();

  const perm = await PushNotifications.checkPermissions();
  let status = perm.receive;
  if (status === "prompt" || status === "prompt-with-rationale") {
    const req = await PushNotifications.requestPermissions();
    status = req.receive;
  }

  if (status !== "granted") {
    return { ok: false, reason: "denied" };
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    PushNotifications.addListener("registration", async (tokenEvent) => {
      try {
        await savePushToken({
          token: tokenEvent.value,
          driverId,
          userId,
          organisationId,
          deviceName: Capacitor.getPlatform(),
        });
        finish({ ok: true, token: tokenEvent.value });
      } catch (err) {
        finish({ ok: false, reason: err.message ?? "save_failed" });
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.warn("Push registration error:", err);
      finish({ ok: false, reason: "registration_error" });
    });

    void PushNotifications.register();

    setTimeout(() => finish({ ok: false, reason: "timeout" }), 15000);
  });
}

export async function getPushPermissionStatus() {
  if (!Capacitor.isNativePlatform()) return "unsupported";
  if (!isPushAvailable()) return "not_configured";
  try {
    const perm = await PushNotifications.checkPermissions();
    return perm.receive;
  } catch {
    return "not_configured";
  }
}
