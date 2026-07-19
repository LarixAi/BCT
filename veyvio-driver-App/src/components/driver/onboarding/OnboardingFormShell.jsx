import { ArrowLeft } from "lucide-react";
import { APP_DISPLAY_NAME } from "@/lib/app-branding";
import { DRIVER_PAGE_SAFE_AREA } from "@/lib/driverSafeArea";
import { Button } from "@/components/ui/button";

export default function OnboardingFormShell({
  title,
  helper = "",
  children,
  onBack,
  primaryLabel = "Save and continue",
  onPrimary,
  primaryDisabled = false,
  primaryPending = false,
  secondaryLabel = "Back",
  onSecondary = undefined,
  error = "",
  footerNote = null,
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col" style={DRIVER_PAGE_SAFE_AREA}>
      <header className="shrink-0 border-b border-border bg-card px-4 pb-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-muted shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-[#1eaeae] font-semibold truncate">
              {APP_DISPLAY_NAME}
            </p>
            <h1 className="text-lg font-bold truncate text-foreground">{title}</h1>
          </div>
        </div>
        {helper ? <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{helper}</p> : null}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 bg-muted/30">
        <div className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-4">{children}</div>
        {error ? (
          <p className="text-sm text-red-700 mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2">{error}</p>
        ) : null}
      </div>

      <footer
        className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-4 space-y-2"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <Button
          className="w-full h-11 rounded-full bg-[#8ec63f] hover:bg-[#7ab535] text-white font-semibold"
          disabled={primaryDisabled || primaryPending}
          onClick={onPrimary}
        >
          {primaryPending ? "Saving…" : primaryLabel}
        </Button>
        {onSecondary ? (
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        ) : null}
        {footerNote ? <p className="text-center text-xs text-muted-foreground">{footerNote}</p> : null}
      </footer>
    </div>
  );
}
