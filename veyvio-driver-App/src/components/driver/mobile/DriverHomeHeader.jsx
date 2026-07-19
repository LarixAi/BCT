/**
 * DriverHomeHeader — 3-button row at top of driver home screen.
 * LEFT:   Home button
 * CENTER: DynamicIsland pill
 * RIGHT:  Destination — opens full-page destination mode
 */
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, MapPin } from "lucide-react";
import DynamicIsland from "./DynamicIsland";
import { loadDriverDestination } from "@/lib/driverDestination";

export default function DriverHomeHeader({
  driver,
  todayEarnings,
  todayTrips,
  onHomePress,
  islandPulse,
  onIslandPulseEnd,
  onSeeWeeklySummary,
  onOpenHotAreas,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [destActive, setDestActive] = useState(
    () => loadDriverDestination().enabled && Boolean(loadDriverDestination().target)
  );
  const [zoneLabel, setZoneLabel] = useState(
    () => loadDriverDestination().target?.split(",")[0] || "South London"
  );

  useEffect(() => {
    const { enabled, target } = loadDriverDestination();
    setDestActive(enabled && Boolean(target));
    setZoneLabel(target?.split(",")[0] || "South London");
  }, [location.key]);

  const openDestination = () => {
    navigate("/driver/destination", { state: { returnToMap: true } });
  };

  return (
    <div className="flex items-center justify-between px-4 pt-10 pb-2 relative" style={{ zIndex: 9999 }}>
      {onHomePress ? (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onHomePress}
          className="w-11 h-11 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center shrink-0"
        >
          <Home className="w-5 h-5 text-gray-800" />
        </motion.button>
      ) : (
        <div className="w-11 h-11 shrink-0" aria-hidden="true" />
      )}

      <div className="flex-1 flex justify-center relative">
        <DynamicIsland
          todayEarnings={todayEarnings}
          todayTrips={todayTrips}
          driverId={driver?.id}
          islandPulse={islandPulse}
          onPulseEnd={onIslandPulseEnd}
          onSeeWeeklySummary={onSeeWeeklySummary}
          onOpenHotAreas={onOpenHotAreas}
          zoneLabel={zoneLabel}
        />
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={openDestination}
        aria-label="Set destination"
        className={`w-11 h-11 rounded-full shadow-md border flex items-center justify-center shrink-0 transition-colors ${
          destActive ? "bg-blue-600 border-blue-500" : "bg-white border-gray-100"
        }`}
      >
        <MapPin className={`w-5 h-5 ${destActive ? "text-white" : "text-gray-800"}`} />
      </motion.button>
    </div>
  );
}
