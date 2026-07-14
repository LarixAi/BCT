import { Capacitor } from "@capacitor/core";
import { driverFocusAudit } from "../driver-focus-audit";

export interface BackgroundLocationUpdate {
  dutyId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speedMps?: number | null;
  recordedAt: string;
}

export interface BackgroundLocationAdapter {
  readonly supported: boolean;
  onUpdate(callback: (update: BackgroundLocationUpdate) => void): () => void;
  start(dutyId: string): Promise<void>;
  stop(): Promise<void>;
  isTracking(): boolean;
}

class WebBackgroundLocationAdapter implements BackgroundLocationAdapter {
  readonly supported = typeof navigator !== "undefined" && "geolocation" in navigator;
  private watchId: number | null = null;
  private dutyId: string | null = null;
  private listeners = new Set<(update: BackgroundLocationUpdate) => void>();

  onUpdate(callback: (update: BackgroundLocationUpdate) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  isTracking(): boolean {
    return this.watchId !== null;
  }

  async start(dutyId: string): Promise<void> {
    if (!this.supported || this.watchId !== null) return;
    this.dutyId = dutyId;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const update: BackgroundLocationUpdate = {
          dutyId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speedMps: position.coords.speed,
          recordedAt: new Date().toISOString(),
        };
        this.listeners.forEach((listener) => listener(update));
      },
      () => {
        driverFocusAudit.record("FOCUS_MODE_FAILED", "Location watch failed");
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );

    driverFocusAudit.record("BACKGROUND_LOCATION_STARTED", dutyId);
  }

  async stop(): Promise<void> {
    if (this.watchId === null) return;
    navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
    this.dutyId = null;
    driverFocusAudit.record("BACKGROUND_LOCATION_STOPPED");
  }
}

class NativeBackgroundLocationAdapter implements BackgroundLocationAdapter {
  readonly supported = true;
  private dutyId: string | null = null;
  private watchId: string | null = null;
  private listeners = new Set<(update: BackgroundLocationUpdate) => void>();

  onUpdate(callback: (update: BackgroundLocationUpdate) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  isTracking(): boolean {
    return this.watchId !== null;
  }

  async start(dutyId: string): Promise<void> {
    if (this.watchId) return;
    const { Geolocation } = await import("@capacitor/geolocation");
    const permission = await Geolocation.requestPermissions();
    if (permission.location !== "granted" && permission.coarseLocation !== "granted") {
      throw new Error("Background location permission denied");
    }

    this.dutyId = dutyId;
    this.watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 10_000 },
      (position, err) => {
        if (err || !position) return;
        const update: BackgroundLocationUpdate = {
          dutyId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speedMps: position.coords.speed,
          recordedAt: new Date(position.timestamp).toISOString(),
        };
        this.listeners.forEach((listener) => listener(update));
      },
    );

    driverFocusAudit.record("BACKGROUND_LOCATION_STARTED", dutyId);
  }

  async stop(): Promise<void> {
    if (!this.watchId) return;
    const { Geolocation } = await import("@capacitor/geolocation");
    await Geolocation.clearWatch({ id: this.watchId });
    this.watchId = null;
    this.dutyId = null;
    driverFocusAudit.record("BACKGROUND_LOCATION_STOPPED");
  }
}

export function createBackgroundLocationAdapter(): BackgroundLocationAdapter {
  if (Capacitor.isNativePlatform()) return new NativeBackgroundLocationAdapter();
  return new WebBackgroundLocationAdapter();
}
