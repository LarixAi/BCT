import { isCapacitorNativeApp } from "@core-support/brand";

/** True when running inside the Veyvio Driver Capacitor shell. */
export function isDriverNativeApp() {
  return isCapacitorNativeApp();
}
