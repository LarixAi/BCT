export function clearPersistedSession(): void {
  localStorage.removeItem("veyvio-driver-session-v1");
}
