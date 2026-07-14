import { useCallback, useSyncExternalStore } from "react";

const dismissed = new Map<string, string>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  for (const listener of listeners) listener();
}

export function dismissBanner(key: string, fingerprint: string) {
  dismissed.set(key, fingerprint);
  emit();
}

export function clearBannerDismissal(key: string) {
  dismissed.delete(key);
  emit();
}

export function useBannerDismissal(key: string, fingerprint: string) {
  const dismissedFingerprint = useSyncExternalStore(
    subscribe,
    () => dismissed.get(key),
    () => dismissed.get(key),
  );

  const isDismissed = dismissedFingerprint === fingerprint;

  const dismiss = useCallback(() => {
    dismissBanner(key, fingerprint);
  }, [key, fingerprint]);

  return { isDismissed, dismiss };
}
