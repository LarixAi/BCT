import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { cn } from "@/lib/utils";

type SplashBrandMarkProps = {
  className?: string;
  status?: string;
  version?: string;
};

export function SplashBrandMark({ className, status, version = "0.1.0" }: SplashBrandMarkProps) {
  return (
    <div className={cn("flex flex-col items-center text-center text-white", className)}>
      <BrandWordmark size="splash" />
      <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/75">
        Every vehicle. Ready and accounted for.
      </p>
      {status && <p className="mt-6 text-xs text-white/55">{status}</p>}
      {version && (
        <p className="sr-only" aria-hidden>
          v{version}
        </p>
      )}
    </div>
  );
}
