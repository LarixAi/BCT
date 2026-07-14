import { Capacitor } from "@capacitor/core";
import type {
  DriverFocusCapabilities,
  DriverFocusContext,
  DriverFocusEvent,
  DriverFocusRuntimeState,
  DriverFocusSettings,
} from "@/types/driver-focus";
import { createKeepAwakeAdapter, type KeepAwakeAdapter } from "./adapters/keep-awake-adapter";
import {
  createAudioAlertAdapter,
  createBackgroundLocationAdapter,
  createTripNotificationAdapter,
  createTripOverlayAdapter,
  type AudioAlertAdapter,
  type BackgroundLocationAdapter,
  type TripNotificationAdapter,
  type TripOverlayAdapter,
} from "./adapters/stub-adapters";
import { persistActiveTripSnapshot, removeActiveTripSnapshot } from "./active-trip-snapshot";
import { driverFocusAudit } from "./driver-focus-audit";
import { useTripOverlayStore } from "@/store/trip-overlay";
import { useDriverFocusStore } from "@/store/driver-focus";
import { useVehicleMotionStore } from "@/store/vehicle-motion";
import type { BackgroundLocationUpdate } from "./adapters/background-location-adapter";
import {
  resolveDriverFocusPhase,
  shouldKeepScreenAwake,
  shouldPlayOperationalAlerts,
  shouldShowTripNotification,
  shouldShowTripOverlay,
  shouldTrackLocationInBackground,
} from "./focus-controls";

type Listener = (state: DriverFocusRuntimeState) => void;
type LocationListener = (update: BackgroundLocationUpdate) => void;

function detectPlatform(): DriverFocusContext["platform"] {
  const platform = Capacitor.getPlatform();
  if (platform === "ios") return "ios";
  if (platform === "android") return "android";
  return "web";
}

export class DriverFocusCoordinator {
  private keepAwake: KeepAwakeAdapter;
  private tripOverlay: TripOverlayAdapter;
  private tripNotification: TripNotificationAdapter;
  private backgroundLocation: BackgroundLocationAdapter;
  private audioAlerts: AudioAlertAdapter;
  private listeners = new Set<Listener>();
  private locationListeners = new Set<LocationListener>();
  private lastSpokenInstruction = "";
  private lastLocation: { latitude: number; longitude: number } | null = null;
  private lastDutyId: string | null = null;
  private overlayDutyId: string | null = null;
  private locationUnsubscribe: (() => void) | null = null;
  private runtime: DriverFocusRuntimeState = {
    phase: "off",
    workflow: "idle",
    keepScreenAwake: false,
    showTripOverlay: false,
    trackLocationInBackground: false,
    playOperationalAlerts: false,
    vehicleMoving: false,
    speedKmh: null,
  };

  constructor() {
    const isNative = Capacitor.isNativePlatform();
    const platform = detectPlatform();
    this.keepAwake = createKeepAwakeAdapter(isNative);
    this.tripOverlay = createTripOverlayAdapter(platform);
    this.tripNotification = createTripNotificationAdapter();
    this.backgroundLocation = createBackgroundLocationAdapter();
    this.audioAlerts = createAudioAlertAdapter(() => {
      const settings = useDriverFocusStore.getState().settings;
      return {
        audioEnabled: settings.audioAlerts,
        vibrationEnabled: settings.vibrationAlerts,
      };
    });
    this.locationUnsubscribe = this.backgroundLocation.onUpdate((update) => {
      this.lastLocation = { latitude: update.latitude, longitude: update.longitude };
      this.locationListeners.forEach((listener) => listener(update));
    });
  }

  getCapabilities(): DriverFocusCapabilities {
    return {
      keepAwakeSupported: this.keepAwake.supported,
      androidPipSupported: this.tripOverlay.platform === "android" && this.tripOverlay.supported,
      iosLiveActivitySupported: this.tripOverlay.platform === "ios" && this.tripOverlay.supported,
      backgroundLocationSupported: this.backgroundLocation.supported,
      notificationsEnabled: this.tripNotification.supported,
    };
  }

  getRuntimeState(): DriverFocusRuntimeState {
    return this.runtime;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.runtime);
    return () => this.listeners.delete(listener);
  }

  onLocationUpdate(listener: LocationListener): () => void {
    this.locationListeners.add(listener);
    return () => this.locationListeners.delete(listener);
  }

  async speakInstruction(text: string): Promise<void> {
    await this.audioAlerts.playInstruction(text);
  }

  publish(_event: DriverFocusEvent): void {
    // Events are handled by re-evaluating context from stores in the provider.
  }

  async evaluate(ctx: DriverFocusContext): Promise<DriverFocusRuntimeState> {
    const phase = resolveDriverFocusPhase(ctx);
    const keepScreenAwake = shouldKeepScreenAwake(ctx);
    const showTripOverlay = shouldShowTripOverlay(ctx);
    const showTripNotification = shouldShowTripNotification(ctx);
    const trackLocationInBackground = shouldTrackLocationInBackground(ctx);
    const playOperationalAlerts = shouldPlayOperationalAlerts(ctx);
    const motion = useVehicleMotionStore.getState();

    const next: DriverFocusRuntimeState = {
      ...this.runtime,
      phase,
      workflow: ctx.workflow,
      keepScreenAwake,
      showTripOverlay,
      trackLocationInBackground,
      playOperationalAlerts,
      vehicleMoving: motion.vehicleMoving,
      speedKmh: motion.speedKmh,
      lastError: undefined,
    };

    try {
      this.lastDutyId = ctx.activeDutyId;
      if (this.overlayDutyId && ctx.activeDutyId && this.overlayDutyId !== ctx.activeDutyId) {
        await this.revokeOverlayForDuty(this.overlayDutyId);
      }
      await this.syncKeepAwake(keepScreenAwake);
      await this.syncBackgroundLocation(ctx, trackLocationInBackground);
      await this.syncTripPresentation(ctx, showTripOverlay, showTripNotification);
      await this.syncOperationalAlerts(ctx, playOperationalAlerts);
      await this.persistSnapshot(ctx);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Driver Focus Mode failed";
      next.lastError = message;
      driverFocusAudit.record("FOCUS_MODE_FAILED", message);
    }

    this.runtime = next;
    this.listeners.forEach((listener) => listener(next));
    return next;
  }

  async shutdown(reason: DriverFocusEvent): Promise<void> {
    if (this.overlayDutyId) {
      await this.revokeOverlayForDuty(this.overlayDutyId);
    }
    await this.syncKeepAwake(false);
    await this.tripOverlay.hide();
    await this.tripNotification.hide();
    await this.backgroundLocation.stop();

    if (this.lastDutyId) {
      await removeActiveTripSnapshot(this.lastDutyId);
      this.lastDutyId = null;
    }

    if (reason === "DRIVER_LOGGED_OUT" || reason === "DUTY_ENDED") {
      driverFocusAudit.record("DRIVER_FOCUS_DISABLED", reason);
    }

    this.runtime = {
      phase: "off",
      workflow: "idle",
      keepScreenAwake: false,
      showTripOverlay: false,
      trackLocationInBackground: false,
      playOperationalAlerts: false,
      vehicleMoving: false,
      speedKmh: null,
    };
    this.listeners.forEach((listener) => listener(this.runtime));
  }

  async onSettingsChanged(settings: DriverFocusSettings, previous: DriverFocusSettings): Promise<void> {
    if (settings.enabled && !previous.enabled) {
      driverFocusAudit.record("DRIVER_FOCUS_ENABLED");
    }
    if (!settings.enabled && previous.enabled) {
      driverFocusAudit.record("DRIVER_FOCUS_DISABLED");
      await this.shutdown("FOCUS_MODE_MANUALLY_DISABLED");
    }
  }

  setBatteryState(batteryPercent: number, isCharging: boolean): void {
    this.runtime = { ...this.runtime, batteryPercent, isCharging };
    this.listeners.forEach((listener) => listener(this.runtime));
  }

  dispose(): void {
    this.locationUnsubscribe?.();
    this.locationUnsubscribe = null;
  }

  private async syncKeepAwake(shouldEnable: boolean): Promise<void> {
    const isEnabled = this.keepAwake.isEnabled();
    if (shouldEnable && !isEnabled) {
      try {
        await this.keepAwake.enable();
        driverFocusAudit.record("KEEP_AWAKE_ENABLED");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Keep Awake failed";
        driverFocusAudit.record("KEEP_AWAKE_FAILED", message);
        throw error;
      }
      return;
    }

    if (!shouldEnable && isEnabled) {
      await this.keepAwake.disable();
      driverFocusAudit.record("KEEP_AWAKE_DISABLED");
    }
  }

  private async syncTripPresentation(
    ctx: DriverFocusContext,
    showOverlay: boolean,
    showNotification: boolean,
  ): Promise<void> {
    const payload = ctx.tripPresentation;
    if (!payload) {
      if (this.overlayDutyId) {
        await this.revokeOverlayForDuty(this.overlayDutyId);
      }
      await this.tripNotification.hide();
      return;
    }

    if (showOverlay && this.tripOverlay.supported) {
      await this.tripOverlay.prepare();
      await this.tripOverlay.show(payload);
      this.overlayDutyId = payload.dutyId;
    } else if (this.overlayDutyId) {
      await this.revokeOverlayForDuty(this.overlayDutyId);
    }

    const pipDenied = useTripOverlayStore.getState().pipDenied;
    const needsNotification = showNotification || (showOverlay && pipDenied);

    if (needsNotification) {
      await this.tripNotification.show(payload);
    } else {
      await this.tripNotification.hide();
    }
  }

  private async revokeOverlayForDuty(dutyId: string): Promise<void> {
    await this.tripOverlay.hide();
    this.overlayDutyId = null;
    await removeActiveTripSnapshot(dutyId);
  }

  private async syncBackgroundLocation(ctx: DriverFocusContext, shouldTrack: boolean): Promise<void> {
    if (!shouldTrack) {
      await this.backgroundLocation.stop();
      return;
    }
    if (ctx.activeDutyId) {
      await this.backgroundLocation.start(ctx.activeDutyId);
    }
  }

  private async persistSnapshot(ctx: DriverFocusContext): Promise<void> {
    if (!ctx.tripPresentation || !ctx.activeDutyId) return;
    if (ctx.tripCompleted || ctx.dutyLifecycleStatus === "completed") {
      await removeActiveTripSnapshot(ctx.activeDutyId);
      return;
    }

    await persistActiveTripSnapshot(ctx.tripPresentation, {
      workflow: ctx.workflow,
      dutyLifecycleStatus: ctx.dutyLifecycleStatus ?? "in_progress",
      latitude: this.lastLocation?.latitude,
      longitude: this.lastLocation?.longitude,
    });
  }

  private async syncOperationalAlerts(
    ctx: DriverFocusContext,
    shouldPlay: boolean,
  ): Promise<void> {
    if (!shouldPlay || !ctx.tripPresentation) return;

    const instructionKey = [
      ctx.tripPresentation.nextStopLabel,
      ctx.tripPresentation.etaLabel,
      ctx.tripPresentation.hasNewInstruction ? "new" : "",
    ].join("|");

    if (ctx.tripPresentation.hasNewInstruction && instructionKey !== this.lastSpokenInstruction) {
      const text = `Next stop ${ctx.tripPresentation.nextStopLabel}. ETA ${ctx.tripPresentation.etaLabel}.`;
      await this.audioAlerts.playInstruction(text);
      this.lastSpokenInstruction = instructionKey;
    }
  }
}

export const driverFocusCoordinator = new DriverFocusCoordinator();
