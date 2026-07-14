export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function getConnectionQuality(): "online" | "weak" | "offline" {
  if (!isOnline()) return "offline";
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  if (conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") return "weak";
  return "online";
}
