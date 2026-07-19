const KEY = "driver_navigation_voice_v1";

export function isNavigationVoiceEnabled() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export function setNavigationVoiceEnabled(enabled) {
  try {
    localStorage.setItem(KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function toggleNavigationVoiceEnabled() {
  const next = !isNavigationVoiceEnabled();
  setNavigationVoiceEnabled(next);
  return next;
}
