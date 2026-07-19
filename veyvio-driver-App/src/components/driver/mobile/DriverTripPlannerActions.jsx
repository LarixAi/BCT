/**
 * Trip planner bottom actions — GO OFFLINE (online only) + BREAK / END BREAK.
 */
import { Coffee, Hand } from "lucide-react";

function CircleAction({ label, onClick, disabled, className, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-2 disabled:opacity-50 min-w-[88px]"
    >
      <div
        className={`w-[72px] h-[72px] rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform ${className}`}
      >
        {children}
      </div>
      <span className="text-[11px] font-bold text-gray-800 tracking-widest">{label}</span>
    </button>
  );
}

export default function DriverTripPlannerActions({
  isOnline,
  onBreak,
  onGoOffline,
  onToggleBreak,
  goingOffline = false,
}) {
  if (!isOnline) {
    return (
      <div className="shrink-0 px-6 py-5 border-t border-gray-100 text-center">
        <p className="text-gray-500 text-sm">You&apos;re offline.</p>
        <p className="text-gray-400 text-xs mt-1">Go online from the home screen to start receiving trips.</p>
      </div>
    );
  }

  if (onBreak) {
    return (
      <div className="shrink-0 flex flex-col items-center py-4 border-t border-gray-100 gap-4">
        <p className="text-amber-700 text-sm font-medium px-4 text-center">
          On a break — trip offers are paused. End break when you&apos;re ready.
        </p>
        <div className="flex items-center justify-center gap-10">
          <CircleAction
            label={goingOffline ? "..." : "END BREAK"}
            onClick={onToggleBreak}
            disabled={goingOffline}
            className="bg-amber-500"
          >
            <Coffee className="w-8 h-8 text-white" />
          </CircleAction>
          <CircleAction
            label={goingOffline ? "..." : "GO OFFLINE"}
            onClick={onGoOffline}
            disabled={goingOffline}
            className="bg-red-600"
          >
            <Hand className="w-8 h-8 text-white" />
          </CircleAction>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 flex items-center justify-center gap-10 py-4 border-t border-gray-100">
      <CircleAction
        label="BREAK"
        onClick={onToggleBreak}
        disabled={goingOffline}
        className="bg-gray-200"
      >
        <Coffee className="w-8 h-8 text-gray-800" />
      </CircleAction>
      <CircleAction
        label={goingOffline ? "..." : "GO OFFLINE"}
        onClick={onGoOffline}
        disabled={goingOffline}
        className="bg-red-600"
      >
        <Hand className="w-8 h-8 text-white" />
      </CircleAction>
    </div>
  );
}
