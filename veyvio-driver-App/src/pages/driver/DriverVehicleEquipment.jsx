import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, CircleAlert, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  OperationalPage,
  DriverSectionTitle,
  StatusPill,
} from "./DriverOperationalPageParts";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { DRIVER_NAV_TOTAL_OFFSET } from "@/lib/driverSafeArea";
import { refreshCommandBootstrap } from "@/services/command-driver-ops.service";

const EQUIPMENT_GROUPS = [
  {
    id: "safety",
    title: "Safety equipment",
    items: [
      { id: "first_aid", label: "First-aid kit" },
      { id: "fire_extinguisher", label: "Fire extinguisher" },
      { id: "glass_hammer", label: "Glass hammer / exit tool" },
      { id: "seatbelt_cutter", label: "Seat-belt cutter" },
      { id: "hi_vis", label: "High-visibility vest" },
    ],
  },
  {
    id: "accessibility",
    title: "Accessibility equipment",
    optionalUnlessAccessible: true,
    items: [
      { id: "wheelchair_restraints", label: "Wheelchair restraint set" },
      { id: "ramp_or_lift", label: "Ramp / lift" },
    ],
  },
  {
    id: "ops",
    title: "Operations kit",
    items: [
      { id: "cleaning_ppe", label: "Cleaning and PPE kit" },
      { id: "fuel_card", label: "Fuel / charging card" },
      { id: "keys", label: "Vehicle keys" },
      { id: "phone_holder", label: "Driver phone holder" },
    ],
  },
];

function storageKey(driverId, reg) {
  return `veyvio.equipment.v1.${driverId || "driver"}.${reg || "vehicle"}`;
}

function emptyState() {
  return {
    present: {},
    notFitted: {},
    confirmedAt: null,
  };
}

function formatConfirmedAt(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function DriverVehicleEquipment({ driver }) {
  const { session } = useDriverSupabaseAuth();
  const [reg, setReg] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [accessible, setAccessible] = useState(false);
  const [state, setState] = useState(emptyState);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    void (async () => {
      const depotId = session?.activeDepotId ?? session?.depots?.[0]?.id ?? null;
      const boot = await refreshCommandBootstrap(depotId).catch(() => null);
      const duty = boot?.ok ? boot.bootstrap?.duties?.[0] : null;
      const vehicle = duty?.vehicle;
      const nextReg =
        vehicle?.registrationNumber ||
        vehicle?.registration ||
        driver?.assignedVehicleRegistration ||
        "";
      const wheelchair =
        Number(vehicle?.wheelchairCapacity ?? 0) > 0 ||
        Boolean(vehicle?.wheelchairAccessible);

      setReg(nextReg);
      setMakeModel([vehicle?.make, vehicle?.model].filter(Boolean).join(" "));
      setAccessible(wheelchair);

      try {
        const raw = localStorage.getItem(storageKey(driver?.id, nextReg));
        if (raw) {
          const parsed = JSON.parse(raw);
          setState({
            present: parsed.present ?? {},
            notFitted: parsed.notFitted ?? {},
            confirmedAt: parsed.confirmedAt ?? null,
          });
          if (parsed.confirmedAt) {
            setSavedMsg(`Confirmed ${formatConfirmedAt(parsed.confirmedAt)}.`);
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, [driver?.id, driver?.assignedVehicleRegistration, session?.activeDepotId, session?.depots]);

  const groups = useMemo(() => {
    return EQUIPMENT_GROUPS.map((group) => {
      const optional = Boolean(group.optionalUnlessAccessible) && !accessible;
      return {
        ...group,
        optional,
        title: optional ? `${group.title} (if fitted)` : group.title,
      };
    });
  }, [accessible]);

  const requiredItems = useMemo(
    () => groups.flatMap((g) => (g.optional ? [] : g.items)),
    [groups],
  );

  const isDone = (itemId) => Boolean(state.present[itemId] || state.notFitted[itemId]);

  const confirmedRequired = requiredItems.filter((item) => isDone(item.id)).length;
  const remaining = requiredItems.length - confirmedRequired;
  const allRequiredDone = remaining === 0;
  const progressPct = Math.round(
    (confirmedRequired / Math.max(requiredItems.length, 1)) * 100,
  );

  const locked = Boolean(state.confirmedAt);

  const setPresent = (id) => {
    if (locked) return;
    setState((prev) => ({
      ...prev,
      present: { ...prev.present, [id]: !prev.present[id] },
      notFitted: { ...prev.notFitted, [id]: false },
    }));
  };

  const setNotFitted = (id) => {
    if (locked) return;
    setState((prev) => ({
      ...prev,
      notFitted: { ...prev.notFitted, [id]: !prev.notFitted[id] },
      present: { ...prev.present, [id]: false },
    }));
  };

  const markAllRequiredPresent = () => {
    if (locked) return;
    setState((prev) => {
      const present = { ...prev.present };
      for (const item of requiredItems) present[item.id] = true;
      return { ...prev, present };
    });
  };

  const saveConfirmation = () => {
    if (!allRequiredDone || !reg) return;
    const next = {
      present: state.present,
      notFitted: state.notFitted,
      confirmedAt: new Date().toISOString(),
      registration: reg,
    };
    try {
      localStorage.setItem(storageKey(driver?.id, reg), JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setState(next);
    setSavedMsg(`Confirmed ${formatConfirmedAt(next.confirmedAt)}.`);
  };

  const clearConfirmation = () => {
    const next = emptyState();
    try {
      localStorage.setItem(storageKey(driver?.id, reg), JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setState(next);
    setSavedMsg("");
  };

  return (
    <OperationalPage
      title="Vehicle equipment"
      subtitle="Tap each item that is present and serviceable."
      backTo="/vehicle"
    >
      <div className={`p-4 ${op.card}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Vehicle
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {reg || "No vehicle"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {makeModel || "From your published duty"}
              {accessible ? " · Wheelchair accessible" : ""}
            </p>
          </div>
          <StatusPill
            status={
              locked ? "good" : allRequiredDone ? "warning" : remaining === requiredItems.length ? "neutral" : "warning"
            }
          >
            {locked ? "Confirmed" : allRequiredDone ? "Ready" : `${confirmedRequired}/${requiredItems.length}`}
          </StatusPill>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-sm">
            <span className="font-medium text-foreground">
              {locked
                ? "Equipment confirmed"
                : allRequiredDone
                  ? "All required items checked"
                  : `${remaining} required item${remaining === 1 ? "" : "s"} left`}
            </span>
            <span className="tabular-nums text-muted-foreground">{progressPct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/90">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                locked || allRequiredDone ? "bg-emerald-600" : "bg-[var(--ridova-teal)]"
              }`}
              style={{ width: `${Math.max(progressPct, progressPct > 0 ? 6 : 0)}%` }}
            />
          </div>
        </div>

        {!locked && remaining > 0 && remaining < requiredItems.length ? (
          <button
            type="button"
            onClick={markAllRequiredPresent}
            className="mt-3 text-sm font-semibold text-[var(--ridova-teal)]"
          >
            Mark remaining required as present
          </button>
        ) : null}
      </div>

      {!reg ? (
        <div className={`mt-4 p-4 ${op.card}`}>
          <p className="font-semibold">No vehicle assigned</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Equipment checks appear once a duty with a vehicle is published.
          </p>
          <Button asChild className={`mt-4 h-11 w-full ${op.primaryBtn}`}>
            <Link to="/vehicle">Back to vehicle</Link>
          </Button>
        </div>
      ) : (
        <div style={{ paddingBottom: `calc(${DRIVER_NAV_TOTAL_OFFSET} + 9.5rem)` }}>
          {groups.map((group) => (
            <div key={group.id} className="mt-1">
              <div className="flex items-end justify-between gap-2">
                <DriverSectionTitle>{group.title}</DriverSectionTitle>
                {group.optional ? (
                  <span className="mb-2 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Optional
                  </span>
                ) : null}
              </div>
              <div className={op.listCard}>
                {group.items.map((item) => {
                  const present = Boolean(state.present[item.id]);
                  const notFitted = Boolean(state.notFitted[item.id]);
                  const done = present || notFitted;
                  return (
                    <div
                      key={item.id}
                      className={`border-b border-border last:border-b-0 ${
                        present
                          ? "bg-emerald-50/70"
                          : notFitted
                            ? "bg-muted/40"
                            : "bg-card"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => setPresent(item.id)}
                        className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-80"
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 transition-colors ${
                            present
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {present ? <Check className="h-4 w-4 stroke-[2.5]" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold text-foreground">
                            {item.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {present
                              ? "Present and serviceable"
                              : notFitted
                                ? "Not fitted on this vehicle"
                                : "Tap if present"}
                          </span>
                        </span>
                        {done && present ? (
                          <span className="shrink-0 text-xs font-semibold text-emerald-700">
                            Present
                          </span>
                        ) : null}
                      </button>
                      {group.optional && !locked ? (
                        <div className="flex justify-end px-4 pb-3">
                          <button
                            type="button"
                            onClick={() => setNotFitted(item.id)}
                            className={`text-xs font-semibold ${
                              notFitted ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {notFitted ? "Marked not fitted" : "Not fitted"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {savedMsg ? (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-950">
              {savedMsg}
            </p>
          ) : null}

          <div
            className="fixed inset-x-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md"
            style={{ bottom: DRIVER_NAV_TOTAL_OFFSET }}
          >
            <div className="mx-auto w-full max-w-lg space-y-2">
              {!locked ? (
                <Button
                  type="button"
                  disabled={!allRequiredDone}
                  onClick={saveConfirmation}
                  className={`h-12 w-full ${op.primaryBtn} disabled:opacity-45`}
                >
                  <PackageCheck className="mr-2 h-5 w-5" />
                  {allRequiredDone
                    ? "Confirm equipment present"
                    : `Confirm when ${remaining} left`}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearConfirmation}
                  className="h-12 w-full"
                >
                  Edit confirmation
                </Button>
              )}
              <Button
                asChild
                variant="outline"
                className="h-11 w-full border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100"
              >
                <Link to="/defects">
                  <CircleAlert className="mr-2 h-4 w-4" />
                  Report missing or damaged
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </OperationalPage>
  );
}
