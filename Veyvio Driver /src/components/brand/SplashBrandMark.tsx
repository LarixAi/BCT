import { BrandWordmarkGraphic } from "@/components/brand/BrandWordmarkGraphic";
import { BrandTagline } from "@/components/brand/BrandTagline";
import { cn } from "@/lib/utils";

export function SplashBrandMark({ status, version = "0.1.0" }: { status?: string; version?: string }) {
  return (
    <div className="relative flex flex-col items-center text-center text-white">
      <div
        className="pointer-events-none absolute -inset-x-16 -top-24 h-56 rounded-full bg-driver-blue/20 blur-3xl"
        aria-hidden
      />
      <div className="relative mb-4 h-0.5 w-12 rounded-full bg-link shadow-[0_0_20px_rgba(47,107,255,0.55)]" aria-hidden />
      <BrandWordmarkGraphic size="splash" className="relative" />
      <BrandTagline variant="splash" className="relative mt-6 text-base text-white/85" />
      {status && (
        <p className="relative mt-10 flex items-center gap-2 text-xs text-driver-sky/90">
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-driver-sky/40" />
            <span className="relative inline-flex size-2 rounded-full bg-driver-sky" />
          </span>
          {status}
        </p>
      )}
      {version && <p className="sr-only">v{version}</p>}
    </div>
  );
}

export function BrandPublicHeader({ className }: { className?: string }) {
  return (
    <header className={cn("relative border-b border-white/10 bg-accent px-4 py-3 pt-safe text-white", className)}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-driver-blue via-driver-sky to-transparent"
        aria-hidden
      />
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <BrandWordmarkGraphic size="header" className="shrink-0" />
        <div className="h-5 w-px shrink-0 bg-white/12" aria-hidden />
        <BrandTagline variant="chrome" />
      </div>
    </header>
  );
}
