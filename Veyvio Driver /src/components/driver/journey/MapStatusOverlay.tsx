import { cn } from "@/lib/utils";

export function MapStatusOverlay({
  highlight = "current",
  className,
}: {
  highlight?: "current" | "diversion" | "off-route";
  className?: string;
}) {
  if (highlight === "diversion") {
    return (
      <div className={cn("pointer-events-none absolute inset-x-3 top-3 z-[500]", className)}>
        <div className="rounded-md border border-warn/35 bg-card/95 p-2 text-xs shadow-sm backdrop-blur-sm">
          <p className="font-bold text-warn">Diversion active</p>
          <p className="mt-1 text-muted">Follow revised route from operations.</p>
        </div>
      </div>
    );
  }

  if (highlight === "off-route") {
    return (
      <div className={cn("pointer-events-none absolute inset-x-3 top-3 z-[500]", className)}>
        <div className="rounded-md border border-vor/30 bg-card/95 p-2 text-xs shadow-sm backdrop-blur-sm">
          <p className="font-bold text-vor">Off route</p>
          <p className="mt-1 text-muted">Return to the scheduled path.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("pointer-events-none absolute left-3 top-3 z-[500]", className)}>
      <div className="rounded-md border border-border bg-card/95 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-ok shadow-sm backdrop-blur-sm">
        On route
      </div>
    </div>
  );
}
