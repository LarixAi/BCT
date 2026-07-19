/**
 * DriverTripPlannerPanel — Uber-style full-page "Trip planner" (level 3).
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlignJustify, BarChart2, Clock, Gem, Search, Sparkles,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import DriverTripPlannerActions from "./DriverTripPlannerActions";

function SteeringWheelIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="9" />
      <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
      <line x1="19.07" y1="4.93" x2="14.83" y2="9.17" />
      <line x1="2" y1="12" x2="9" y2="12" />
      <line x1="15" y1="12" x2="22" y2="12" />
    </svg>
  );
}

function PlannerRow({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-4 text-left active:bg-gray-50"
    >
      <Icon className="w-5 h-5 text-gray-800 shrink-0" strokeWidth={1.75} />
      <span className="font-semibold text-black text-[15px]">{label}</span>
    </button>
  );
}

export default function DriverTripPlannerPanel({
  driver,
  isOnline,
  onBreak,
  onClose,
  onGoOffline,
  onToggleBreak,
  goingOffline,
  onOpenFilters,
}) {
  const navigate = useNavigate();
  const [todayTrips, setTodayTrips] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    base44.entities.Booking.filter({ assigned_driver_id: driver.id }, "-completion_time", 50)
      .then(jobs => {
        const done = jobs.filter(
          j => j.booking_status === "completed" && (j.completion_time || j.created_date || "").startsWith(today)
        );
        setTodayTrips(done.length);
        setTodayEarnings(done.reduce((s, j) => s + (j.final_fare || j.fare_estimate || 0), 0) * 0.85);
      })
      .catch(() => {});
  }, [driver.id, today]);

  const pointsGoal = 600;
  const points = Math.min(pointsGoal, todayTrips * 120 + Math.round(todayEarnings * 8));
  const goldPct = Math.min(100, Math.round((points / pointsGoal) * 100)) || 1;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Header */}
      <div className="relative flex items-center justify-center px-4 py-3 shrink-0 border-b border-gray-100">
        <h1 className="font-bold text-black text-base">Trip planner</h1>
        <button
          type="button"
          aria-label="Close trip planner"
          onClick={onClose}
          className="absolute right-3 w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100"
        >
          <AlignJustify className="w-5 h-5 text-gray-800" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-2">
        {/* Rewards row */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex items-stretch divide-x divide-gray-100 mb-6">
          <div className="flex-1 flex items-center gap-3 px-4 py-4 min-w-0">
            <div className="w-9 h-9 rounded-full bg-green-500 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-black text-sm">Unlock Gold</p>
              <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {goldPct}%
              </p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-3 px-4 py-4 min-w-0">
            <Gem className="w-6 h-6 text-blue-500 shrink-0" strokeWidth={1.5} />
            <div className="min-w-0">
              <p className="font-bold text-black text-sm tabular-nums">
                {points} / {pointsGoal} pts
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                {todayTrips} trip{todayTrips !== 1 ? "s" : ""} today
              </p>
            </div>
          </div>
        </div>

        {/* Later today */}
        <p className="text-gray-500 text-sm font-medium mb-2 px-1">Later today</p>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-4 divide-y divide-gray-100">
          <PlannerRow
            icon={BarChart2}
            label="See earnings trends"
            onClick={() => navigate("/driver/earnings")}
          />
          <PlannerRow
            icon={Sparkles}
            label="See upcoming promotions"
            onClick={() => navigate("/driver/hot-areas", { state: { returnToMap: true } })}
          />
          <PlannerRow
            icon={SteeringWheelIcon}
            label="See driving time"
            onClick={() => navigate("/driver/menu")}
          />
        </div>

        <button
          type="button"
          onClick={() => navigate("/driver/menu")}
          className="text-blue-600 font-semibold text-[15px] px-1 py-2"
        >
          Waybill
        </button>
      </div>

      <DriverTripPlannerActions
        isOnline={isOnline}
        onBreak={onBreak}
        onGoOffline={onGoOffline}
        onToggleBreak={onToggleBreak}
        goingOffline={goingOffline}
      />

      {/* Level-1 peek strip (filter | status | search) */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-t border-gray-100 touch-auto">
        <button
          type="button"
          aria-label="Trip filters"
          onClick={onOpenFilters}
          className="w-11 h-11 flex items-center justify-center rounded-full active:bg-gray-100"
        >
          <svg className="w-5 h-5 text-gray-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" />
            <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
            <line x1="4" y1="18" x2="20" y2="18" />
            <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" />
          </svg>
        </button>

        <span className="font-bold text-black text-sm text-center px-2 truncate flex-1">
          {!isOnline ? "You're offline" : onBreak ? "On a break" : "Searching for a job"}
        </span>

        <button
          type="button"
          aria-label="Hot areas"
          onClick={() => navigate("/driver/hot-areas", { state: { returnToMap: true } })}
          className="w-11 h-11 flex items-center justify-center rounded-full active:bg-gray-100"
        >
          <Search className="w-5 h-5 text-gray-800" />
        </button>
      </div>
    </div>
  );
}
