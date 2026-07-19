import { cn } from "@/lib/utils";

const TEAL = "#5B8C9B";
const NAVY = "#0B0E14";

/** Veyvio app mark — navy squircle with wordmark. */
export function VeyvioDriverLogo({ className, size = "md" }) {
  const dim = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-7 w-7" : "h-10 w-10";

  return (
    <svg viewBox="0 0 48 48" className={cn(dim, "shrink-0", className)} aria-label="Veyvio" role="img">
      <rect width="48" height="48" rx="11" fill={NAVY} />
      <text
        x="24"
        y="20"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="9"
        fontWeight="700"
        letterSpacing="-0.04em"
        fill="#FFFFFF"
      >
        Veyvio
      </text>
      <text
        x="24"
        y="29"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="3.5"
        fontWeight="500"
        letterSpacing="0.04em"
        fill={TEAL}
      >
        Driver
      </text>
    </svg>
  );
}

/** @deprecated Prefer VeyvioDriverLogo — kept for existing imports. */
export const RidovaDriverLogo = VeyvioDriverLogo;

export default VeyvioDriverLogo;
