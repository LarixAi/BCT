import { useRef, useState } from "react";

interface EvidenceCompareSliderProps {
  beforeSrc?: string;
  afterSrc?: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function EvidenceCompareSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Earlier",
  afterLabel = "Latest",
}: EvidenceCompareSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!beforeSrc && !afterSrc) {
    return (
      <div className="aspect-[4/3] bg-secondary rounded-xs border border-border grid place-items-center text-xs text-muted">
        No comparison images available
      </div>
    );
  }

  const drag = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setPosition(pct);
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative aspect-[4/3] rounded-xs border border-border overflow-hidden select-none touch-none bg-black"
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); drag(e.clientX); }}
        onPointerMove={e => { if (e.buttons > 0) drag(e.clientX); }}
      >
        {afterSrc && (
          <img src={afterSrc} alt={afterLabel} className="absolute inset-0 size-full object-cover" />
        )}
        {beforeSrc && (
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
            <img
              src={beforeSrc}
              alt={beforeLabel}
              className="absolute inset-0 h-full object-cover"
              style={{ width: containerRef.current?.clientWidth ?? "100%" }}
            />
          </div>
        )}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md"
          style={{ left: `${position}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 grid size-8 place-items-center rounded-full bg-white shadow border border-border text-[10px] font-bold"
          style={{ left: `${position}%` }}
        >
          ↔
        </div>
      </div>
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted">
        <span>{beforeLabel}</span>
        <span>Drag to compare</span>
        <span>{afterLabel}</span>
      </div>
    </div>
  );
}
