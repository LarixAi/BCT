import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Clock, Droplets, Gauge, MapPin, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RegPlate } from "@/components/yard/primitives";
import { getActorName } from "@/platform/yard/get-actor-name";
import { useYard } from "@/store/yard";
import type {
  AdBlueFillType,
  AdBluePhysicallyAddedBy,
  AdBlueRefillSource,
  AdBlueWarningCleared,
  AdBlueWarningState,
} from "@/types/fluids";

export const Route = createFileRoute("/_app/yard/$vehicleId/adblue/refill")({
  head: ({ params }) => ({
    meta: [
      { title: `Record AdBlue refill — ${params.vehicleId} — Veyvio Yard` },
      { name: "description", content: "Record vehicle AdBlue quantity, mileage and warning state." },
    ],
  }),
  component: AdBlueRefillPage,
  notFoundComponent: () => <p className="p-8 text-center text-muted">Vehicle not found.</p>,
});

function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

type WizardStep = 1 | 2 | 3;

function AdBlueRefillPage() {
  const { vehicleId } = Route.useParams();
  const navigate = useNavigate();
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const allRefills = useYard(s => s.adblueRefills);
  const recordRefill = useYard(s => s.recordAdBlueRefill);
  const actorName = getActorName();

  const history = useMemo(
    () => allRefills.filter(record => record.vehicleId === vehicleId),
    [allRefills, vehicleId],
  );

  const [step, setStep] = useState<WizardStep>(1);
  const [confirmed, setConfirmed] = useState(false);
  const [occurredAt, setOccurredAt] = useState(localDateTimeValue());
  const [odometerMiles, setOdometerMiles] = useState(
    history[0]?.odometerMiles ? String(history[0].odometerMiles) : "",
  );
  const [quantityLitres, setQuantityLitres] = useState("");
  const [fillType, setFillType] = useState<AdBlueFillType>("full");
  const [source, setSource] = useState<AdBlueRefillSource>("depot-dispenser");
  const [sourceLabel, setSourceLabel] = useState("Pump D-02");
  const [warningState, setWarningState] = useState<AdBlueWarningState>("none");
  const [warningCleared, setWarningCleared] = useState<AdBlueWarningCleared>("yes");
  const [physicallyAddedBy, setPhysicallyAddedBy] = useState<AdBluePhysicallyAddedBy>("self");
  const [physicallyAddedByName, setPhysicallyAddedByName] = useState("");
  const [spillOrContamination, setSpillOrContamination] = useState(false);
  const [note, setNote] = useState("");

  if (!vehicle) throw notFound();

  const previousMileage = history[0]?.odometerMiles;

  function goNext() {
    if (step === 1 && !confirmed) {
      toast.error("Confirm you are recording AdBlue for this vehicle.");
      return;
    }
    if (step === 2) {
      if (!Number.isFinite(Number(odometerMiles)) || Number(odometerMiles) < 0) {
        toast.error("Enter a valid odometer reading.");
        return;
      }
      if (!Number.isFinite(Number(quantityLitres)) || Number(quantityLitres) <= 0) {
        toast.error("Enter how many litres of AdBlue were added.");
        return;
      }
    }
    setStep(s => (s < 3 ? ((s + 1) as WizardStep) : s));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const record = recordRefill(vehicleId, {
        occurredAt: new Date(occurredAt).toISOString(),
        odometerMiles: Number(odometerMiles),
        quantityLitres: Number(quantityLitres),
        fillType,
        source,
        sourceLabel,
        warningState,
        warningCleared,
        spillOrContamination,
        physicallyAddedBy,
        physicallyAddedByName: physicallyAddedBy === "self" ? undefined : physicallyAddedByName,
        note,
      });
      toast.success(
        `${record.quantityLitres} litres recorded for ${vehicle.reg} at ${record.odometerMiles.toLocaleString("en-GB")} miles.`,
      );
      if (record.createDefectSuggested) {
        toast.warning("AdBlue warning did not clear — raise an AdBlue system defect for workshop review.");
      }
      void navigate({ to: "/yard/$vehicleId", params: { vehicleId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AdBlue refill could not be recorded.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 animate-in-up">
      <Link
        to="/yard/$vehicleId"
        params={{ vehicleId }}
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3" aria-hidden />
        Vehicle record
      </Link>

      <header className="rounded-lg border border-border bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">AdBlue — not diesel or petrol</p>
            <div className="mt-2 flex items-center gap-3">
              <RegPlate reg={vehicle.reg} tone={vehicle.status === "VOR" ? "vor" : "default"} className="text-base" />
              <span className="text-xs text-muted">Bay {vehicle.bayId} · {vehicle.type}</span>
            </div>
            <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">Record AdBlue</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              AdBlue goes in the blue emissions tank only — never the fuel tank. Record litres, mileage and warning clearance.
            </p>
          </div>
          <Droplets className="size-7 text-primary" aria-hidden />
        </div>
        <ol className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest">
          {(["Confirm vehicle", "Mileage & litres", "Source & warning"] as const).map((label, index) => {
            const n = (index + 1) as WizardStep;
            return (
              <li
                key={label}
                className={`rounded-full px-3 py-1.5 ${
                  step === n ? "bg-primary text-white" : step > n ? "bg-primary/15 text-foreground" : "bg-muted/40 text-muted"
                }`}
              >
                {n}. {label}
              </li>
            );
          })}
        </ol>
      </header>

      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:items-start">
        <div className="space-y-5">
          {step === 1 && (
            <section className="space-y-4 rounded-lg border border-border bg-white p-4 sm:p-5">
              <h2 className="font-display text-sm font-extrabold uppercase tracking-widest">Confirm vehicle</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted">Registration</dt>
                  <dd className="font-bold">{vehicle.reg}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Bay</dt>
                  <dd className="font-bold">{vehicle.bayId}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Type</dt>
                  <dd className="font-bold">{vehicle.type}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Previous mileage</dt>
                  <dd className="font-bold tabular-nums">
                    {previousMileage != null ? `${previousMileage.toLocaleString("en-GB")} miles` : "No prior AdBlue reading"}
                  </dd>
                </div>
              </dl>
              <label className="flex min-h-12 items-start gap-3 rounded-lg border border-border p-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={event => setConfirmed(event.target.checked)}
                  className="mt-0.5 size-4 accent-primary"
                />
                I am recording AdBlue for this vehicle
              </label>
              <Button type="button" onClick={goNext} className="min-h-[52px] w-full rounded-[14px] bg-accent text-sm font-extrabold text-white">
                Continue
              </Button>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4 rounded-lg border border-border bg-white p-4 sm:p-5">
              <h2 className="font-display text-sm font-extrabold uppercase tracking-widest">Mileage and litres</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date and time" icon={<Clock />}>
                  <Input required type="datetime-local" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} />
                </Field>
                <Field label="Odometer (miles)" icon={<Gauge />}>
                  <Input
                    required
                    min="0"
                    step="1"
                    inputMode="numeric"
                    type="number"
                    value={odometerMiles}
                    onChange={e => setOdometerMiles(e.target.value)}
                    placeholder="82416"
                  />
                </Field>
              </div>
              <Field label="Quantity added (litres)" icon={<Droplets />}>
                <Input
                  required
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  type="number"
                  value={quantityLitres}
                  onChange={e => setQuantityLitres(e.target.value)}
                  placeholder="18.4"
                  className="h-12 text-lg font-bold tabular-nums"
                />
              </Field>
              <div>
                <label className="text-xs font-bold">Fill type</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["full", "Filled to full"],
                      ["partial", "Partial"],
                      ["emergency", "Emergency"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFillType(value)}
                      className={`min-h-11 rounded-full border px-3 text-xs font-bold ${
                        fillType === value
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-white text-muted hover:border-primary/50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="min-h-[52px] flex-1">
                  Back
                </Button>
                <Button type="button" onClick={goNext} className="min-h-[52px] flex-1 rounded-[14px] bg-accent font-extrabold text-white">
                  Continue
                </Button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4 rounded-lg border border-border bg-white p-4 sm:p-5">
              <h2 className="font-display text-sm font-extrabold uppercase tracking-widest">Source and warning</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Refill source"
                  value={source}
                  onChange={value => setSource(value as AdBlueRefillSource)}
                  options={[
                    ["depot-dispenser", "Depot dispenser"],
                    ["retail-station", "Retail filling station"],
                    ["container", "Container or bottle"],
                    ["mobile-service", "Mobile service unit"],
                  ]}
                />
                <Field label="Source reference" icon={<MapPin />}>
                  <Input value={sourceLabel} onChange={e => setSourceLabel(e.target.value)} placeholder="Pump, supplier or station" />
                </Field>
              </div>
              <SelectField
                label="Warning before top-up"
                value={warningState}
                onChange={value => setWarningState(value as AdBlueWarningState)}
                options={[
                  ["none", "No warning"],
                  ["low", "Low AdBlue warning"],
                  ["no-restart", "No-restart countdown"],
                  ["system-fault", "SCR / emissions-system fault"],
                ]}
              />
              <SelectField
                label="Did the warning clear?"
                value={warningCleared}
                onChange={value => setWarningCleared(value as AdBlueWarningCleared)}
                options={[
                  ["yes", "Yes"],
                  ["no", "No"],
                  ["not_checked", "Not checked"],
                  ["requires_drive", "Needs driving before update"],
                ]}
              />
              <SelectField
                label="Who physically added the AdBlue?"
                value={physicallyAddedBy}
                onChange={value => setPhysicallyAddedBy(value as AdBluePhysicallyAddedBy)}
                options={[
                  ["self", "I added it"],
                  ["other_staff", "Another staff member"],
                  ["external", "External supplier or mechanic"],
                ]}
              />
              {physicallyAddedBy !== "self" && (
                <Field label="Name of person who added AdBlue">
                  <Input
                    required
                    value={physicallyAddedByName}
                    onChange={e => setPhysicallyAddedByName(e.target.value)}
                    placeholder="Full name"
                  />
                </Field>
              )}
              {(warningCleared === "no" || warningState === "no-restart" || warningState === "system-fault") && (
                <div className="flex gap-3 rounded-lg border border-vor/30 bg-vor/5 p-3 text-sm text-vor">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>Do not treat this as a completed routine top-up only. Raise an AdBlue system defect after submit.</p>
                </div>
              )}
              <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={spillOrContamination}
                  onChange={e => setSpillOrContamination(e.target.checked)}
                  className="size-4 accent-primary"
                />
                A spill or possible contamination occurred
              </label>
              <Field label="Operational note">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Optional context or receipt reference"
                />
              </Field>

              <div className="rounded-lg border border-border bg-slate-50 p-3 text-sm">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted">
                  <Check className="size-3.5" aria-hidden /> Review
                </p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>
                    <span className="text-muted">Recorded by</span> · {actorName} · Yard operative
                  </li>
                  <li>
                    <span className="text-muted">When</span> · {new Date(occurredAt).toLocaleString("en-GB")}
                  </li>
                  <li>
                    <span className="text-muted">Amount</span> · {quantityLitres || "—"} L at {odometerMiles || "—"} miles
                  </li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="min-h-[52px] flex-1">
                  Back
                </Button>
                <Button type="submit" className="min-h-[52px] flex-1 rounded-[14px] bg-accent text-sm font-extrabold text-white hover:bg-accent/90">
                  Confirm AdBlue record
                </Button>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <section className="rounded-lg border border-border bg-white p-4">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-widest">Audit record</h2>
            <dl className="mt-3 space-y-3 text-xs">
              <AuditRow label="Vehicle" value={vehicle.reg} />
              <AuditRow label="Current bay" value={vehicle.bayId} />
              <AuditRow label="Recorded by" value={actorName} />
              <AuditRow label="Sync" value="Saved on device, then uploaded" />
            </dl>
          </section>

          {history.length > 0 && (
            <section className="rounded-lg border border-border bg-white p-4">
              <h2 className="font-display text-sm font-extrabold uppercase tracking-widest">Recent refills</h2>
              <div className="mt-3 space-y-3">
                {history.slice(0, 3).map(record => (
                  <div key={record.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold tabular-nums">{record.quantityLitres} litres</span>
                      <span className="text-[10px] text-muted">
                        {new Date(record.occurredAt).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted">
                      {record.odometerMiles.toLocaleString("en-GB")} miles · {record.recordedBy}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </form>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center gap-1.5 text-xs font-bold">
        {icon && <span className="[&>svg]:size-3.5 text-muted" aria-hidden>{icon}</span>}
        {label}
      </span>
      {children}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function AuditRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-bold">{value}</dd>
    </div>
  );
}
