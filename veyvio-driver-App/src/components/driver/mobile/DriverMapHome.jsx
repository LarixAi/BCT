/**
 * Driver home overview — offline scrollable screen with real driver data.
 */
import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ChevronRight,
  Flame,
  MapPin,
  Maximize2,
  MessageSquare,
  Navigation,
  PoundSterling,
  Shield,
  TrendingUp,
  Car,
  ClipboardCheck,
} from "lucide-react";
import DriverMapTileLayer from "./DriverMapTileLayer";
import SmoothDriverMarker from "./SmoothDriverMarker";
import { createDriverLocationDot } from "./driverLocationIcon";
import { useDriverMapPosition, DEFAULT_MAP_LAT, DEFAULT_MAP_LNG } from "@/hooks/useDriverMapPosition";
import { DRIVER_MAP_CLASS } from "@/lib/driverMapTheme";
import { DRIVER_MAP_LEAFLET_OPTIONS } from "@/lib/driverMapLeafletOptions";
import { useDriverHomeData } from "@/hooks/useDriverHomeData";
import { formatPromoDeadline, driverOpportunityTitle } from "@/lib/driverStats";
import { formatUkDate, formatUkPattern } from "@/lib/uk-locale";

const driverDot = createDriverLocationDot(12);

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-black text-black mt-0.5 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-50 border border-gray-100 active:scale-[0.97] transition-transform"
    >
      <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center">
        <Icon className="w-5 h-5 text-black" strokeWidth={2} />
      </div>
      <span className="text-[11px] font-semibold text-gray-800 text-center leading-tight">{label}</span>
      {badge > 0 && (
        <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

function MapCard({ driverLat, driverLng, mapCenter, onExpand }) {
  return (
    <div
      className="relative mx-4 mb-5 rounded-2xl overflow-hidden border border-gray-200 cursor-pointer"
      style={{ height: 200, isolation: "isolate" }}
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onExpand?.()}
    >
      <MapContainer
        center={mapCenter}
        zoom={14}
        scrollWheelZoom={false}
        dragging={false}
        className={`w-full h-full ${DRIVER_MAP_CLASS}`}
        {...DRIVER_MAP_LEAFLET_OPTIONS}
      >
        <DriverMapTileLayer />
        <SmoothDriverMarker lat={driverLat} lng={driverLng} icon={driverDot} />
      </MapContainer>

      <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full shadow-sm">
        <p className="text-[10px] font-semibold text-gray-600">Your location</p>
      </div>

      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onExpand?.();
        }}
        className="absolute top-3 right-3 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center"
        aria-label="Open full map"
      >
        <Maximize2 className="w-4 h-4 text-gray-700" />
      </button>
    </div>
  );
}

function OpportunityCard({ title, subtitle, accent = "blue", onClick, imageUrl }) {
  const accents = {
    blue: "from-blue-100 to-blue-300",
    orange: "from-orange-100 to-orange-300",
    green: "from-emerald-100 to-emerald-300",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between py-4 border-b border-gray-100 text-left active:opacity-80"
    >
      <div className="flex-1 pr-4 min-w-0">
        <p className="font-bold text-black text-sm leading-snug">{title}</p>
        <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
      </div>
      <div className="w-16 h-12 rounded-xl overflow-hidden shrink-0 bg-gray-100">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${accents[accent] || accents.blue}`} />
        )}
      </div>
    </button>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DriverMapHome({
  driver,
  onOpenMap,
  onTabChange,
  onOpenHotAreas,
  todayEarnings = 0,
  todayTrips = 0,
  unreadMessages = 0,
}) {
  const navigate = useNavigate();
  const { loading, vehicle, promotions, weekStats, recentTrip, bestDay, hotZones } =
    useDriverHomeData(driver);

  const { lat: driverLat, lng: driverLng } = useDriverMapPosition(
    driver.current_lat,
    driver.current_lng
  );
  const mapCenterRef = useRef([
    driver.current_lat ?? DEFAULT_MAP_LAT,
    driver.current_lng ?? DEFAULT_MAP_LNG,
  ]);

  const today = new Date().toISOString().split("T")[0];
  const dailyCheckDone = driver.daily_check_completed_today && driver.daily_check_date === today;
  const canGoOnline = driver.assigned_vehicle_id && driver.vehicle_verified && driver.operator_terms_accepted;
  const isOnline = driver.is_online;
  const firstName = driver.full_name?.split(" ")[0] || "Driver";
  const rating = driver.rating != null ? driver.rating.toFixed(2) : "—";

  const weekLabel = weekStats.weekStart
    ? `${formatUkDate(weekStats.weekStart, "medium")} – ${formatUkDate(weekStats.weekEnd, "medium")}`
    : "This week";

  return (
    <div className="flex flex-col bg-white min-h-full">

      {/* Top bar */}
      <div className="px-4 pt-12 pb-2 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{getTimeGreeting()}, {firstName}</p>
          <h1 className="text-3xl font-black text-black leading-tight mt-0.5">
            {isOnline ? "You're online" : "You're offline"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isOnline
              ? `${todayTrips} trip${todayTrips !== 1 ? "s" : ""} · £${todayEarnings.toFixed(2)} earned today`
              : canGoOnline && dailyCheckDone
                ? "Go online when you're ready to drive"
                : "Complete setup to start earning"}
          </p>
        </div>
        <Link
          to="/driver/settings"
          className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0"
          aria-label="Settings"
        >
          {driver.profile_photo_url ? (
            <img src={driver.profile_photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <Shield className="w-5 h-5 text-gray-600" />
          )}
        </Link>
      </div>

      {/* Stats grid */}
      <div className="px-4 grid grid-cols-2 gap-2.5 mb-4">
        <StatCard label="Today" value={`£${todayEarnings.toFixed(2)}`} sub={`${todayTrips} trip${todayTrips !== 1 ? "s" : ""}`} />
        <StatCard
          label="This week"
          value={loading ? "…" : `£${weekStats.net.toFixed(2)}`}
          sub={loading ? weekLabel : `${weekStats.trips} trips`}
        />
        <StatCard label="Rating" value={rating} sub={driver.total_trips ? `${driver.total_trips} lifetime trips` : "No trips yet"} />
        <StatCard
          label="Best day"
          value={loading ? "…" : bestDay.net > 0 ? `£${bestDay.net.toFixed(2)}` : "—"}
          sub={bestDay.net > 0 ? bestDay.label : "Drive to unlock"}
        />
      </div>

      {/* Action needed */}
      <AnimatePresence>
        {(!canGoOnline || (!dailyCheckDone && !isOnline)) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-4 mb-4"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900 text-sm">
                  {!canGoOnline ? "Setup incomplete" : "Daily check required"}
                </p>
                <p className="text-amber-700 text-xs mt-0.5">
                  {!canGoOnline
                    ? "Assign and verify a vehicle to go online."
                    : "Complete your vehicle check before going online."}
                </p>
                {canGoOnline && !dailyCheckDone && (
                  <Link to="/driver/daily-check">
                    <span className="text-amber-900 font-bold text-xs underline mt-1 inline-block">
                      Complete now →
                    </span>
                  </Link>
                )}
                {!canGoOnline && (
                  <Link to="/driver/settings">
                    <span className="text-amber-900 font-bold text-xs underline mt-1 inline-block">
                      View account →
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map preview */}
      <MapCard
        driverLat={driverLat}
        driverLng={driverLng}
        mapCenter={mapCenterRef.current}
        onExpand={onOpenMap}
      />

      {/* Quick actions */}
      <div className="px-4 mb-5">
        <h2 className="font-black text-black text-sm mb-3">Quick actions</h2>
        <div className="grid grid-cols-4 gap-2">
          <QuickAction icon={Flame} label="Hot areas" onClick={() => onOpenHotAreas?.() || navigate("/driver/hot-areas")} />
          <QuickAction icon={Navigation} label="Destination" onClick={() => navigate("/driver/destination")} />
          <QuickAction icon={PoundSterling} label="Earnings" onClick={() => onTabChange?.("earnings")} />
          <QuickAction
            icon={ClipboardCheck}
            label="Daily check"
            onClick={() => navigate("/driver/daily-check")}
            badge={!dailyCheckDone ? 1 : 0}
          />
          <QuickAction icon={MessageSquare} label="Inbox" onClick={() => onTabChange?.("inbox")} badge={unreadMessages} />
          <QuickAction icon={TrendingUp} label="Full map" onClick={() => onOpenMap?.()} />
          <QuickAction icon={MapPin} label="Incident" onClick={() => navigate("/driver/incident")} />
          <QuickAction icon={Car} label="Vehicle" onClick={() => navigate("/driver/settings")} />
        </div>
      </div>

      {/* Vehicle */}
      {vehicle && (
        <div className="mx-4 mb-5 bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Your vehicle</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-black text-sm">
                {vehicle.colour} {vehicle.make} {vehicle.model}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {vehicle.registration?.toUpperCase()} · {vehicle.vehicle_type?.replace(/_/g, " ") || "PHV"}
              </p>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                driver.vehicle_verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {driver.vehicle_verified ? "Verified" : "Pending"}
            </span>
          </div>
        </div>
      )}

      {/* Recent trip */}
      {recentTrip && (
        <div className="mx-4 mb-5 bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Last trip</p>
          <p className="font-bold text-black text-sm truncate">{recentTrip.dropoff_address || "Dropoff"}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">From {recentTrip.pickup_address || "Pickup"}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
            <span className="font-bold text-black">
              £{((recentTrip.final_fare || recentTrip.fare_estimate || 0) * 0.85).toFixed(2)} net
            </span>
            {recentTrip.completion_time && (
              <span>
                {formatUkPattern(recentTrip.completion_time, "EEE HH:mm")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Opportunities */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-black text-black text-lg">Opportunities</h2>
          <button
            type="button"
            onClick={() => onOpenHotAreas?.() || navigate("/driver/hot-areas")}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
            aria-label="See all opportunities"
          >
            <ChevronRight className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {hotZones.map(zone => (
          <OpportunityCard
            key={zone.id}
            title={`${zone.label} — ${zone.waitMins} wait`}
            subtitle={`~${zone.jobsPerHour} jobs/hr · ${zone.intensity >= 0.7 ? "High demand" : "Moderate demand"}`}
            accent={zone.intensity >= 0.7 ? "orange" : "blue"}
            onClick={() => onOpenHotAreas?.() || navigate("/driver/hot-areas")}
          />
        ))}

        {promotions.map(promo => (
          <OpportunityCard
            key={promo.id}
            title={driverOpportunityTitle(promo)}
            subtitle={promo.description || formatPromoDeadline(promo)}
            accent="green"
            imageUrl={promo.banner_image_url}
            onClick={() => onTabChange?.("earnings")}
          />
        ))}

        {!loading && hotZones.length === 0 && promotions.length === 0 && (
          <p className="text-sm text-gray-500 py-4">No active opportunities right now. Go online to start earning.</p>
        )}

        {bestDay.net > 0 && (
          <div className="mt-4 pb-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Earnings insight</p>
            <p className="font-black text-black text-sm">
              Your best day this week was {bestDay.label} — £{bestDay.net.toFixed(2)} net
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {weekStats.trips > 0
                ? `£${(weekStats.net / Math.max(weekStats.trips, 1)).toFixed(2)} average per trip this week`
                : "Complete trips to see trends"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
