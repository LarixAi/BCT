import { BrandWordmarkGraphic } from "@/components/brand/BrandWordmarkGraphic";
import { cn } from "@/lib/utils";

export type BrandWordmarkSize = "splash" | "header" | "chrome" | "icon";
export type BrandWordmarkLayout = "stacked" | "inline";
export type BrandWordmarkTheme = "on-dark" | "on-light";

/** Tailwind classes aligned to veyvio-driver-brand-phone.canvas.tsx */
const LOCKUP = {
  splash: {
    stacked: {
      veyvio: "text-[1.75rem] font-extrabold leading-none tracking-[-0.02em] sm:text-[2rem]",
      driver: "mt-2 text-[0.8125rem] font-semibold tracking-[0.42em] sm:text-[0.8125rem]",
      gap: "gap-0",
    },
    inline: {
      veyvio: "text-[1.75rem] font-extrabold leading-none tracking-[-0.02em]",
      driver: "text-[0.8125rem] font-semibold tracking-[0.42em]",
      gap: "gap-2",
    },
  },
  header: {
    stacked: {
      veyvio: "text-sm font-extrabold leading-none tracking-[-0.02em]",
      driver: "mt-0.5 text-[10px] font-semibold tracking-[0.26em]",
      gap: "gap-0",
    },
    inline: {
      veyvio: "text-sm font-extrabold leading-none tracking-[-0.02em]",
      driver: "text-[10px] font-semibold tracking-[0.26em]",
      gap: "gap-1",
    },
  },
  chrome: {
    stacked: {
      veyvio: "text-[0.8125rem] font-extrabold leading-none tracking-[-0.02em]",
      driver: "mt-1 text-[0.625rem] font-semibold tracking-[0.28em]",
      gap: "gap-0",
    },
    inline: {
      veyvio: "text-[0.8125rem] font-extrabold leading-none tracking-[-0.02em]",
      driver: "text-[0.625rem] font-semibold tracking-[0.28em]",
      gap: "gap-1",
    },
  },
  icon: {
    stacked: {
      veyvio: "text-lg font-extrabold leading-none tracking-[-0.02em]",
      driver: "mt-1 text-[10px] font-semibold tracking-[0.28em]",
      gap: "gap-0",
    },
    inline: {
      veyvio: "text-xs font-extrabold leading-none tracking-[-0.02em]",
      driver: "text-[10px] font-semibold tracking-[0.24em]",
      gap: "gap-0.5",
    },
  },
} as const;

export function BrandWordmark({
  size = "splash",
  layout = "stacked",
  theme = "on-dark",
  showAccent = false,
  align,
  className,
}: {
  size?: BrandWordmarkSize;
  layout?: BrandWordmarkLayout;
  theme?: BrandWordmarkTheme;
  showAccent?: boolean;
  /** Stacked lockup alignment; defaults to center on splash, left elsewhere. */
  align?: "left" | "center";
  className?: string;
}) {
  const styles = LOCKUP[size][layout];
  const onDark = theme === "on-dark";
  const stackedAlign = align ?? (size === "splash" ? "center" : "left");

  return (
    <div className={cn("brand-wordmark inline-flex flex-col", className)} aria-label="Veyvio Driver">
      {showAccent && (
        <div
          className={cn(
            "mb-3.5 h-0.5 w-10 rounded-full bg-link",
            stackedAlign === "center" ? "self-center" : "self-start",
          )}
          aria-hidden
        />
      )}
      <div
        className={cn(
          layout === "inline" ? "inline-flex items-baseline" : "flex flex-col",
          styles.gap,
          stackedAlign === "center" ? "items-center text-center" : "items-start text-left",
        )}
      >
        <span
          className={cn("font-display", styles.veyvio, onDark ? "text-white" : "text-accent")}
        >
          VEYVIO
        </span>
        <span
          className={cn(
            "font-display",
            styles.driver,
            onDark ? "text-driver-sky" : "text-link",
            layout === "inline" && "ml-1",
          )}
        >
          DRIVER
        </span>
      </div>
    </div>
  );
}

export function BrandAppIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid size-[4.5rem] place-items-center rounded-[1.125rem] bg-accent p-2",
        className,
      )}
      aria-hidden
    >
      <BrandWordmarkGraphic size="icon" className="h-5" />
    </div>
  );
}
