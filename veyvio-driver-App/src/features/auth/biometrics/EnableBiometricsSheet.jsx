import { Fingerprint, ScanFace } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { op } from "@/lib/driver-operational-theme";

/**
 * Progressive biometric opt-in sheet.
 * Biometrics never leave the device — Veyvio only receives success/failure.
 */
export default function EnableBiometricsSheet({
  open,
  onOpenChange,
  label = "Face ID",
  busy = false,
  error = "",
  successLabel = "",
  onEnable,
  onRemindNextWeek,
  onDontAskAgain,
}) {
  const isFace = /face/i.test(label);
  const Icon = isFace ? ScanFace : Fingerprint;
  const done = Boolean(successLabel);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="mx-auto max-w-lg border-border pb-[max(1rem,env(safe-area-inset-bottom))]">
        <DrawerHeader className="text-left">
          <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${op.iconWrap}`}>
            <Icon className={`h-6 w-6 ${op.iconTeal}`} aria-hidden />
          </div>
          <DrawerTitle className="text-xl">
            {done ? `${successLabel} is on` : "You're ready to go"}
          </DrawerTitle>
          <DrawerDescription className="text-[15px] leading-relaxed text-muted-foreground">
            {done
              ? `Next time you open the app after signing out, you can continue with ${successLabel} on the sign-in screen. Manage this any time under More → Security.`
              : `Set up faster sign-in with ${label}, fingerprint or your device screen lock. Your biometric information stays on this device. Veyvio never receives or stores it.`}
          </DrawerDescription>
        </DrawerHeader>

        {error ? (
          <p className="mx-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {error}
          </p>
        ) : null}

        {done ? null : (
          <DrawerFooter className="gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onEnable?.()}
              className={`flex min-h-[48px] w-full items-center justify-center rounded-full font-semibold ${op.primaryBtn} disabled:opacity-60`}
            >
              {busy ? "Setting up…" : "Set up biometric or device sign-in"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemindNextWeek?.()}
              className="flex min-h-[48px] w-full items-center justify-center rounded-full border border-border bg-card font-semibold text-foreground active:bg-muted/60 disabled:opacity-60"
            >
              Remind me next week
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDontAskAgain?.()}
              className="flex min-h-[44px] w-full items-center justify-center py-2 text-sm font-medium text-muted-foreground disabled:opacity-60"
            >
              Don&apos;t ask again
            </button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
