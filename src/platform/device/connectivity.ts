export type ConnectionQuality = "online" | "weak" | "offline";

export function getConnectionQuality(): ConnectionQuality {
  if (typeof navigator === "undefined") return "online";
  if (!navigator.onLine) return "offline";
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  if (conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g") return "weak";
  return "online";
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}
