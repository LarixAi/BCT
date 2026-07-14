import { WebPlugin } from "@capacitor/core";
import type { LiveActivityPayload, TripOverlayPlugin } from "./trip-overlay-plugin";

export class TripOverlayWeb extends WebPlugin implements TripOverlayPlugin {
  async isPictureInPictureSupported(): Promise<{ supported: boolean }> {
    return { supported: false };
  }

  async enterPictureInPicture(): Promise<void> {
    // Web uses the in-app floating overlay instead of OS PiP.
  }

  async exitPictureInPicture(): Promise<void> {}

  async isInPictureInPicture(): Promise<{ active: boolean }> {
    return { active: false };
  }

  async updateLiveActivity(_options: LiveActivityPayload): Promise<{ supported: boolean }> {
    return { supported: false };
  }

  async endLiveActivity(): Promise<void> {}
}
