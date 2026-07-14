import { Capacitor } from "@capacitor/core";
import { driverFocusAudit } from "../driver-focus-audit";
import type { TripOverlayAdapter, TripOverlayPayload } from "./stub-adapters";
import {
  TripOverlayNative,
  toLiveActivityPayload,
} from "@/platform/native/plugins/trip-overlay-plugin";
import { useTripOverlayStore } from "@/store/trip-overlay";

abstract class BaseTripOverlayAdapter implements TripOverlayAdapter {
  abstract readonly platform: "android" | "ios" | "web";
  abstract readonly supported: boolean;
  protected prepared = false;
  private activeDutyId: string | null = null;

  async prepare(): Promise<void> {
    this.prepared = true;
  }

  async hide(): Promise<void> {
    if (this.activeDutyId) {
      driverFocusAudit.record("OVERLAY_PERMISSION_REVOKED", this.activeDutyId);
    }
    this.activeDutyId = null;
    useTripOverlayStore.getState().hide();
    await this.onHide();
  }

  async show(payload: TripOverlayPayload): Promise<void> {
    if (this.activeDutyId && this.activeDutyId !== payload.dutyId) {
      await this.hide();
    }
    this.activeDutyId = payload.dutyId;

    const store = useTripOverlayStore.getState();
    if (store.visible && store.dutyId === payload.dutyId) {
      store.update(payload);
    } else {
      store.show(this.overlayMode(), payload);
    }

    await this.onShow(payload);
  }

  protected abstract overlayMode(): "web_float" | "android_pip" | "ios_live_activity";
  protected abstract onShow(payload: TripOverlayPayload): Promise<void>;
  protected abstract onHide(): Promise<void>;
}

class WebTripOverlayAdapter extends BaseTripOverlayAdapter {
  readonly platform = "web" as const;
  readonly supported = true;

  protected overlayMode() {
    return "web_float" as const;
  }

  protected async onShow(_payload: TripOverlayPayload): Promise<void> {}
  protected async onHide(): Promise<void> {}
}

class AndroidTripOverlayAdapter extends BaseTripOverlayAdapter {
  readonly platform = "android" as const;
  readonly supported = true;

  protected overlayMode() {
    return "android_pip" as const;
  }

  protected async onShow(_payload: TripOverlayPayload): Promise<void> {
    try {
      const { supported } = await TripOverlayNative.isPictureInPictureSupported();
      if (!supported) {
        useTripOverlayStore.getState().setPipDenied(true);
        return;
      }
      await TripOverlayNative.enterPictureInPicture();
      useTripOverlayStore.getState().setPipDenied(false);
      driverFocusAudit.record("OVERLAY_PERMISSION_GRANTED", "android_pip");
    } catch {
      useTripOverlayStore.getState().setPipDenied(true);
      useTripOverlayStore.getState().hide();
    }
  }

  protected async onHide(): Promise<void> {
    try {
      await TripOverlayNative.exitPictureInPicture();
    } catch {
      // PiP may already be closed by the user.
    }
    useTripOverlayStore.getState().setPipDenied(false);
  }
}

class IosTripOverlayAdapter extends BaseTripOverlayAdapter {
  readonly platform = "ios" as const;
  readonly supported = true;

  protected overlayMode() {
    return "ios_live_activity" as const;
  }

  protected async onShow(payload: TripOverlayPayload): Promise<void> {
    const result = await TripOverlayNative.updateLiveActivity(toLiveActivityPayload(payload));
    if (!result.supported) {
      await this.showLockScreenFallback(payload);
      driverFocusAudit.record("OVERLAY_PERMISSION_GRANTED", "ios_notification_fallback");
    } else {
      driverFocusAudit.record("OVERLAY_PERMISSION_GRANTED", "ios_live_activity");
    }
  }

  protected async onHide(): Promise<void> {
    await TripOverlayNative.endLiveActivity();
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: 9002 }] });
  }

  private async showLockScreenFallback(payload: TripOverlayPayload): Promise<void> {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 9002,
          title: `Veyvio · ${payload.tripStateLabel}`,
          body: `Next: ${payload.nextStopLabel} · ${payload.etaLabel}`,
          extra: { dutyId: payload.dutyId, action: "open" },
          ongoing: true,
          autoCancel: false,
        },
      ],
    });
  }
}

export function createTripOverlayAdapter(platform: "android" | "ios" | "web"): TripOverlayAdapter {
  if (platform === "android" && Capacitor.isNativePlatform()) {
    return new AndroidTripOverlayAdapter();
  }
  if (platform === "ios" && Capacitor.isNativePlatform()) {
    return new IosTripOverlayAdapter();
  }
  return new WebTripOverlayAdapter();
}
