import type { AppLockTimeoutMinutes, SecurityEventType } from "@/types/security";
import {
  Fingerprint,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export function formatRelativeSecurityTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function appLockTimeoutLabel(minutes: AppLockTimeoutMinutes): string {
  if (minutes === 1) return "After 1 minute";
  return `After ${minutes} minutes`;
}

export function securityEventIcon(type: SecurityEventType): LucideIcon {
  switch (type) {
    case "sign_in":
      return LogIn;
    case "sign_out":
    case "device_signed_out":
      return LogOut;
    case "password_change":
    case "password_reset_requested":
      return KeyRound;
    case "biometric_enabled":
    case "biometric_disabled":
      return Fingerprint;
    case "app_lock_enabled":
    case "app_lock_disabled":
      return Lock;
    case "mfa_verified":
      return ShieldCheck;
    default:
      return Smartphone;
  }
}
