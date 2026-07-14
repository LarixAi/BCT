export interface KeepAwakeAdapter {
  readonly supported: boolean;
  enable(): Promise<void>;
  disable(): Promise<void>;
  isEnabled(): boolean;
}

class WebKeepAwakeAdapter implements KeepAwakeAdapter {
  private wakeLock: WakeLockSentinel | null = null;
  readonly supported = typeof navigator !== "undefined" && "wakeLock" in navigator;

  isEnabled(): boolean {
    return this.wakeLock !== null && !this.wakeLock.released;
  }

  async enable(): Promise<void> {
    if (!this.supported || this.isEnabled()) return;
    try {
      this.wakeLock = await navigator.wakeLock.request("screen");
      this.wakeLock.addEventListener("release", () => {
        this.wakeLock = null;
      });
    } catch {
      this.wakeLock = null;
      throw new Error("Screen Wake Lock unavailable");
    }
  }

  async disable(): Promise<void> {
    if (!this.wakeLock) return;
    try {
      await this.wakeLock.release();
    } finally {
      this.wakeLock = null;
    }
  }
}

class NativeKeepAwakeAdapter implements KeepAwakeAdapter {
  readonly supported = true;
  private enabled = false;

  isEnabled(): boolean {
    return this.enabled;
  }

  async enable(): Promise<void> {
    const { KeepAwake } = await import("@capacitor-community/keep-awake");
    await KeepAwake.keepAwake();
    this.enabled = true;
  }

  async disable(): Promise<void> {
    const { KeepAwake } = await import("@capacitor-community/keep-awake");
    await KeepAwake.allowSleep();
    this.enabled = false;
  }
}

export function createKeepAwakeAdapter(isNative: boolean): KeepAwakeAdapter {
  if (isNative) return new NativeKeepAwakeAdapter();
  return new WebKeepAwakeAdapter();
}
