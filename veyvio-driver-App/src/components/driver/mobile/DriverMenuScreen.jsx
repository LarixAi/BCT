/**
 * DriverMenuScreen — Uber-style Menu tab.
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Star, User, LogOut, Car, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DRIVER_SCREEN_TOP } from "@/lib/driverSafeArea";
import { vehicleNavState } from "@/lib/driverNavigation";

const menuItems = [
  { label: "Recent Jobs", path: "/driver/jobs" },
  { label: "Vehicles", path: "/driver/vehicle", linkState: vehicleNavState("menu") },
  { label: "Bank Details", path: "/driver/bank" },
  { label: "Account & Documents", path: "/driver/settings" },
  { label: "Daily Safety Check", path: "/driver/daily-check" },
  { label: "Incident Report", path: "/driver/incident" },
  { label: "Earnings", path: "/driver/earnings" },
];

const secondaryItems = [
  { label: "Help & Support", path: "/driver/help" },
  { label: "About", path: "/driver/about" },
];

function MenuRow({ label, to, linkState, onClick, destructive }) {
  const className = `flex items-center justify-between py-4 border-b border-gray-100 active:bg-gray-50 ${
    destructive ? "text-red-600" : ""
  }`;

  const content = (
    <>
      <span className={`text-[17px] font-semibold ${destructive ? "text-red-600" : "text-black"}`}>
        {label}
      </span>
      {!destructive && <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />}
      {destructive && <LogOut className="w-5 h-5 text-red-400 shrink-0" />}
    </>
  );

  if (to) {
    return (
      <Link to={to} state={linkState} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`w-full text-left ${className}`}>
      {content}
    </button>
  );
}

function VehicleMenuCard({ driver, vehicle }) {
  if (!driver.assigned_vehicle_id) {
    return (
      <Link
        to="/driver/vehicle"
        state={vehicleNavState("menu")}
        className="flex items-center gap-3 mb-5 p-4 rounded-2xl border border-amber-200 bg-amber-50 active:bg-amber-100/80"
      >
        <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0">
          <Car className="w-5 h-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-amber-900 text-sm">No vehicle assigned</p>
          <p className="text-xs text-amber-800 mt-0.5">Tap to view vehicle setup</p>
        </div>
        <ChevronRight className="w-5 h-5 text-amber-400 shrink-0" />
      </Link>
    );
  }

  const verified = driver.vehicle_verified;
  const reg = vehicle?.registration || "Your vehicle";
  const subtitle = vehicle
    ? `${vehicle.colour || ""} ${vehicle.make || ""} ${vehicle.model || ""}`.trim()
    : "Loading…";

  return (
    <Link
      to="/driver/vehicle"
      state={vehicleNavState("menu")}
      className="flex items-center gap-3 mb-5 p-4 rounded-2xl border border-gray-200 bg-gray-50 active:bg-gray-100"
    >
      <div className="w-11 h-11 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0">
        <Car className="w-5 h-5 text-black" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-black text-black text-base truncate">{reg}</p>
          <span
            className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              verified ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {verified ? "Verified" : "Pending"}
          </span>
        </div>
        <p className="text-xs text-gray-600 truncate mt-0.5">{subtitle || "Vehicle & documents"}</p>
        {!verified && (
          <p className="text-[10px] text-amber-700 flex items-center gap-1 mt-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            Upload or renew vehicle documents
          </p>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
    </Link>
  );
}

export default function DriverMenuScreen({ driver, onLogout }) {
  const [vehicle, setVehicle] = useState(null);

  useEffect(() => {
    if (!driver.assigned_vehicle_id) {
      setVehicle(null);
      return;
    }
    let cancelled = false;
    base44.entities.Vehicle.filter({ id: driver.assigned_vehicle_id }, "-created_date", 1)
      .then((rows) => {
        if (!cancelled) setVehicle(rows[0] || null);
      })
      .catch(() => {
        if (!cancelled) setVehicle(null);
      });
    return () => {
      cancelled = true;
    };
  }, [driver.assigned_vehicle_id]);

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain bg-white"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="px-4 pb-6" style={{ paddingTop: DRIVER_SCREEN_TOP }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
            {driver.profile_photo_url ? (
              <img src={driver.profile_photo_url} className="w-16 h-16 rounded-full object-cover" alt="" />
            ) : (
              <User className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div>
            <p className="text-lg font-bold text-black">{driver.full_name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="w-4 h-4 fill-black text-black" />
              <span className="text-sm font-medium text-black">{driver.rating?.toFixed(2) || "—"}</span>
            </div>
          </div>
        </div>

        <VehicleMenuCard driver={driver} vehicle={vehicle} />

        {menuItems.map((item) => (
          <MenuRow key={item.label} label={item.label} to={item.path} linkState={item.linkState} />
        ))}

        <div className="my-2 border-t border-gray-100" />

        {secondaryItems.map((item) => (
          <MenuRow key={item.label} label={item.label} to={item.path} />
        ))}

        <div className="mt-2">
          <MenuRow label="Sign out" onClick={onLogout} destructive />
        </div>
      </div>
    </div>
  );
}
