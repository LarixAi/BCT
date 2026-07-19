/**
 * Go online / Go offline bar — sits in bottom chrome above tab nav (home overview).
 */
import { useNavigate } from "react-router-dom";

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

export default function DriverOverviewGoBar({ driver, onToggleOnline, togglingOnline }) {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  const dailyCheckDone = driver.daily_check_completed_today && driver.daily_check_date === today;
  const canGoOnline = driver.assigned_vehicle_id && driver.vehicle_verified && driver.operator_terms_accepted;
  const isOnline = driver.is_online;

  const handleClick = () => {
    if (!isOnline) {
      if (!canGoOnline) return;
      if (!dailyCheckDone) {
        navigate("/driver/daily-check");
        return;
      }
    }
    onToggleOnline();
  };

  return (
    <div className="px-4 py-3 bg-white border-t border-gray-100">
      <button
        type="button"
        onClick={handleClick}
        disabled={togglingOnline || (!isOnline && !canGoOnline)}
        className={`w-full py-4 rounded-full font-bold text-base flex items-center justify-center gap-3 shadow-lg transition-all ${
          isOnline
            ? "bg-gray-800 text-white"
            : canGoOnline && dailyCheckDone
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-400"
        }`}
      >
        <SteeringWheelIcon className="w-5 h-5" />
        {togglingOnline
          ? "..."
          : isOnline
            ? "Go offline"
            : !canGoOnline
              ? "Setup incomplete"
              : !dailyCheckDone
                ? "Complete daily check"
                : "Go online"}
      </button>
    </div>
  );
}
