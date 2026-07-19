import { cn } from "@/lib/utils";

/** Driver auth wordmark — matches Veyvio logo typography. */
export function DriverAuthBrandHero({ showPlatformHint = false, className = "" }) {
  return (
    <div className={cn("driver-auth-brand-hero", className)}>
      <p className="driver-auth-brand">
        <span className="font-display text-[1.65rem] font-bold leading-none tracking-[-0.04em] text-[#0B0E14]">
          Veyvio
        </span>
        <span className="ml-2 font-display text-sm font-semibold tracking-[0.04em] text-[#5B8C9B]">Driver</span>
      </p>
      <p className="driver-auth-slogan">Move smarter. Operate safer.</p>
      {showPlatformHint ? (
        <p className="driver-auth-platform-hint">
          Jobs, compliance and duty — one driver app.
        </p>
      ) : null}
    </div>
  );
}
