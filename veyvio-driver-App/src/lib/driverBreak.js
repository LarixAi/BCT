const storageKey = (driverId) => `driver_on_break_${driverId}`;

export function readDriverBreak(driverId) {
  try {
    return localStorage.getItem(storageKey(driverId)) === "1";
  } catch {
    return false;
  }
}

export function writeDriverBreak(driverId, onBreak) {
  try {
    if (onBreak) localStorage.setItem(storageKey(driverId), "1");
    else localStorage.removeItem(storageKey(driverId));
  } catch {
    /* ignore */
  }
}
