import { cn } from "@/lib/utils";

type BrandWordmarkSize = "splash" | "header" | "icon";

type BrandWordmarkProps = {
  size?: BrandWordmarkSize;
  className?: string;
  /** When false, renders for light backgrounds (Midnight / Teal). Default assumes dark chrome. */
  onDark?: boolean;
};

const sizeStyles: Record<
  BrandWordmarkSize,
  { veyvio: string; yard: string; container: string }
> = {
  splash: {
    container: "w-[min(100%,20rem)] text-center",
    veyvio: "text-4xl font-extrabold tracking-tight sm:text-5xl",
    yard: "mt-3 text-sm font-bold tracking-[0.38em] sm:text-base",
  },
  header: {
    container: "text-left",
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
export function BrandWordmark({ size = "splash", className, onDark = true }: BrandWordmarkProps) {
  const styles = sizeStyles[size];
  const veyvioColor = onDark ? "text-white" : "text-accent";
  const yardColor = onDark ? "text-white/70" : "text-primary";

  return (
    <div className={cn(styles.container, className)}>
      <div className={cn("font-display", veyvioColor, styles.veyvio)}>VEYVIO</div>
      <div className={cn("font-display", yardColor, styles.yard)}>YARD</div>
    </div>
  );
}
