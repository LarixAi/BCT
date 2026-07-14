const STORAGE_KEY = "veyvio-yard-session-v1";

export function loadPersistedSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function savePersistedSession(serialized: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Storage unavailable — session remains in-memory only.
  }
}

export function clearPersistedSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
