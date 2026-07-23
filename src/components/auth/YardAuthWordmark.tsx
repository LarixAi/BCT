import { cn } from "@/lib/utils";

type YardAuthBrandHeroProps = {
  showPlatformHint?: boolean;
  className?: string;
};

/** Yard auth wordmark — matches Driver auth typography with Yard accent. */
export function YardAuthBrandHero({ showPlatformHint = false, className }: YardAuthBrandHeroProps) {
  return (
    <div className={cn("yard-auth-brand-hero", className)}>
      <p className="yard-auth-brand">
        <span className="font-display text-[1.65rem] font-bold leading-none tracking-[-0.04em] text-[#0B0E14]">
          Veyvio
        </span>
        <span className="ml-2 font-display text-sm font-semibold tracking-[0.04em] text-[#12A89D]">Yard</span>
      </p>
      <p className="yard-auth-slogan">Move smarter. Operate safer.</p>
      {showPlatformHint ? (
        <p className="yard-auth-platform-hint">
          Yard checks, movements and VOR — one depot app.
        </p>
      ) : null}
    </div>
  );
}
