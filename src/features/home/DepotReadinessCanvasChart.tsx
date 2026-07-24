import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, MoreHorizontal } from "lucide-react";
import type { DayReadiness } from "./depot-readiness-series";
import {
  CHART_COLORS,
  createChartLayout,
  createDiagonalPattern,
  drawGrid,
  fillBand,
  traceSmoothLine,
  xAt,
  yAt,
  type ChartPoint,
} from "./canvas-chart-utils";
import { SegmentedControl } from "./HomeDashboardPrimitives";

type WeekTab = "week1" | "week2" | "week3" | "week4";

const WEEK_TABS: { id: WeekTab; label: string }[] = [
  { id: "week1", label: "Week 1" },
  { id: "week2", label: "Week 2" },
  { id: "week3", label: "Week 3" },
  { id: "week4", label: "Week 4" },
];

type Props = {
  series: DayReadiness[];
};

function chartHeight(width: number): number {
  return width < 640 ? 210 : 268;
}

function ChartDaySummary({
  active,
  dayDelta,
}: {
  active: DayReadiness;
  dayDelta: number;
}) {
  return (
    <div className="rounded-2xl border border-[#e4e7ec] bg-white p-3 shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
      <div className="flex items-start gap-2">
        <span className="text-2xl font-semibold tabular-nums text-ink">{active.readinessPct}%</span>
        <span
          className={`mt-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
            dayDelta >= 0 ? "bg-[#ecfdf3] text-[#027a48]" : "bg-[#fef3f2] text-[#b42318]"
          }`}
        >
          {dayDelta >= 0 ? "+" : ""}
          {dayDelta}%
        </span>
      </div>
      <p className="mt-0.5 text-xs text-[#667085]">Fleet readiness · {active.label}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#eaecf0] pt-3 text-xs">
        <div>
          <div className="flex items-center gap-1.5 font-medium text-ink">
            <span className="size-2 rounded-full bg-[#12b76a]" />
            Ready
          </div>
          <p className="mt-1 pl-3.5 text-[#667085]">{active.ready} vehicles</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 font-medium text-ink">
            <span className="size-2 rounded-full bg-[#f79009]" />
            Blocked
          </div>
          <p className="mt-1 pl-3.5 text-[#667085]">{active.blocked} vehicles</p>
        </div>
      </div>
    </div>
  );
}

export function DepotReadinessCanvasChart({ series }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, series.findIndex(d => d.isToday)));
  const [week, setWeek] = useState<WeekTab>("week2");
  const [chartWidth, setChartWidth] = useState(360);

  const today = useMemo(() => series.find(d => d.isToday) ?? series[0], [series]);
  const weekAvgPct = useMemo(
    () => Math.round((series.reduce((sum, d) => sum + d.readinessPct, 0) / Math.max(series.length, 1)) * 10) / 10,
    [series],
  );
  const avgDelta = useMemo(() => {
    if (!today || weekAvgPct === 0) return 0;
    return Math.round(((today.readinessPct - weekAvgPct) / weekAvgPct) * 100);
  }, [today, weekAvgPct]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || series.length === 0) return;

    const width = container.clientWidth;
    const height = chartHeight(width);
    setChartWidth(width);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const layout = createChartLayout(width, height);
    const count = series.length;
    const highlight = activeIndex >= 0 ? activeIndex : 0;

    const upper: ChartPoint[] = series.map((d, i) => ({
      x: xAt(layout, i, count),
      y: yAt(layout, d.readinessPct),
    }));
    const lower: ChartPoint[] = series.map((d, i) => ({
      x: xAt(layout, i, count),
      y: yAt(layout, d.lowerPct),
    }));

    drawGrid(ctx, layout);

    const bandPattern = createDiagonalPattern(ctx, {
      size: 7,
      stroke: "rgba(16,24,40,0.11)",
      lineWidth: 1,
      background: "#fbfbfc",
    });
    if (bandPattern) fillBand(ctx, upper, lower, bandPattern);

    const colWidth = (layout.chartW / Math.max(count - 1, 1)) * (width < 640 ? 0.88 : 0.78);
    const colX = xAt(layout, highlight, count) - colWidth / 2;
    const boldStripe = createDiagonalPattern(ctx, {
      size: 7,
      stroke: "#101828",
      lineWidth: 2.5,
      background: "#ffffff",
    });

    if (boldStripe) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(colX, layout.pad.top, colWidth, layout.chartH);
      ctx.clip();
      ctx.fillStyle = boldStripe;
      ctx.fillRect(colX, layout.pad.top, colWidth, layout.chartH);
      ctx.restore();
    }

    ctx.beginPath();
    traceSmoothLine(ctx, lower);
    ctx.strokeStyle = CHART_COLORS.lowerLine;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    traceSmoothLine(ctx, upper);
    ctx.strokeStyle = CHART_COLORS.upperLine;
    ctx.lineWidth = 2;
    ctx.stroke();

    const hx = xAt(layout, highlight, count);
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = "rgba(16,24,40,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx, layout.pad.top);
    ctx.lineTo(hx, layout.pad.top + layout.chartH);
    ctx.stroke();
    ctx.restore();

    series.forEach((_, i) => {
      const ux = upper[i].x;
      const uy = upper[i].y;
      const lx = lower[i].x;
      const ly = lower[i].y;
      const active = i === highlight;

      for (const [x, y, color, radius] of [
        [lx, ly, CHART_COLORS.blocked, active ? 5 : 4],
        [ux, uy, CHART_COLORS.ready, active ? 5.5 : 4.5],
      ] as const) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    ctx.textAlign = "center";
    series.forEach((d, i) => {
      const x = xAt(layout, i, count);
      const isActive = i === highlight;
      ctx.font = isActive ? "600 12px Inter, system-ui, sans-serif" : "12px Inter, system-ui, sans-serif";
      ctx.fillStyle = isActive ? CHART_COLORS.ink : CHART_COLORS.muted;
      ctx.fillText(d.label, x, height - 10);
    });
  }, [series, activeIndex]);

  useEffect(() => {
    draw();
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(container);
    return () => ro.disconnect();
  }, [draw]);

  const pickIndex = (clientX: number) => {
    const container = containerRef.current;
    if (!container || series.length === 0) return;
    const rect = container.getBoundingClientRect();
    const layout = createChartLayout(rect.width, chartHeight(rect.width));
    const step = layout.chartW / Math.max(series.length - 1, 1);
    const relative = Math.max(
      0,
      Math.min(series.length - 1, Math.round((clientX - rect.left - layout.pad.left) / step)),
    );
    setActiveIndex(relative);
  };

  const active = series[activeIndex] ?? series[0];
  const monthLabel = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const shortMonth = new Date().toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
  const dayDelta = active
    ? Math.round((active.readinessPct - (series[Math.max(activeIndex - 1, 0)]?.readinessPct ?? active.readinessPct)) * 10) / 10
    : 0;

  const tooltipLeft = Math.min(
    Math.max(xAt(createChartLayout(chartWidth, chartHeight(chartWidth)), activeIndex, series.length) - 95, 8),
    chartWidth - 210,
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">Depot readiness overview</h2>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e4e7ec] bg-white px-2.5 text-xs font-medium text-ink sm:h-9 sm:px-3"
          >
            <Calendar className="size-3.5 text-[#667085]" />
            <span className="hidden sm:inline">{monthLabel}</span>
            <span className="sm:hidden">{shortMonth}</span>
          </button>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-lg border border-[#e4e7ec] text-[#667085] sm:size-9"
            aria-label="More options"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-3 sm:mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-semibold tabular-nums text-ink sm:text-2xl">
                {weekAvgPct}% ready
              </span>
              <span className="rounded-md bg-[#ecfdf3] px-1.5 py-0.5 text-[11px] font-semibold text-[#027a48]">
                {avgDelta >= 0 ? "+" : ""}
                {avgDelta}%
              </span>
            </div>
            <p className="mt-1 text-xs text-[#667085]">Week average</p>
            <p className="text-xs text-[#98a2b3]">Tap a day on the chart</p>
          </div>
          <div className="-mx-1 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:pb-0">
            <SegmentedControl value={week} onChange={setWeek} options={WEEK_TABS} className="min-w-max" />
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-xl border border-[#eaecf0] bg-[#fbfbfc]"
          onPointerDown={e => pickIndex(e.clientX)}
        >
          <canvas ref={canvasRef} className="block w-full touch-none" role="img" aria-label="Depot readiness chart" />

          {active && (
            <div
              className="pointer-events-none absolute top-4 z-10 hidden w-[210px] md:block"
              style={{ left: tooltipLeft }}
            >
              <ChartDaySummary active={active} dayDelta={dayDelta} />
            </div>
          )}
        </div>

        {active && (
          <div className="md:hidden">
            <ChartDaySummary active={active} dayDelta={dayDelta} />
          </div>
        )}
      </div>
    </div>
  );
}
