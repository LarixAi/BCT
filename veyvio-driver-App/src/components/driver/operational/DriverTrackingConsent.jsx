import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { saveTrackingConsent } from "@/services/fleet-behaviour.service";

const DEFAULT_TEXT =
  "Location and driving behaviour data is collected only during active duty sessions for safety, dispatch, and compliance. Data is retained per your operator policy.";

export default function DriverTrackingConsent({ driver, disclosureText, onAccepted, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    setBusy(true);
    setError("");
    const platform = Capacitor.getPlatform() === "ios" ? "ios" : Capacitor.isNativePlatform() ? "android" : "web";
    const result = await saveTrackingConsent(driver, { platform });
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Could not save consent");
      return;
    }
    onAccepted?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-lg">
        <h2 className="text-lg font-bold">Duty tracking consent</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          {disclosureText || DEFAULT_TEXT}
        </p>
        <p className="text-xs text-muted-foreground mt-3">
          GPS runs only while you are signed on. You can sign off at any time to stop tracking.
        </p>
        {error ? <p className="text-sm text-red-600 mt-2">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => onCancel?.()}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={busy} onClick={() => void accept()}>
            I agree
          </Button>
        </div>
      </div>
    </div>
  );
}
