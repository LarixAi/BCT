import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import ScheduleMonthCalendar from "@/components/driver/schedule/ScheduleMonthCalendar";
import {
  OperationalPage,
  StatusPill,
} from "./DriverOperationalPageParts";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { Button } from "@/components/ui/button";
import { localToday } from "@/lib/local-date";
import { op } from "@/lib/driver-operational-theme";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import {
  TYPE_LABELS,
  formatDateRange,
  submitDriverTimeOffRequest,
} from "@/services/time-off.service";

/** Calendar-first flow: pick days on the month grid, then details, then review. */
const STEPS = ["Dates", "Details", "Review"];

const TYPES = [
  {
    id: "holiday",
    label: "Annual leave",
    detail: "Paid holiday — deducts from your balance",
  },
  {
    id: "unpaid",
    label: "Unpaid leave",
    detail: "Time off without using holiday entitlement",
  },
  {
    id: "medical_appointment",
    label: "Medical appointment",
    detail: "GP, hospital, or occupational health",
  },
  {
    id: "emergency",
    label: "Emergency dependant leave",
    detail: "Urgent care for a dependant",
  },
  {
    id: "compassionate",
    label: "Compassionate leave",
    detail: "Bereavement or family emergency (paid where configured)",
  },
  {
    id: "sick",
    label: "Sickness",
    detail: "Unable to work — tell dispatch ASAP",
  },
  {
    id: "other",
    label: "Other",
    detail: "Other authorised absence",
  },
];

const PARTS = [
  { value: "full_day", label: "Full day(s)" },
  { value: "am", label: "Morning only" },
  { value: "pm", label: "Afternoon only" },
];

function WizardProgress({ step }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-2">
        {STEPS.map((label, index) => {
          const active = index === step;
          const done = index < step;
          return (
            <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? "bg-emerald-600 text-white"
                    : active
                      ? "bg-[var(--ridova-teal)] text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={`truncate text-[10px] font-semibold uppercase tracking-wide ${
                  active || done ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[var(--ridova-teal)] transition-all"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function DriverTimeOffRequest({ driver }) {
  const { session } = useDriverSupabaseAuth();
  const [searchParams] = useSearchParams();
  const backTo = searchParams.get("from") === "schedule" ? "/schedule" : "/holiday";
  const presetStart = searchParams.get("start") || "";

  const [step, setStep] = useState(0);
  const [absenceType, setAbsenceType] = useState("holiday");
  const [month, setMonth] = useState(() => {
    const base = presetStart || localToday();
    const d = new Date(`${base}T12:00:00`);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [dateFrom, setDateFrom] = useState(presetStart || "");
  const [dateTo, setDateTo] = useState(presetStart || "");
  const [pickingEnd, setPickingEnd] = useState(Boolean(presetStart));
  const [partOfDay, setPartOfDay] = useState("full_day");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  const today = localToday();
  const selection = useMemo(
    () => (dateFrom ? { from: dateFrom, to: dateTo || dateFrom } : null),
    [dateFrom, dateTo],
  );

  const onSelectDate = (iso) => {
    setError("");
    if (!dateFrom || (dateFrom && dateTo && !pickingEnd)) {
      setDateFrom(iso);
      setDateTo(iso);
      setPickingEnd(true);
      return;
    }
    if (pickingEnd) {
      if (iso < dateFrom) {
        setDateFrom(iso);
        setDateTo(dateFrom);
      } else {
        setDateTo(iso);
      }
      setPickingEnd(false);
    }
  };

  const canContinueDates = Boolean(dateFrom && (dateTo || dateFrom));
  const canContinueDetails = absenceType !== "sick" || Boolean(reason.trim());

  const submit = async () => {
    setSaving(true);
    setError("");
    const result = await submitDriverTimeOffRequest(driver, {
      absenceType,
      dateFrom,
      dateTo: dateTo || dateFrom,
      partOfDay,
      reason,
      notes,
      session,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message ?? "Could not submit request");
      return;
    }
    setDone(result);
  };

  if (done) {
    return (
      <OperationalPage
        title="Request sent"
        subtitle="Your transport manager will review this leave."
        backTo="/holiday"
      >
        <div className={`mt-2 space-y-4 p-5 ${op.card}`}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Check className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{TYPE_LABELS[absenceType]}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateRange(dateFrom, dateTo || dateFrom)}
              {partOfDay !== "full_day" ? ` · ${partOfDay.toUpperCase()}` : ""}
            </p>
          </div>
          <StatusPill status="warning">Pending approval</StatusPill>
          {done.message ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
              {done.message}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pending leave is shown on your holiday balance. Approved leave appears on your schedule.
            </p>
          )}
          <Button asChild className={`h-12 w-full ${op.primaryBtn}`}>
            <Link to="/holiday">Back to holiday balance</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => {
              setDone(null);
              setStep(0);
              setDateFrom("");
              setDateTo("");
              setReason("");
              setNotes("");
              setPickingEnd(false);
            }}
          >
            Request another
          </Button>
        </div>
      </OperationalPage>
    );
  }

  return (
    <OperationalPage
      title="Request time off"
      subtitle="Tap the calendar to choose the day or range you need off."
      backTo={backTo}
    >
      <WizardProgress step={step} />

      <CommandBackendNotice
        status="partial"
        title="Manager approval required"
        description="This request goes to your transport manager. Do not assume the day is free until it is approved."
      />

      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {step === 0 ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Leave type</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((type) => {
                const active = absenceType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setAbsenceType(type.id)}
                    className={`min-h-[40px] rounded-full border px-3.5 py-2 text-sm font-semibold ${
                      active
                        ? "border-[var(--ridova-teal)] bg-[var(--ridova-teal)] text-white"
                        : "border-border bg-card text-foreground"
                    }`}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {TYPES.find((t) => t.id === absenceType)?.detail}
            </p>
          </div>

          <div className={`p-3 ${op.card}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Selected
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {dateFrom
                ? formatDateRange(dateFrom, dateTo || dateFrom)
                : "Tap a day on the calendar"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {!dateFrom
                ? "Choose one day, or tap a second day for a range"
                : pickingEnd && dateFrom === dateTo
                  ? "Tap another day to extend the range, or continue for a single day"
                  : pickingEnd
                    ? "Now tap the end date"
                    : TYPE_LABELS[absenceType]}
            </p>
          </div>

          <ScheduleMonthCalendar
            month={month}
            onMonthChange={setMonth}
            selectedDate={dateTo || dateFrom || null}
            onSelectDate={onSelectDate}
            selection={selection}
            mode="select"
            minDate={absenceType === "sick" ? null : today}
          />

          <Button
            type="button"
            disabled={!canContinueDates}
            className={`h-12 w-full ${op.primaryBtn}`}
            onClick={() => {
              if (!dateTo) setDateTo(dateFrom);
              setStep(1);
            }}
          >
            Continue
          </Button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="mt-4 space-y-4">
          <div className={`p-3 ${op.card}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dates</p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {formatDateRange(dateFrom, dateTo || dateFrom)} · {TYPE_LABELS[absenceType]}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Part of day</p>
            <div className="flex flex-wrap gap-2">
              {PARTS.map((part) => (
                <button
                  key={part.value}
                  type="button"
                  onClick={() => setPartOfDay(part.value)}
                  className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium ${
                    partOfDay === part.value
                      ? "border-[var(--ridova-teal)] bg-[var(--ridova-teal)] text-white"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  {part.label}
                </button>
              ))}
            </div>
            {dateFrom !== (dateTo || dateFrom) && partOfDay !== "full_day" ? (
              <p className="mt-2 text-xs text-amber-800">
                Part-day applies best to a single day. For a range, full days are usually clearer for
                dispatch.
              </p>
            ) : null}
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-foreground">
              Reason {absenceType === "sick" ? "(required)" : "(optional)"}
            </span>
            <textarea
              className="mt-2 min-h-[88px] w-full rounded-xl border border-border bg-background px-3 py-3 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                absenceType === "sick"
                  ? "e.g. Unwell — unable to drive safely"
                  : "Optional note for your manager"
              }
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-foreground">Notes for manager (optional)</span>
            <textarea
              className="mt-2 min-h-[72px] w-full rounded-xl border border-border bg-background px-3 py-3 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cover arrangements, contact number, etc."
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" className="h-12" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button
              type="button"
              disabled={!canContinueDetails}
              className={`h-12 ${op.primaryBtn}`}
              onClick={() => setStep(2)}
            >
              Review
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-4 space-y-4">
          <div className={`space-y-3 p-4 ${op.card}`}>
            <Row label="Type" value={TYPE_LABELS[absenceType]} />
            <Row label="Dates" value={formatDateRange(dateFrom, dateTo || dateFrom)} />
            <Row
              label="Part of day"
              value={PARTS.find((p) => p.value === partOfDay)?.label || "Full day"}
            />
            {reason ? <Row label="Reason" value={reason} /> : null}
            {notes ? <Row label="Notes" value={notes} /> : null}
          </div>

          {absenceType === "holiday" || absenceType === "compassionate" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              This request uses paid leave and will be checked against your remaining balance when
              approved. Pending leave does not reduce your official remaining days yet.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              This leave type does not deduct from your annual holiday balance by default.
            </div>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            By submitting, you confirm these dates are correct. If you already have a published duty on
            these days, Operations will be alerted to arrange cover.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" className="h-12" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              type="button"
              disabled={saving}
              className={`h-12 ${op.primaryBtn}`}
              onClick={() => void submit()}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit request
            </Button>
          </div>
        </div>
      ) : null}
    </OperationalPage>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[15px] font-medium text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}
