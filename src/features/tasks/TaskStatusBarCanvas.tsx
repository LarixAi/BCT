import { useEffect, useRef } from "react";
import type { StatusBreakdownItem } from "./task-board-utils";

type Props = {
  breakdown: StatusBreakdownItem[];
  className?: string;
};

const BAR_COUNT = 72;
const GAP = 3;

function seededHeight(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return min + frac * (max - min);
}

export function TaskStatusBarCanvas({ breakdown, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const draw = () => {
      const width = container.clientWidth;
      const height = width < 480 ? 140 : 168;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const total = breakdown.reduce((sum, item) => sum + item.count, 0) || 1;
      const barWidth = Math.max(2, (width - GAP * (BAR_COUNT - 1)) / BAR_COUNT);
      let barIndex = 0;

      breakdown.forEach((segment, segmentIndex) => {
        const segmentBars = Math.max(1, Math.round((segment.count / total) * BAR_COUNT));
        for (let i = 0; i < segmentBars && barIndex < BAR_COUNT; i += 1, barIndex += 1) {
          const x = barIndex * (barWidth + GAP);
          const h = seededHeight(barIndex + segmentIndex * 13, 0.35, 1) * (height - 8);
          const y = height - h;
          ctx.fillStyle = segment.color;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, h, barWidth / 2);
          ctx.fill();
        }
      });

      while (barIndex < BAR_COUNT) {
        const x = barIndex * (barWidth + GAP);
        const h = seededHeight(barIndex, 0.2, 0.55) * (height - 8);
        const y = height - h;
        ctx.fillStyle = "#eaecf0";
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, h, barWidth / 2);
        ctx.fill();
        barIndex += 1;
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [breakdown]);

  return (
    <div ref={containerRef} className={className}>
      <canvas ref={canvasRef} className="block w-full" aria-hidden />
    </div>
  );
}
