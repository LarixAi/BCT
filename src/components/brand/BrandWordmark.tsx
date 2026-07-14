import { cn } from "@/lib/utils";

type BrandWordmarkSize = "splash" | "header" | "icon";

type BrandWordmarkProps = {
  size?: BrandWordmarkSize;
  className?: string;
};

const sizeStyles: Record<
  BrandWordmarkSize,
  { veyvio: string; yard: string; container: string }
> = {
  splash: {
    container: "w-[min(100%,20rem)]",
    veyvio: "text-4xl font-extrabold tracking-tight sm:text-5xl",
    yard: "mt-3 text-sm font-bold tracking-[0.38em] sm:text-base",
  },
  header: {
    container: "",
    veyvio: "text-sm font-extrabold leading-none tracking-tight",
    yard: "mt-0.5 text-[9px] font-semibold tracking-[0.35em]",
  },
  icon: {
    container: "scale-[0.42] origin-center",
    veyvio: "text-[28px] font-extrabold leading-none tracking-tight",
    yard: "mt-2 text-[13px] font-semibold tracking-[0.42em]",
  },
};

/** VEYVIO / YARD lockup — matches the phone brand canvas spec. */
export function BrandWordmark({ size = "splash", className }: BrandWordmarkProps) {
  const styles = sizeStyles[size];

  return (
    <div className={cn("text-center text-white", styles.container, className)}>
      <div className={cn("font-display", styles.veyvio)}>VEYVIO</div>
      <div
        className={cn(
          "font-display",
          size === "splash" ? "text-white" : "text-yard-sky",
          styles.yard,
        )}
      >
        YARD
      </div>
    </div>
  );
}
