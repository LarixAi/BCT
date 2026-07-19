const ENABLED_KEY = "driver_floating_bubble_enabled";
const PROMPT_SEEN_KEY = "driver_floating_bubble_prompt_seen";

export function isFloatingBubbleEnabled() {
  try {
    const raw = localStorage.getItem(ENABLED_KEY);
    if (raw == null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

export function setFloatingBubbleEnabled(enabled) {
  try {
    localStorage.setItem(ENABLED_KEY, enabled ? "true" : "false");
  } catch {
    /* ignore */
  }
}

export function hasSeenFloatingBubblePrompt() {
  try {
    return localStorage.getItem(PROMPT_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

export function markFloatingBubblePromptSeen() {
  try {
    localStorage.setItem(PROMPT_SEEN_KEY, "true");
  } catch {
    /* ignore */
  }
}
