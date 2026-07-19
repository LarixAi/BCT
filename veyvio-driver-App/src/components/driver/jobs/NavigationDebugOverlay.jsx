/**
 * Phase-0 dev-only navigation diagnostics overlay.
 *
 * Visible only when `VITE_NAV_DEBUG=true`. Sits in the top-left of the Jobs
 * map and shows live engine state so we can eyeball snap quality, reroute
 * strikes, accuracy and route source on a real drive without leaving the app.
 *
 * The overlay is render-light: it polls the engine snapshot getter at 1 Hz
 * via setState, so it does not pile up React work between fixes.
 */
import { useEffect, useState } from "react";

const ENABLED = import.meta.env.VITE_NAV_DEBUG === "true";

function fmt(value, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function fmtInt(value) {
  if (value == null || !Number.isFinite(value)) return "—";
  return Math.round(value).toString();
}

function StaleBadge({ ageMs }) {
  if (ageMs == null) return null;
  const seconds = ageMs / 1000;
  const colour =
    seconds < 1.5 ? "bg-emerald-500" : seconds < 3 ? "bg-amber-500" : "bg-rose-500";
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colour} mr-1.5 align-middle`} />
  );
}

export default function NavigationDebugOverlay({
  navigation,
  cameraMode,
  driverHeading,
  freePanned = false,
}) {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    if (!ENABLED) return undefined;
    const get = navigation?.getEngineSnapshot;
    if (typeof get !== "function") return undefined;
    setSnapshot(get());
    const id = window.setInterval(() => setSnapshot(get()), 1000);
    return () => window.clearInterval(id);
  }, [navigation]);

  if (!ENABLED || !navigation) return null;

  const display = navigation.driverLocation;
  const raw = navigation.rawLocation;
  const off = navigation.offRoute ?? {};
  const route = navigation.route;
  const roads = navigation.roadsCorrection ?? null;

  return (
    <div
      className="absolute top-3 right-[68px] z-[5] pointer-events-none"
      style={{ maxWidth: "42vw" }}
    >
      <div className="rounded-lg bg-black/70 text-white text-[9px] font-mono leading-tight px-2 py-1.5 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 font-bold mb-1 text-[11px]">
          <StaleBadge ageMs={navigation.staleAgeMs} />
          NAV-DEBUG · {route?.source ?? "no-route"}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <span>cam</span>
          <span className={freePanned ? "text-amber-300" : "text-emerald-300"}>
            {cameraMode}{freePanned ? " · pan" : ""}
          </span>
          <span>head</span><span>{fmt(driverHeading, 0)}°</span>
          <span>spd</span><span>{fmt(display?.speed, 1)} m/s</span>
          <span>acc</span><span>{fmtInt(display?.accuracy)} m</span>
          <span>snap</span>
          <span className={navigation.snapped ? "text-emerald-300" : "text-amber-300"}>
            {navigation.snapped ? "yes" : "no"} · {fmtInt(off.distanceM)} m
          </span>
          <span>strikes</span>
          <span className={off.strikes >= 2 ? "text-rose-300" : ""}>
            {off.strikes ?? 0}/3
          </span>
          <span>along</span><span>{fmtInt(navigation.alongRouteM)} m</span>
          <span>fixAge</span><span>{fmtInt(navigation.staleAgeMs)} ms</span>
        </div>
        {roads?.enabled ? (
          <div className="mt-1 pt-1 border-t border-white/10 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
            <span className="font-bold col-span-2 text-cyan-300">Roads (Phase 4)</span>
            <span>drift</span>
            <span className={roads.driftMetres > 25 ? "text-rose-300" : "text-emerald-300"}>
              {fmtInt(roads.driftMetres)} m
            </span>
            <span>pts</span><span>{roads.pointsChecked ?? 0}</span>
            {roads.fallbackReason ? (
              <>
                <span>fb</span>
                <span className="text-amber-300">{roads.fallbackReason}</span>
              </>
            ) : null}
            {roads.rejectedByRouteGuard ? (
              <span className="col-span-2 text-amber-300">guard rejected last snap</span>
            ) : null}
          </div>
        ) : null}
        {raw && display ? (
          <div className="mt-1 pt-1 border-t border-white/10 text-[9px] text-white/70">
            raw {fmt(raw.latitude, 5)},{fmt(raw.longitude, 5)} → snap{" "}
            {fmt(display.latitude, 5)},{fmt(display.longitude, 5)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
