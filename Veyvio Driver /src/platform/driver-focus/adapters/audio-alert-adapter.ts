import { Capacitor } from "@capacitor/core";
import type { AudioAlertAdapter } from "./stub-adapters";

export interface AudioAlertOptions {
  audioEnabled: boolean;
  vibrationEnabled: boolean;
}

class WebAudioAlertAdapter implements AudioAlertAdapter {
  readonly supported =
    typeof window !== "undefined" &&
    ("speechSynthesis" in window || "vibrate" in navigator);

  constructor(private options: () => AudioAlertOptions) {}

  async playInstruction(text?: string): Promise<void> {
    const message = text ?? "Continue on current route";
    await this.speak(message);
    this.vibrate([120, 60, 120]);
  }

  async playOperationalAlert(text?: string): Promise<void> {
    const message = text ?? "Operational alert";
    await this.speak(message);
    this.vibrate([200, 100, 200, 100, 200]);
  }

  private async speak(message: string): Promise<void> {
    const { audioEnabled } = this.options();
    if (!audioEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = "en-GB";
    window.speechSynthesis.speak(utterance);
  }

  private vibrate(pattern: number[]): void {
    const { vibrationEnabled } = this.options();
    if (!vibrationEnabled || typeof navigator === "undefined" || !navigator.vibrate) return;
    navigator.vibrate(pattern);
  }
}

class NativeAudioAlertAdapter extends WebAudioAlertAdapter {
  readonly supported = true;
}

export function createAudioAlertAdapter(options: () => AudioAlertOptions): AudioAlertAdapter {
  if (Capacitor.isNativePlatform()) return new NativeAudioAlertAdapter(options);
  return new WebAudioAlertAdapter(options);
}
