import { isOnline } from "@/platform/device/connectivity";

export interface CheckSubmissionMeta {
  durationSeconds: number;
  deviceLabel?: string;
  offlineSubmission: boolean;
}

export function captureCheckSubmissionMeta(startedAt: string): CheckSubmissionMeta {
  const started = new Date(startedAt).getTime();
  const durationSeconds = Number.isFinite(started)
    ? Math.max(0, Math.round((Date.now() - started) / 1000))
    : 0;

  let deviceLabel: string | undefined;
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent;
    deviceLabel = /iPhone|iPad|Android/i.test(ua) ? "Mobile" : "Desktop";
    if (navigator.platform) deviceLabel += ` · ${navigator.platform}`;
  }

  return {
    durationSeconds,
    deviceLabel,
    offlineSubmission: !isOnline(),
  };
}

export function formatCheckDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
