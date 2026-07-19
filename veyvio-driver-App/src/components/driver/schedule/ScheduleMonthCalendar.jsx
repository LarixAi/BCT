import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatLocalDate } from "@/lib/local-date";
import { formatUkDate } from "@/lib/uk-locale";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonth(year, monthIndex) {
  return new Date(year, monthIndex, 1);
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Monday-first offset: Mon=0 … Sun=6 */
function mondayOffset(date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function inRange(iso, from, to) {
  if (!from || !to || !iso) return false;
  const a = from <= to ? from : to;
  const b = from <= to ? to : from;
  return iso >= a && iso <= b;
}

/**
 * Month calendar for schedule view or leave date picking.
 *
 * markersByDate: { [iso]: { duty?: boolean, leave?: boolean, leaveStatus?: string } }
 * selection: { from, to } for range highlight in select mode
 */
export default function ScheduleMonthCalendar({
  month,
  onMonthChange,
  markersByDate = {},
  selectedDate = null,
  onSelectDate,
  selection = null,
  mode = "view", // view | select
  minDate = null,
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = startOfMonth(year, monthIndex);
  const totalDays = daysInMonth(year, monthIndex);
  const lead = mondayOffset(first);
  const today = formatLocalDate(new Date());

  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= totalDays; d += 1) {
    cells.push(formatLocalDate(new Date(year, monthIndex, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const title = formatUkDate(first, "medium").replace(/^\d+\s/, ""); // "Jul 2026" style-ish
  const monthTitle = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const shiftMonth = (delta) => {
    const next = new Date(year, monthIndex + delta, 1);
    onMonthChange?.(next);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border active:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold capitalize text-foreground">{monthTitle || title}</p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border active:bg-muted"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, idx) => {
          if (!iso) return <div key={`e-${idx}`} className="aspect-square" />;

          const markers = markersByDate[iso] || {};
          const isToday = iso === today;
          const isSelected = selectedDate === iso;
          const inSelection = selection ? inRange(iso, selection.from, selection.to || selection.from) : false;
          const isRangeEnd =
            selection &&
            selection.from &&
            selection.to &&
            (iso === selection.from || iso === selection.to);
          const disabled = Boolean(minDate && iso < minDate);

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate?.(iso)}
              className={[
                "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                disabled ? "opacity-35" : "active:scale-[0.98]",
                inSelection || isRangeEnd
                  ? "bg-[var(--ridova-teal)] text-white"
                  : isSelected
                    ? "bg-[var(--ridova-teal)]/15 text-[var(--ridova-teal-dark)] ring-2 ring-[var(--ridova-teal)]"
                    : isToday
                      ? "bg-muted text-foreground"
                      : "text-foreground hover:bg-muted/60",
              ].join(" ")}
            >
              <span className="tabular-nums">{Number(iso.slice(8, 10))}</span>
              <span className="mt-0.5 flex h-1.5 items-center justify-center gap-0.5">
                {markers.duty ? (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      inSelection || isRangeEnd ? "bg-white" : "bg-[var(--ridova-teal)]"
                    }`}
                  />
                ) : null}
                {markers.leave ? (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      inSelection || isRangeEnd
                        ? "bg-white/80"
                        : markers.leaveStatus === "approved"
                          ? "bg-emerald-500"
                          : markers.leaveStatus === "rejected"
                            ? "bg-red-500"
                            : "bg-amber-500"
                    }`}
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {mode === "view" ? (
        <div className="mt-3 flex flex-wrap gap-3 px-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ridova-teal)]" /> Duty
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Leave pending
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Leave approved
          </span>
        </div>
      ) : (
        <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted-foreground">
          Tap a start date, then an end date. Tap the same day twice for a single day.
        </p>
      )}
    </div>
  );
}
