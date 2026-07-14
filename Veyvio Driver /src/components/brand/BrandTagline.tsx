import { cn } from "@/lib/utils";
import { BRAND_CAMPAIGN, BRAND_PROMISE } from "./brand-copy";

export function BrandTagline({
  variant = "chrome",
  className,
}: {
  variant?: "chrome" | "splash" | "about";
  className?: string;
}) {
  const text = variant === "splash" || variant === "about" ? BRAND_CAMPAIGN : BRAND_PROMISE;

  if (variant === "chrome") {
    return (
      <p
        className={cn(
          "text-[10px] font-semibold uppercase leading-snug tracking-[0.12em] text-white/55",
          className,
        )}
      >
        Move smarter.
        <br />
        Operate safer.
      </p>
    );
  }

  if (variant === "splash") {
    return (
      <p className={cn("max-w-xs text-sm leading-relaxed text-white/75", className)}>{text}</p>
    );
  }

  return <p className={cn("text-sm text-muted", className)}>{text}</p>;
}
