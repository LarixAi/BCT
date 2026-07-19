import { localToday } from "@/lib/local-date";

const SELECTED_PREFIX = "csf_selected_vehicle:";

function todayKey() {
  return localToday();
}

export function selectedVehicleStorageKey(driverId) {
  return `${SELECTED_PREFIX}${driverId}:${todayKey()}`;
}

export function getSelectedVehicleId(driverId) {
  try {
    return localStorage.getItem(selectedVehicleStorageKey(driverId));
  } catch {
    return null;
  }
}

export function setSelectedVehicleId(driverId, vehicleId) {
  try {
    if (!vehicleId) {
      localStorage.removeItem(selectedVehicleStorageKey(driverId));
      return;
    }
    localStorage.setItem(selectedVehicleStorageKey(driverId), vehicleId);
  } catch {
    /* ignore */
  }
}
