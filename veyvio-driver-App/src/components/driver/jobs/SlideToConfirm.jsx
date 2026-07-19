import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";

const COMPLETE_RATIO = 0.82;

/**
 * Real slide-to-confirm (touch + mouse). Looks like the Uber-style control
 * drivers expect — dragging the thumb fires onConfirm once, not a plain tap.
 */
export default function SlideToConfirm({
  label,
  busy = false,
  disabled = false,
  pulse = false,
  onConfirm,
  hint = null,
}) {
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const maxRef = useRef(0);
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);

  const reset = useCallback(() => {
    draggingRef.current = false;
    offsetRef.current = 0;
    setOffset(0);
    setDone(false);
  }, []);

  useEffect(() => {
    if (!busy) reset();
  }, [busy, label, reset]);

  const measureMax = () => {
    const track = trackRef.current;
    if (!track) return 0;
    const thumb = 56;
    return Math.max(0, track.clientWidth - thumb - 8);
  };

  const onPointerDown = (event) => {
    if (disabled || busy || done) return;
    event.preventDefault();
    event.stopPropagation();
    draggingRef.current = true;
    startXRef.current = event.clientX;
    maxRef.current = measureMax();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!draggingRef.current || disabled || busy) return;
    event.preventDefault();
    event.stopPropagation();
    const delta = event.clientX - startXRef.current;
    const next = Math.min(maxRef.current, Math.max(0, delta));
    offsetRef.current = next;
    setOffset(next);
  };

  const finish = (event) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const max = maxRef.current || measureMax();
    const current = offsetRef.current;
    const finalRatio = max > 0 ? current / max : 0;

    if (finalRatio >= COMPLETE_RATIO) {
      offsetRef.current = max;
      setOffset(max);
      setDone(true);
      window.setTimeout(() => {
        onConfirm?.();
      }, 60);
      return;
    }

    offsetRef.current = 0;
    setOffset(0);
  };

  const locked = disabled || busy || done;
  const fillPct = (() => {
    const max = maxRef.current || measureMax();
    if (max <= 0) return 0;
    return Math.min(100, (offset / max) * 100);
  })();

  return (
    <div
      className="px-4 mb-2 shrink-0 touch-auto select-none"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        ref={trackRef}
        className={`relative h-14 w-full overflow-hidden rounded-2xl ${
          pulse ? "ring-2 ring-[#2874EA]/40" : ""
        } ${locked && !done ? "opacity-60" : ""}`}
        style={{ touchAction: "none" }}
      >
        <div
          className={`absolute inset-0 ${done || pulse ? "bg-[#2874EA]" : "bg-gray-100"}`}
        />
        <div
          className="absolute inset-y-0 left-0 bg-[#111827]/10"
          style={{ width: `${fillPct}%` }}
        />
        <p
          className={`pointer-events-none absolute inset-0 flex items-center justify-center px-16 text-sm font-bold ${
            done || pulse ? "text-white" : "text-black"
          }`}
        >
          {busy ? "Working…" : done ? "Confirmed" : label}
        </p>
        <button
          type="button"
          aria-label={label || "Slide to confirm"}
          disabled={locked}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          className="absolute top-1 left-1 z-10 flex h-12 w-14 items-center justify-center rounded-xl bg-black text-white shadow-md active:scale-[0.98] disabled:cursor-not-allowed"
          style={{
            transform: `translateX(${offset}px)`,
            touchAction: "none",
            cursor: locked ? "default" : "grab",
          }}
        >
          {done ? <Check className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
        </button>
      </div>
      {hint ? (
        <p className="mt-1.5 px-1 text-[11px] leading-snug text-gray-500">{hint}</p>
      ) : !locked ? (
        <p className="mt-1.5 px-1 text-[11px] leading-snug text-gray-500">
          Slide the arrow across to confirm
        </p>
      ) : null}
    </div>
  );
}
