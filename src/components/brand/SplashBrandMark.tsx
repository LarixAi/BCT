import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { BrandTagline } from "@/components/brand/BrandTagline";
import { cn } from "@/lib/utils";

type SplashBrandMarkProps = {
  className?: string;
  status?: string;
  version?: string;
};

export function SplashBrandMark({ className, status, version = "0.1.0" }: SplashBrandMarkProps) {
  return (
    <div className={cn("relative flex flex-col items-center text-center text-white", className)}>
      <div className="relative mb-4 h-0.5 w-12 rounded-full bg-primary" aria-hidden />
      <BrandWordmark size="splash" className="relative" />
      <BrandTagline variant="splash" className="relative mt-6 font-marketing text-base text-white/85" />
      {status && (
        <p className="relative mt-10 flex items-center gap-2 text-xs text-white/70">
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          {status}
        </p>
      )}
      {version && <p className="sr-only">v{version}</p>}
    </div>
  );
}

/** Midnight public chrome — welcome, auth, tenancy, sync. */
export function BrandPublicHeader({ className }: { className?: string }) {
  return (
    <header className={cn("relative border-b border-white/10 bg-accent px-4 py-3 pt-safe text-white", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-primary" aria-hidden />
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <BrandWordmark size="header" className="shrink-0" />
        <div className="h-5 w-px shrink-0 bg-white/12" aria-hidden />
        <BrandTagline variant="chrome" />
      </div>
    </header>
  );
}
