import { Link } from "react-router-dom";
import { Maximize2, User } from "lucide-react";
import { MapContainer } from "react-leaflet";
import DriverMapTileLayer from "@/components/driver/mobile/DriverMapTileLayer";
import SmoothDriverMarker from "@/components/driver/mobile/SmoothDriverMarker";
import JobStopsRouteMap from "@/components/driver/jobs/JobStopsRouteMap";
import { DriverHeaderActionButtons } from "@/components/driver/operational/DriverHeaderIconButton";
import { createDriverLocationDot } from "@/components/driver/mobile/driverLocationIcon";
import { DRIVER_MAP_CLASS } from "@/lib/driverMapTheme";
import { DRIVER_MAP_LEAFLET_OPTIONS } from "@/lib/driverMapLeafletOptions";

const driverDot = createDriverLocationDot(12);

export default function JobsHubMapPreview({
  driverLat,
  driverLng,
  mapCenter,
  stops,
  onExpand,
}) {
  return (
    <div
      className="relative mb-4 rounded-2xl overflow-hidden border border-gray-200 cursor-pointer h-[min(360px,42dvh)] min-h-[260px]"
      style={{ isolation: "isolate" }}
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onExpand?.()}
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
        {stops?.length ? (
          <JobStopsRouteMap stops={stops} driverLat={driverLat} driverLng={driverLng} compact />
        ) : null}
        <SmoothDriverMarker lat={driverLat} lng={driverLng} icon={driverDot} />
      </MapContainer>

      <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full shadow-sm pointer-events-none">
        <p className="text-[10px] font-semibold text-gray-600">Tap for full map</p>
      </div>

      <button
        type="button"
        onClick={(e) => {
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

export function JobsHubHeader({ headline, subline, onSafetyClick, onSettingsClick }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-foreground">{headline}</h1>
        {subline ? <p className="mt-0.5 text-sm text-muted-foreground">{subline}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <DriverHeaderActionButtons onSafetyClick={onSafetyClick} onSettingsClick={onSettingsClick} />
        <Link
          to="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card active:bg-muted"
          aria-label="Open profile"
        >
          <User className="h-5 w-5 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
