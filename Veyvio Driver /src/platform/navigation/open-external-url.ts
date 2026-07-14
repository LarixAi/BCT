import { Capacitor } from "@capacitor/core";

export function openExternalUrl(url: string): void {
  if (Capacitor.isNativePlatform()) {
    window.open(url, "_blank");
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
