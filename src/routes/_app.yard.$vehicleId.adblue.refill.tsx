import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Clock, Droplets, Gauge, MapPin, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RegPlate } from "@/components/yard/primitives";
import { useYard } from "@/store/yard";
import type {
  AdBlueFillType,
  AdBlueRefillSource,
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

function AdBlueRefillPage() {
  const { vehicleId } = Route.useParams();
  const navigate = useNavigate();
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const allRefills = useYard(s => s.adblueRefills);
  const recordRefill = useYard(s => s.recordAdBlueRefill);

  const history = useMemo(
    () => allRefills.filter(record => record.vehicleId === vehicleId),
    [allRefills, vehicleId],
  );

  const [occurredAt, setOccurredAt] = useState(localDateTimeValue());
  const [odometerMiles, setOdometerMiles] = useState(
    history[0]?.odometerMiles ? String(history[0].odometerMiles) : "",
  );
  const [quantityLitres, setQuantityLitres] = useState("");
  const [fillType, setFillType] = useState<AdBlueFillType>("full");
  const [source, setSource] = useState<AdBlueRefillSource>("depot-dispenser");
  const [sourceLabel, setSourceLabel] = useState("Pump D-02");
  const [warningState, setWarningState] = useState<AdBlueWarningState>("none");
  const [spillOrContamination, setSpillOrContamination] = useState(false);
  const [note, setNote] = useState("");

  if (!vehicle) throw notFound();

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
        spillOrContamination,
        note,
      });
      toast.success(`${record.quantityLitres} litres recorded for ${vehicle.reg} at ${record.odometerMiles.toLocaleString("en-GB")} miles.`);
      if (warningState === "system-fault" || warningState === "no-restart") {
        toast.warning("The emissions-system warning still needs workshop assessment.");
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Vehicle fluid record</p>
            <div className="mt-2 flex items-center gap-3">
              <RegPlate reg={vehicle.reg} tone={vehicle.status === "VOR" ? "vor" : "default"} className="text-base" />
              <span className="text-xs text-muted">Bay {vehicle.bayId} · {vehicle.type}</span>
            </div>
            <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">Record AdBlue refill</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Capture quantity, mileage and warning state so usage remains auditable by vehicle.
            </p>
          </div>
          <Droplets className="size-7 text-primary" aria-hidden />
        </div>
      </header>

      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:items-start">
        <div className="space-y-5">
          <section className="space-y-4 rounded-lg border border-border bg-white p-4 sm:p-5">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-widest">Refill details</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date and time" icon={<Clock />}>
                <Input
                  required
                  type="datetime-local"
                  value={occurredAt}
                  onChange={event => setOccurredAt(event.target.value)}
                />
              </Field>
              <Field label="Odometer (miles)" icon={<Gauge />}>
                <Input
                  required
                  min="0"
                  step="1"
                  inputMode="numeric"
                  type="number"
                  value={odometerMiles}
                  onChange={event => setOdometerMiles(event.target.value)}
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
                onChange={event => setQuantityLitres(event.target.value)}
                placeholder="18.4"
                className="h-12 text-lg font-bold tabular-nums"
              />
            </Field>

            <div>
              <label className="text-xs font-bold">Fill type</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {([
                  ["full", "Filled to full"],
                  ["partial", "Partial"],
                  ["emergency", "Emergency"],
                ] as const).map(([value, label]) => (
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
                <Input
                  value={sourceLabel}
                  onChange={event => setSourceLabel(event.target.value)}
                  placeholder="Pump, supplier or station"
                />
              </Field>
            </div>

            <SelectField
              label="Dashboard warning state"
              value={warningState}
              onChange={value => setWarningState(value as AdBlueWarningState)}
              options={[
                ["none", "No warning"],
                ["low", "Low AdBlue warning"],
                ["no-restart", "No-restart countdown"],
                ["system-fault", "SCR / emissions-system fault"],
              ]}
            />

            {(warningState === "no-restart" || warningState === "system-fault") && (
              <div className="flex gap-3 rounded-lg border border-vor/30 bg-vor/5 p-3 text-sm text-vor">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>
                  Record the refill, but do not treat the warning as resolved. The vehicle needs workshop assessment.
                </p>
              </div>
            )}

            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={spillOrContamination}
                onChange={event => setSpillOrContamination(event.target.checked)}
                className="size-4 accent-primary"
              />
              A spill or possible contamination occurred
            </label>

            <Field label="Operational note">
              <textarea
                value={note}
                onChange={event => setNote(event.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                placeholder="Optional context, warning message or receipt reference"
              />
            </Field>
          </section>

          <Button type="submit" className="min-h-[52px] w-full rounded-[14px] bg-accent text-sm font-extrabold text-white hover:bg-accent/90">
            Record AdBlue refill
          </Button>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <section className="rounded-lg border border-border bg-white p-4">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-widest">Audit record</h2>
            <dl className="mt-3 space-y-3 text-xs">
              <AuditRow label="Vehicle" value={vehicle.reg} />
              <AuditRow label="Current bay" value={vehicle.bayId} />
              <AuditRow label="Recorded by" value="Signed-in Yard user" />
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
