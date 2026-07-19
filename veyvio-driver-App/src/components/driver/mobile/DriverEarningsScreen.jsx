/**
 * DriverEarningsScreen — mobile Earnings tab with real trip and payout data.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatUkPattern } from "@/lib/uk-locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronLeft,
  BarChart2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";
import { useDriverEarningsData } from "@/hooks/useDriverEarningsData";
import {
  DRIVER_NET_SHARE,
  bookingGross,
  bookingNet,
} from "@/lib/driverStats";
import { DRIVER_SCREEN_TOP } from "@/lib/driverSafeArea";

const COMMISSION_PCT = Math.round((1 - DRIVER_NET_SHARE) * 100);

function StatPill({ label, value, sub }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-black text-black mt-0.5 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function buildWeeklyStatement(driver, weekJobs, weekStart, weekEnd) {
  const weekGross = weekJobs.reduce((s, j) => s + bookingGross(j), 0);
  const weekNet = weekJobs.reduce((s, j) => s + bookingNet(j), 0);
  const commission = weekGross - weekNet;

  const lines = [
    "WEEKLY EARNINGS STATEMENT",
    "==========================",
    `Driver: ${driver.full_name}`,
    `PHV Licence: ${driver.phv_licence_number || "N/A"}`,
    `Period: ${formatUkPattern(weekStart, "dd/MM/yyyy")} – ${formatUkPattern(weekEnd, "dd/MM/yyyy")}`,
    `Generated: ${formatUkPattern(new Date(), "dd/MM/yyyy HH:mm")}`,
    "",
    "SUMMARY",
    "-------",
    `Total Trips:      ${weekJobs.length}`,
    `Gross Earnings:   £${weekGross.toFixed(2)}`,
    `Platform Fee (${COMMISSION_PCT}%): -£${commission.toFixed(2)}`,
    `NET PAYOUT:       £${weekNet.toFixed(2)}`,
    "",
    "TRIP BREAKDOWN",
    "--------------",
    ...weekJobs.map((j, i) => {
      const gross = bookingGross(j);
      const net = bookingNet(j);
      return [
        `${i + 1}. ${j.booking_reference || j.id?.slice(0, 8) || "Trip"}`,
        `   Customer: ${j.customer_name || "—"}`,
        `   Pick-up:  ${j.pickup_address || "—"}`,
        `   Drop-off: ${j.dropoff_address || "—"}`,
        `   Date:     ${j.completion_time ? formatUkPattern(j.completion_time, "dd/MM/yyyy HH:mm") : "—"}`,
        `   Payment:  ${j.payment_status || "pending"}`,
        `   Gross: £${gross.toFixed(2)}  Net: £${net.toFixed(2)}`,
        "",
      ].join("\n");
    }),
    "",
    "This statement is for informational purposes.",
    "Final settlement per your operator agreement.",
  ];

  return lines.join("\n");
}

export default function DriverEarningsScreen({ driver }) {
  const navigate = useNavigate();
  const [monthOffset, setMonthOffset] = useState(0);
  const [weekExpanded, setWeekExpanded] = useState(false);
  const { jobs, loading, error, stats } = useDriverEarningsData(driver, monthOffset);

  const { today, week, lastWeek, month, weekChart, monthChart, wow, avgTrip, captured, pendingPay, monthDate } =
    stats;

  const weekJobs = jobs.filter(j => {
    const t = j.completion_time ? new Date(j.completion_time) : new Date(j.created_date);
    return t >= week.weekStart && t <= week.weekEnd;
  });

  const downloadStatement = () => {
    const content = buildWeeklyStatement(driver, weekJobs, week.weekStart, week.weekEnd);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-statement-${formatUkPattern(week.weekStart, "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const monthLabel = formatUkPattern(monthDate, "MMMM yyyy");
  const maxMonthBar = Math.max(...monthChart.map(d => d.net), 1);

  if (loading) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 bg-white">
        <div className="w-6 h-6 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading earnings…</p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain bg-white px-4 pb-8 space-y-5"
      style={{ paddingTop: DRIVER_SCREEN_TOP, WebkitOverflowScrolling: "touch" }}
    >
      <div className="flex items-start justify-between">
        <h1 className="text-3xl font-bold text-black">Earnings</h1>
        <button
          type="button"
          onClick={() => navigate("/driver/earnings")}
          className="text-xs font-semibold text-blue-600 flex items-center gap-1 mt-2"
        >
          Full report <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
          Showing cached view — {error}
        </div>
      )}

      {/* Weekly summary */}
      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-xs text-gray-500">
              {formatUkPattern(week.weekStart, "d MMM")} – {formatUkPattern(week.weekEnd, "d MMM")}
            </p>
            <p className="text-3xl font-bold text-black mt-1 tabular-nums">£{week.net.toFixed(2)}</p>
            {lastWeek.net > 0 && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${wow >= 0 ? "text-green-600" : "text-red-500"}`}>
                {wow >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {wow >= 0 ? "+" : ""}
                {wow}% vs last week (£{lastWeek.net.toFixed(2)})
              </p>
            )}
          </div>
          <div className="h-14 w-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekChart} barSize={10} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Bar dataKey="net" radius={[3, 3, 0, 0]}>
                  {weekChart.map((d, i) => (
                    <Cell key={i} fill={d.isToday ? "#2563eb" : d.net > 0 ? "#000" : "#e5e7eb"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span>{week.trips} trips</span>
          <span>·</span>
          <span>£{week.gross.toFixed(2)} gross</span>
          {avgTrip > 0 && (
            <>
              <span>·</span>
              <span>£{avgTrip.toFixed(2)} avg</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setWeekExpanded(v => !v)}
          className="w-full mt-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 flex items-center justify-center gap-2"
        >
          {weekExpanded ? "Hide details" : "See details"}
          <ChevronRight className={`w-4 h-4 transition-transform ${weekExpanded ? "rotate-90" : ""}`} />
        </button>

        <AnimatePresence>
          {weekExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                {weekChart.map(day => (
                  <div key={day.dateLabel} className="flex items-center justify-between text-sm">
                    <span className={day.isToday ? "font-bold text-blue-600" : "text-gray-600"}>
                      {day.dateLabel}
                      {day.isToday && " (today)"}
                    </span>
                    <span className="tabular-nums">
                      <span className="font-bold text-black">£{day.net.toFixed(2)}</span>
                      <span className="text-gray-400 text-xs ml-2">{day.trips} trip{day.trips !== 1 ? "s" : ""}</span>
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Today + month mini stats */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatPill
          label="Today"
          value={`£${today.net.toFixed(2)}`}
          sub={`${today.trips} trips · £${today.gross.toFixed(2)} gross`}
        />
        <StatPill
          label="Last week"
          value={`£${lastWeek.net.toFixed(2)}`}
          sub={`${lastWeek.trips} trips`}
        />
      </div>

      {/* Month navigator */}
      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setMonthOffset(o => o + 1)}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{monthLabel}</p>
            <p className="text-2xl font-bold text-black tabular-nums">£{month.net.toFixed(2)}</p>
          </div>
          <button
            type="button"
            onClick={() => setMonthOffset(o => Math.max(0, o - 1))}
            disabled={monthOffset === 0}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center disabled:opacity-30"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center mb-3">
          {month.trips} trips · £{month.gross.toFixed(2)} gross
        </p>
        {monthChart.some(d => d.net > 0) && (
          <div className="flex items-end gap-0.5 h-12">
            {monthChart.map(d => (
              <div
                key={d.day}
                className="flex-1 bg-black rounded-sm min-h-[2px] transition-all"
                style={{ height: `${Math.max(4, (d.net / maxMonthBar) * 100)}%`, opacity: d.net > 0 ? 1 : 0.15 }}
                title={`${d.day}: £${d.net.toFixed(2)}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Payment summary */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          <StatPill label="Paid trips" value={String(captured)} sub="Payment captured" />
          <StatPill
            label="Pending"
            value={String(pendingPay)}
            sub={pendingPay > 0 ? "Awaiting capture" : "All clear"}
          />
        </div>
      )}

      {/* Download */}
      <button
        type="button"
        onClick={downloadStatement}
        disabled={week.trips === 0}
        className="w-full py-3.5 bg-black text-white rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <Download className="w-4 h-4" />
        Download weekly statement
      </button>

      {/* Recent trips */}
      {jobs.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-black">Recent trips</h2>
            <button
              type="button"
              onClick={() => navigate("/driver/jobs")}
              className="text-xs font-semibold text-blue-600"
            >
              View all ({jobs.length})
            </button>
          </div>
          <div className="space-y-1">
            {jobs.slice(0, 15).map(j => {
              const gross = bookingGross(j);
              const net = bookingNet(j);
              const paid = j.payment_status === "captured";
              return (
                <motion.button
                  key={j.id}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() =>
                    navigate(`/driver/job/${j.id}`, {
                      state: { returnToMap: true, tripDetails: true, bookingSnapshot: j },
                    })
                  }
                  className="w-full flex items-center justify-between py-3 border-b border-gray-100 text-left active:bg-gray-50 rounded-lg px-1"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-black truncate">{j.customer_name || "Customer"}</p>
                      {paid && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                          Paid
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{j.dropoff_address || j.pickup_address}</p>
                    <p className="text-xs text-gray-400">
                      {j.completion_time ? formatUkPattern(j.completion_time, "dd MMM · HH:mm") : "—"}
                      {j.booking_reference && ` · ${j.booking_reference}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-black tabular-nums">£{net.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 tabular-nums">£{gross.toFixed(2)} gross</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No completed trips yet</p>
          <p className="text-sm mt-1">Go online to start earning</p>
        </div>
      )}
    </div>
  );
}
