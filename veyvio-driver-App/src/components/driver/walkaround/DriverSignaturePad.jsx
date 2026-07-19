import { useEffect, useRef } from "react";

function setupCanvas(canvas, height) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(rect.width, 1);

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#0f172a";
  return true;
}

export default function DriverSignaturePad({ onChange, height = 140 }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const hasStrokeRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const readyRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const emitSignature = () => {
      if (!hasStrokeRef.current) return;
      try {
        onChangeRef.current?.(canvas.toDataURL("image/png"));
      } catch {
        onChangeRef.current?.(null);
      }
    };

    const pointFromEvent = (e) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches?.[0] ?? e.changedTouches?.[0];
      const clientX = touch?.clientX ?? e.clientX;
      const clientY = touch?.clientY ?? e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e) => {
      e.preventDefault();
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      drawing.current = true;
      const p = pointFromEvent(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };

    const move = (e) => {
      if (!drawing.current) return;
      e.preventDefault();
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const p = pointFromEvent(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      hasStrokeRef.current = true;
      emitSignature();
    };

    const end = (e) => {
      if (!drawing.current) return;
      e.preventDefault();
      drawing.current = false;
      if (hasStrokeRef.current) emitSignature();
    };

    const init = () => {
      if (setupCanvas(canvas, height)) readyRef.current = true;
    };

    init();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(init) : null;
    observer?.observe(canvas);

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", end);
    canvas.addEventListener("mouseleave", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end, { passive: false });
    canvas.addEventListener("touchcancel", end, { passive: false });

    return () => {
      observer?.disconnect();
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", end);
      canvas.removeEventListener("mouseleave", end);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", move);
      canvas.removeEventListener("touchend", end);
      canvas.removeEventListener("touchcancel", end);
    };
  }, [height]);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setupCanvas(canvas, height);
    hasStrokeRef.current = false;
    onChangeRef.current?.(null);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl border-2 border-border bg-white"
        style={{ height, touchAction: "none" }}
        aria-label="Driver signature"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Sign with your finger in the box above.</p>
        <button type="button" onClick={clear} className="text-xs text-[#1eaeae] font-medium shrink-0">
          Clear
        </button>
      </div>
    </div>
  );
}
