import { Capacitor } from "@capacitor/core";
import type { DeviceInfo } from "@/types/security";

const APP_VERSION = "0.1.0";

function detectBrowser(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  const ua = navigator.userAgent;
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  return "Browser";
}

function detectPlatformLabel(): { platform: string; osVersion: string } {
  if (typeof navigator === "undefined") {
    return { platform: "Unknown", osVersion: "—" };
  }

  const ua = navigator.userAgent;
  if (Capacitor.isNativePlatform()) {
    if (ua.includes("Android")) {
      const match = ua.match(/Android (\d+(\.\d+)?)/);
      return { platform: "Android", osVersion: match?.[1] ?? "—" };
    }
    if (ua.includes("iPhone") || ua.includes("iPad")) {
      const match = ua.match(/OS (\d+[_\d]*)/);
      return {
        platform: ua.includes("iPad") ? "iPadOS" : "iOS",
        osVersion: match?.[1]?.replace(/_/g, ".") ?? "—",
      };
    }
    return { platform: Capacitor.getPlatform(), osVersion: "—" };
  }

  if (ua.includes("Android")) return { platform: "Android (web)", osVersion: "—" };
  if (ua.includes("iPhone")) return { platform: "iOS (web)", osVersion: "—" };
  if (ua.includes("Mac")) return { platform: "macOS", osVersion: "—" };
  if (ua.includes("Windows")) return { platform: "Windows", osVersion: "—" };
  return { platform: "Web", osVersion: "—" };
}

function detectDeviceName(platform: string): string {
  if (Capacitor.isNativePlatform()) {
    if (platform.startsWith("Android")) return "This Android phone";
    if (platform.startsWith("iOS") || platform.startsWith("iPadOS")) return "This iPhone";
    return "This device";
  }
  return "This browser";
}

export function buildCurrentDeviceInfo(deviceId: string): DeviceInfo {
  const { platform, osVersion } = detectPlatformLabel();
  return {
    id: deviceId,
    name: detectDeviceName(platform),
    platform,
    osVersion,
    appVersion: APP_VERSION,
    browser: Capacitor.isNativePlatform() ? undefined : detectBrowser(),
  };
}

export function ensureDeviceId(existing?: string | null): string {
  if (existing) return existing;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `dev_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `dev_${Math.random().toString(36).slice(2, 10)}`;
}
