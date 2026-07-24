import type { DayReadiness } from "./depot-readiness-series";

export type ChartPoint = { x: number; y: number };

export type ChartLayout = {
  width: number;
  height: number;
  pad: { top: number; right: number; bottom: number; left: number };
  chartW: number;
  chartH: number;
  minY: number;
  maxY: number;
};

export const CHART_COLORS = {
  ink: "#101828",
  muted: "#667085",
  grid: "rgba(102,112,133,0.14)",
  upperLine: "#101828",
  lowerLine: "rgba(16,24,40,0.35)",
  ready: "#178c4b",
  blocked: "#d97706",
  columnTint: "rgba(16,24,40,0.04)",
};

export function createChartLayout(width: number, height: number): ChartLayout {
  const compact = width < 640;
  const pad = compact
    ? { top: 20, right: 10, bottom: 30, left: 12 }
    : { top: 28, right: 20, bottom: 36, left: 56 };
  return {
    width,
    height,
    pad,
    chartW: width - pad.left - pad.right,
    chartH: height - pad.top - pad.bottom,
    minY: 35,
    maxY: 100,
  };
}

export function xAt(layout: ChartLayout, index: number, count: number): number {
  return layout.pad.left + (index / Math.max(count - 1, 1)) * layout.chartW;
}

export function yAt(layout: ChartLayout, value: number): number {
  const { minY, maxY, pad, chartH } = layout;
  return pad.top + chartH - ((value - minY) / (maxY - minY)) * chartH;
}

export function traceSmoothLine(
  ctx: CanvasRenderingContext2D,
  points: ChartPoint[],
  options?: { connect?: boolean },
) {
  if (points.length === 0) return;
  const connect = options?.connect ?? false;
  if (connect) ctx.lineTo(points[0].x, points[0].y);
  else ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

export function createDiagonalPattern(
  ctx: CanvasRenderingContext2D,
  options: { size: number; stroke: string; lineWidth: number; background?: string },
): CanvasPattern | null {
  const { size, stroke, lineWidth, background = "#ffffff" } = options;
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext("2d");
  if (!tctx) return null;
  tctx.fillStyle = background;
  tctx.fillRect(0, 0, size, size);
  tctx.strokeStyle = stroke;
  tctx.lineWidth = lineWidth;
  tctx.beginPath();
  tctx.moveTo(0, size);
  tctx.lineTo(size, 0);
  tctx.stroke();
  tctx.beginPath();
  tctx.moveTo(-size * 0.5, size * 0.5);
  tctx.lineTo(size * 0.5, -size * 0.5);
  tctx.stroke();
  tctx.beginPath();
  tctx.moveTo(size * 0.5, size * 1.5);
  tctx.lineTo(size * 1.5, size * 0.5);
  tctx.stroke();
  return ctx.createPattern(tile, "repeat");
}

export function fillBand(
  ctx: CanvasRenderingContext2D,
  upper: ChartPoint[],
  lower: ChartPoint[],
  fillStyle: string | CanvasPattern,
) {
  if (upper.length === 0 || lower.length === 0) return;
  const reversed = [...lower].reverse();
  ctx.save();
  ctx.beginPath();
  traceSmoothLine(ctx, upper);
  traceSmoothLine(ctx, reversed, { connect: true });
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

export function drawGrid(ctx: CanvasRenderingContext2D, layout: ChartLayout) {
  ctx.strokeStyle = CHART_COLORS.grid;
  ctx.lineWidth = 1;
  for (let tick = 40; tick <= 100; tick += 20) {
    const y = yAt(layout, tick);
    ctx.beginPath();
    ctx.moveTo(layout.pad.left, y);
    ctx.lineTo(layout.width - layout.pad.right, y);
    ctx.stroke();
  }
}

export function averageReady(series: DayReadiness[]): number {
  if (series.length === 0) return 0;
  return Math.round(series.reduce((sum, d) => sum + d.ready, 0) / series.length);
}
