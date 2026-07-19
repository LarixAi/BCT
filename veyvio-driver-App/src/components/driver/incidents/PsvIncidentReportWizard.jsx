import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DRIVER_SAFE_BOTTOM } from "@/lib/driverSafeArea";
import { op } from "@/lib/driver-operational-theme";
import {
  PSV_INCIDENT_TYPE_OPTIONS,
  WIZARD_STEPS,
  buildEmptyIntakeForm,
} from "@/lib/psvIncidentIntake";
import { getDriverDutyState } from "@/services/duty-timeline.service";
import { getDriverAssignmentContext } from "@/services/vehicle-check.service";
import AddressLookupInput from "@/components/driver/maps/AddressLookupInput";

const inputClass = `w-full rounded-xl px-4 py-3 text-sm border ${op.input}`;
const SEVERITY_CHIPS = [
  { value: "near_miss", label: "Near miss" },
  { value: "minor", label: "Minor" },
  { value: "moderate", label: "Moderate" },
  { value: "serious", label: "Serious" },
];

function FieldLabel({ children, required }) {
  return (
    <p className="text-sm font-semibold text-foreground">
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </p>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} />;
}

function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${inputClass} resize-none`}
    />
  );
}

function YesNo({ value, onChange, label }) {
  const base = "rounded-xl px-4 py-2 text-xs font-semibold border transition-colors";
  const active = "border-[var(--ridova-teal)] bg-[var(--ridova-teal)]/12 text-[var(--ridova-teal-dark)]";
  const idle = "border-border bg-background text-muted-foreground";
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3 py-2.5">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex gap-2 shrink-0">
        <button type="button" className={`${base} ${value === true ? active : idle}`} onClick={() => onChange(true)}>
          Yes
        </button>
        <button type="button" className={`${base} ${value === false ? active : idle}`} onClick={() => onChange(false)}>
          No
        </button>
      </div>
    </div>
  );
}

function TriState({ value, onChange, label }) {
  const base = "rounded-xl px-3 py-2 text-xs font-semibold border transition-colors";
  const active = "border-[var(--ridova-teal)] bg-[var(--ridova-teal)]/12 text-[var(--ridova-teal-dark)]";
  const idle = "border-border bg-background text-muted-foreground";
  return (
    <div className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2">
        {[
          [true, "Yes"],
          [false, "No"],
          [null, "Unknown"],
        ].map(([v, lbl]) => (
          <button key={lbl} type="button" className={`${base} ${value === v ? active : idle}`} onClick={() => onChange(v)}>
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}

function patchForm(form, section, patch) {
  return { ...form, [section]: { ...form[section], ...patch } };
}

function validateStep(stepId, form) {
  if (stepId === "conditions") {
    if (!form.conditions.occurredAt?.trim()) return "Enter when the incident occurred.";
    if (!form.conditions.location?.trim()) return "Enter where the incident happened.";
  }
  if (stepId === "incidentTypes" && form.incidentTypes.selected.length === 0) {
    return "Select at least one incident type.";
  }
  if (stepId === "sequence") {
    const hasNarrative =
      form.sequence.before?.trim() ||
      form.sequence.driverActions?.trim() ||
      form.sequence.after?.trim();
    if (!hasNarrative) return "Describe what happened in the sequence of events.";
  }
  return null;
}

export default function PsvIncidentReportWizard({ driver, routeState, sosOption, onSubmit, submitting, error: submitError }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => buildEmptyIntakeForm());
  const [stepError, setStepError] = useState("");
  const [prefillReady, setPrefillReady] = useState(false);

  const currentStep = WIZARD_STEPS[step];
  const progress = Math.round(((step + 1) / WIZARD_STEPS.length) * 100);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [assignment, duty] = await Promise.all([
        getDriverAssignmentContext(driver),
        getDriverDutyState(driver),
      ]);
      if (cancelled) return;

      const vehicle = assignment.vehicle;
      const job = assignment.job;
      const breaks = duty.segments?.filter((s) => s.isBreak).length ?? 0;

      setForm((prev) => ({
        ...prev,
        bookingRef: routeState?.bookingRef ?? prev.bookingRef,
        severity: routeState?.sosType === "accident" ? "serious" : prev.severity,
        vehicle: {
          registration: vehicle?.registration ?? "",
          fleetNumber: vehicle?.fleet_number ?? vehicle?.id?.slice(0, 8) ?? "",
          vehicleType: [vehicle?.vehicle_type, vehicle?.make, vehicle?.model].filter(Boolean).join(" ") || "",
          routeServiceNumber: job?.route_name ?? "",
          directionOfTravel: "",
          depotBase: vehicle?.depotName ?? driver.homeDepotName ?? "",
        },
        driver: {
          fullName: driver.fullName ?? "",
          employeeId: driver.id?.slice(0, 8)?.toUpperCase() ?? "",
          licenceCategory: driver.canDoCoachWork ? "D" : driver.canDoSchoolRuns ? "D1" : "B",
          licenceValidUntil: driver.licenceExpiryDate ?? "",
          dutyStartTime: duty.shift?.signOnAt ? new Date(duty.shift.signOnAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "",
          hoursDrivenBeforeIncident: duty.dutyHours ? String(duty.dutyHours) : "",
          restBreaksTaken: breaks ? `${breaks} break(s) logged today` : "",
        },
        conditions: {
          ...prev.conditions,
          occurredAt: new Date().toISOString().slice(0, 16),
        },
        incidentTypes: routeState?.sosType
          ? {
              selected: mapSosToTypes(routeState.sosType),
              otherDescription: "",
            }
          : prev.incidentTypes,
      }));
      setPrefillReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [driver, routeState?.bookingRef, routeState?.sosType]);

  const sosBanner = useMemo(() => {
    if (!routeState?.sosLabel) return null;
    return (
      <div className="rounded-2xl border border-[var(--ridova-teal)]/25 bg-[var(--ridova-teal)]/8 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ridova-teal)]">From SOS</p>
        <p className="mt-1 text-sm font-bold text-foreground">{routeState.sosLabel}</p>
        {sosOption?.tflNote ? <p className="mt-1 text-xs text-muted-foreground">{sosOption.tflNote}</p> : null}
      </div>
    );
  }, [routeState?.sosLabel, sosOption?.tflNote]);

  function next() {
    const err = validateStep(currentStep.id, form);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError("");
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  }

  function back() {
    setStepError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    const err = validateStep("sequence", form);
    if (err) {
      setStepError(err);
      setStep(WIZARD_STEPS.findIndex((s) => s.id === "sequence"));
      return;
    }
    const result = await onSubmit(form);
    if (!result?.ok) return;
  }

  if (!prefillReady) {
    return <p className="px-4 py-8 text-sm text-muted-foreground">Loading your duty context…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Emergency? Call{" "}
          <a href="tel:999" className="font-bold underline">
            999
          </a>{" "}
          first. Complete all sections accurately — this report is sent to your operator and cannot be edited later.
        </p>
      </div>

      {sosBanner}

      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {step + 1} of {WIZARD_STEPS.length}: {currentStep.title}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-[var(--ridova-teal)] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{currentStep.subtitle}</p>
      </div>

      {stepError ? <p className="text-sm text-red-600">{stepError}</p> : null}
      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <div className="space-y-4 pb-4">
        {currentStep.id === "vehicle" ? (
          <>
            <FieldLabel required>Vehicle registration</FieldLabel>
            <TextInput value={form.vehicle.registration} onChange={(v) => setForm((f) => patchForm(f, "vehicle", { registration: v }))} placeholder="AB12 CDE" />
            <FieldLabel>Fleet number</FieldLabel>
            <TextInput value={form.vehicle.fleetNumber} onChange={(v) => setForm((f) => patchForm(f, "vehicle", { fleetNumber: v }))} placeholder="Fleet ID" />
            <FieldLabel>Vehicle type / model</FieldLabel>
            <TextInput value={form.vehicle.vehicleType} onChange={(v) => setForm((f) => patchForm(f, "vehicle", { vehicleType: v }))} placeholder="Minibus, coach, bus…" />
            <FieldLabel>Route / service number</FieldLabel>
            <TextInput value={form.vehicle.routeServiceNumber} onChange={(v) => setForm((f) => patchForm(f, "vehicle", { routeServiceNumber: v }))} placeholder="Route 25" />
            <FieldLabel>Direction of travel</FieldLabel>
            <TextInput value={form.vehicle.directionOfTravel} onChange={(v) => setForm((f) => patchForm(f, "vehicle", { directionOfTravel: v }))} placeholder="Outbound to Oxford Circus" />
            <FieldLabel>Depot / base</FieldLabel>
            <TextInput value={form.vehicle.depotBase} onChange={(v) => setForm((f) => patchForm(f, "vehicle", { depotBase: v }))} placeholder="Depot name" />
          </>
        ) : null}

        {currentStep.id === "driver" ? (
          <>
            <FieldLabel>Full name</FieldLabel>
            <TextInput value={form.driver.fullName} onChange={(v) => setForm((f) => patchForm(f, "driver", { fullName: v }))} />
            <FieldLabel>Employee ID</FieldLabel>
            <TextInput value={form.driver.employeeId} onChange={(v) => setForm((f) => patchForm(f, "driver", { employeeId: v }))} />
            <FieldLabel>Licence category</FieldLabel>
            <TextInput value={form.driver.licenceCategory} onChange={(v) => setForm((f) => patchForm(f, "driver", { licenceCategory: v }))} placeholder="D, D1, etc." />
            <FieldLabel>Licence valid until</FieldLabel>
            <TextInput type="date" value={form.driver.licenceValidUntil} onChange={(v) => setForm((f) => patchForm(f, "driver", { licenceValidUntil: v }))} />
            <FieldLabel>Duty start time</FieldLabel>
            <TextInput value={form.driver.dutyStartTime} onChange={(v) => setForm((f) => patchForm(f, "driver", { dutyStartTime: v }))} placeholder="07:30" />
            <FieldLabel>Hours driven before incident</FieldLabel>
            <TextInput value={form.driver.hoursDrivenBeforeIncident} onChange={(v) => setForm((f) => patchForm(f, "driver", { hoursDrivenBeforeIncident: v }))} placeholder="e.g. 4.5" />
            <FieldLabel>Rest breaks taken</FieldLabel>
            <TextArea value={form.driver.restBreaksTaken} onChange={(v) => setForm((f) => patchForm(f, "driver", { restBreaksTaken: v }))} placeholder="Break times and duration…" rows={3} />
          </>
        ) : null}

        {currentStep.id === "conditions" ? (
          <>
            <FieldLabel required>Date & time</FieldLabel>
            <TextInput type="datetime-local" value={form.conditions.occurredAt} onChange={(v) => setForm((f) => patchForm(f, "conditions", { occurredAt: v }))} />
            <FieldLabel required>Exact location</FieldLabel>
            <AddressLookupInput
              value={form.conditions.location}
              onValueChange={(v) => setForm((f) => patchForm(f, "conditions", { location: v, lat: null, lng: null }))}
              onLocationSelect={(place) => {
                if (!place) return;
                setForm((f) =>
                  patchForm(f, "conditions", {
                    location: place.address ?? place.label,
                    postcode: place.postcode ?? f.conditions.postcode,
                    lat: place.lat ?? null,
                    lng: place.lng ?? null,
                  }),
                );
              }}
              placeholder="Search address, stop, or postcode"
            />
            {form.conditions.lat != null && form.conditions.lng != null ? (
              <p className="text-xs text-emerald-700">Location pinned from address lookup.</p>
            ) : null}
            <FieldLabel>Stop number</FieldLabel>
            <TextInput value={form.conditions.stopNumber} onChange={(v) => setForm((f) => patchForm(f, "conditions", { stopNumber: v }))} />
            <FieldLabel>Postcode</FieldLabel>
            <TextInput value={form.conditions.postcode} onChange={(v) => setForm((f) => patchForm(f, "conditions", { postcode: v }))} />
            <FieldLabel>Weather</FieldLabel>
            <TextInput value={form.conditions.weather} onChange={(v) => setForm((f) => patchForm(f, "conditions", { weather: v }))} placeholder="Dry, wet, fog…" />
            <FieldLabel>Road conditions</FieldLabel>
            <TextInput value={form.conditions.roadConditions} onChange={(v) => setForm((f) => patchForm(f, "conditions", { roadConditions: v }))} placeholder="Wet, icy, roadworks…" />
            <FieldLabel>Traffic conditions</FieldLabel>
            <TextInput value={form.conditions.trafficConditions} onChange={(v) => setForm((f) => patchForm(f, "conditions", { trafficConditions: v }))} placeholder="Heavy, moderate, clear…" />
            <FieldLabel>Approx. speed (mph)</FieldLabel>
            <TextInput value={form.conditions.speedMph} onChange={(v) => setForm((f) => patchForm(f, "conditions", { speedMph: v }))} placeholder="18" />
            <FieldLabel>Booking reference</FieldLabel>
            <TextInput value={form.bookingRef} onChange={(v) => setForm((f) => ({ ...f, bookingRef: v }))} placeholder="If applicable" />
          </>
        ) : null}

        {currentStep.id === "incidentTypes" ? (
          <>
            <FieldLabel required>Type of incident (select all that apply)</FieldLabel>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PSV_INCIDENT_TYPE_OPTIONS.map((t) => {
                const selected = form.incidentTypes.selected.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => {
                        const sel = f.incidentTypes.selected;
                        const next = selected ? sel.filter((x) => x !== t.id) : [...sel, t.id];
                        return { ...f, incidentTypes: { ...f.incidentTypes, selected: next } };
                      })
                    }
                    className={`rounded-xl border p-3 text-left text-sm font-medium ${
                      selected
                        ? "border-[var(--ridova-teal)] bg-[var(--ridova-teal)]/12 text-[var(--ridova-teal-dark)]"
                        : "border-border bg-card"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <FieldLabel>How serious?</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {SEVERITY_CHIPS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, severity: s.value }))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    form.severity === s.value
                      ? "border-[var(--ridova-teal)] bg-[var(--ridova-teal)]/12 text-[var(--ridova-teal-dark)]"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <FieldLabel>Other / additional detail</FieldLabel>
            <TextArea value={form.incidentTypes.otherDescription} onChange={(v) => setForm((f) => patchForm(f, "incidentTypes", { otherDescription: v }))} rows={3} />
          </>
        ) : null}

        {currentStep.id === "passengers" ? (
          <>
            <FieldLabel>Passengers onboard</FieldLabel>
            <TextInput type="number" min={0} value={form.passengers.countOnboard} onChange={(v) => setForm((f) => patchForm(f, "passengers", { countOnboard: v }))} />
            <FieldLabel>Injured passengers</FieldLabel>
            <TextInput type="number" min={0} value={form.passengers.injuredCount} onChange={(v) => setForm((f) => patchForm(f, "passengers", { injuredCount: v }))} />
            <FieldLabel>Names & contact details</FieldLabel>
            <TextArea value={form.passengers.namesAndContacts} onChange={(v) => setForm((f) => patchForm(f, "passengers", { namesAndContacts: v }))} placeholder="If known…" />
            <FieldLabel>Where seated / standing</FieldLabel>
            <TextArea value={form.passengers.seatingLocation} onChange={(v) => setForm((f) => patchForm(f, "passengers", { seatingLocation: v }))} rows={2} />
            <YesNo label="Vulnerable passengers involved?" value={form.passengers.vulnerableInvolved} onChange={(v) => setForm((f) => patchForm(f, "passengers", { vulnerableInvolved: v }))} />
            {form.passengers.vulnerableInvolved ? (
              <>
                <FieldLabel>Vulnerable passenger details</FieldLabel>
                <TextArea value={form.passengers.vulnerableNotes} onChange={(v) => setForm((f) => patchForm(f, "passengers", { vulnerableNotes: v }))} rows={3} />
              </>
            ) : null}
          </>
        ) : null}

        {currentStep.id === "sequence" ? (
          <>
            <FieldLabel>What happened before</FieldLabel>
            <TextArea value={form.sequence.before} onChange={(v) => setForm((f) => patchForm(f, "sequence", { before: v }))} rows={3} />
            <FieldLabel required>Driver actions</FieldLabel>
            <TextArea value={form.sequence.driverActions} onChange={(v) => setForm((f) => patchForm(f, "sequence", { driverActions: v }))} rows={3} />
            <FieldLabel>Passenger actions</FieldLabel>
            <TextArea value={form.sequence.passengerActions} onChange={(v) => setForm((f) => patchForm(f, "sequence", { passengerActions: v }))} rows={3} />
            <FieldLabel>Road user actions</FieldLabel>
            <TextArea value={form.sequence.roadUserActions} onChange={(v) => setForm((f) => patchForm(f, "sequence", { roadUserActions: v }))} rows={3} />
            <FieldLabel>What happened after</FieldLabel>
            <TextArea value={form.sequence.after} onChange={(v) => setForm((f) => patchForm(f, "sequence", { after: v }))} rows={3} />
          </>
        ) : null}

        {currentStep.id === "thirdParty" ? (
          <>
            <YesNo label="Third party involved?" value={form.thirdParty.involved} onChange={(v) => setForm((f) => patchForm(f, "thirdParty", { involved: v }))} />
            {form.thirdParty.involved ? (
              <>
                <FieldLabel>Name</FieldLabel>
                <TextInput value={form.thirdParty.name} onChange={(v) => setForm((f) => patchForm(f, "thirdParty", { name: v }))} />
                <FieldLabel>Registration</FieldLabel>
                <TextInput value={form.thirdParty.registration} onChange={(v) => setForm((f) => patchForm(f, "thirdParty", { registration: v }))} />
                <FieldLabel>Insurance</FieldLabel>
                <TextInput value={form.thirdParty.insurance} onChange={(v) => setForm((f) => patchForm(f, "thirdParty", { insurance: v }))} />
                <FieldLabel>Contact</FieldLabel>
                <TextInput value={form.thirdParty.contact} onChange={(v) => setForm((f) => patchForm(f, "thirdParty", { contact: v }))} />
                <FieldLabel>Company name</FieldLabel>
                <TextInput value={form.thirdParty.companyName} onChange={(v) => setForm((f) => patchForm(f, "thirdParty", { companyName: v }))} />
              </>
            ) : null}
          </>
        ) : null}

        {currentStep.id === "witnesses" ? (
          <>
            <FieldLabel>Passenger witnesses</FieldLabel>
            <TextArea value={form.witnesses.passengers} onChange={(v) => setForm((f) => patchForm(f, "witnesses", { passengers: v }))} rows={3} />
            <FieldLabel>Public witnesses</FieldLabel>
            <TextArea value={form.witnesses.publicWitnesses} onChange={(v) => setForm((f) => patchForm(f, "witnesses", { publicWitnesses: v }))} rows={3} />
            <FieldLabel>Other staff</FieldLabel>
            <TextArea value={form.witnesses.otherStaff} onChange={(v) => setForm((f) => patchForm(f, "witnesses", { otherStaff: v }))} rows={2} />
            <FieldLabel>Police details (if attending)</FieldLabel>
            <TextArea value={form.witnesses.policeDetails} onChange={(v) => setForm((f) => patchForm(f, "witnesses", { policeDetails: v }))} rows={2} />
          </>
        ) : null}

        {currentStep.id === "cctv" ? (
          <>
            <TriState label="Was CCTV working?" value={form.cctvTelematics.cctvWorking} onChange={(v) => setForm((f) => patchForm(f, "cctvTelematics", { cctvWorking: v }))} />
            <FieldLabel>Camera references</FieldLabel>
            <TextInput value={form.cctvTelematics.cameraReferences} onChange={(v) => setForm((f) => patchForm(f, "cctvTelematics", { cameraReferences: v }))} />
            <TriState label="Dashcam footage available?" value={form.cctvTelematics.dashcamFootage} onChange={(v) => setForm((f) => patchForm(f, "cctvTelematics", { dashcamFootage: v }))} />
            <TriState label="Telematics data available?" value={form.cctvTelematics.telematicsAvailable} onChange={(v) => setForm((f) => patchForm(f, "cctvTelematics", { telematicsAvailable: v }))} />
            <FieldLabel>Harsh braking alerts</FieldLabel>
            <TextInput value={form.cctvTelematics.harshBrakingAlerts} onChange={(v) => setForm((f) => patchForm(f, "cctvTelematics", { harshBrakingAlerts: v }))} />
            <FieldLabel>Speed logs</FieldLabel>
            <TextInput value={form.cctvTelematics.speedLogs} onChange={(v) => setForm((f) => patchForm(f, "cctvTelematics", { speedLogs: v }))} />
          </>
        ) : null}

        {currentStep.id === "damage" ? (
          <>
            <FieldLabel>Vehicle damage location</FieldLabel>
            <TextInput value={form.damageInjury.vehicleDamageLocation} onChange={(v) => setForm((f) => patchForm(f, "damageInjury", { vehicleDamageLocation: v }))} />
            <FieldLabel>Vehicle damage severity</FieldLabel>
            <TextInput value={form.damageInjury.vehicleDamageSeverity} onChange={(v) => setForm((f) => patchForm(f, "damageInjury", { vehicleDamageSeverity: v }))} />
            <FieldLabel>Passenger injuries</FieldLabel>
            <TextArea value={form.damageInjury.passengerInjuries} onChange={(v) => setForm((f) => patchForm(f, "damageInjury", { passengerInjuries: v }))} rows={2} />
            <FieldLabel>Driver injuries</FieldLabel>
            <TextArea value={form.damageInjury.driverInjuries} onChange={(v) => setForm((f) => patchForm(f, "damageInjury", { driverInjuries: v }))} rows={2} />
            <FieldLabel>Third-party injuries</FieldLabel>
            <TextArea value={form.damageInjury.thirdPartyInjuries} onChange={(v) => setForm((f) => patchForm(f, "damageInjury", { thirdPartyInjuries: v }))} rows={2} />
          </>
        ) : null}

        {currentStep.id === "emergency" ? (
          <>
            <YesNo label="Ambulance called?" value={form.emergencyResponse.ambulanceCalled} onChange={(v) => setForm((f) => patchForm(f, "emergencyResponse", { ambulanceCalled: v }))} />
            <YesNo label="Police attended?" value={form.emergencyResponse.policeAttended} onChange={(v) => setForm((f) => patchForm(f, "emergencyResponse", { policeAttended: v }))} />
            <YesNo label="Inspector / supervisor attended?" value={form.emergencyResponse.supervisorAttended} onChange={(v) => setForm((f) => patchForm(f, "emergencyResponse", { supervisorAttended: v }))} />
            <YesNo label="Vehicle taken out of service?" value={form.emergencyResponse.vehicleOutOfService} onChange={(v) => setForm((f) => patchForm(f, "emergencyResponse", { vehicleOutOfService: v }))} />
            <YesNo label="Replacement bus sent?" value={form.emergencyResponse.replacementBusSent} onChange={(v) => setForm((f) => patchForm(f, "emergencyResponse", { replacementBusSent: v }))} />
            <FieldLabel>Additional notes</FieldLabel>
            <TextArea value={form.emergencyResponse.notes} onChange={(v) => setForm((f) => patchForm(f, "emergencyResponse", { notes: v }))} rows={3} />
          </>
        ) : null}

        {currentStep.id === "compliance" ? (
          <>
            <TriState label="Following company policy?" value={form.compliance.followingCompanyPolicy} onChange={(v) => setForm((f) => patchForm(f, "compliance", { followingCompanyPolicy: v }))} />
            <TriState label="Seatbelt policy followed?" value={form.compliance.seatbeltPolicyFollowed} onChange={(v) => setForm((f) => patchForm(f, "compliance", { seatbeltPolicyFollowed: v }))} />
            <TriState label="Correct boarding / alighting?" value={form.compliance.boardingAlightingCorrect} onChange={(v) => setForm((f) => patchForm(f, "compliance", { boardingAlightingCorrect: v }))} />
            <TriState label="Defect checks completed?" value={form.compliance.defectChecksCompleted} onChange={(v) => setForm((f) => patchForm(f, "compliance", { defectChecksCompleted: v }))} />
            <TriState label="Reported immediately?" value={form.compliance.reportedImmediately} onChange={(v) => setForm((f) => patchForm(f, "compliance", { reportedImmediately: v }))} />
            <FieldLabel>Compliance notes</FieldLabel>
            <TextArea value={form.compliance.notes} onChange={(v) => setForm((f) => patchForm(f, "compliance", { notes: v }))} rows={3} />
            <FieldLabel>Photos (optional)</FieldLabel>
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setForm((f) => ({ ...f, photos: Array.from(e.target.files ?? []) }))}
              />
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                <Upload className="h-4 w-4 shrink-0" />
                {form.photos.length > 0 ? `${form.photos.length} photo(s) selected` : "Attach photos from the scene"}
              </div>
            </label>
          </>
        ) : null}
      </div>

      <div
        className="sticky bottom-0 -mx-4 flex gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md"
        style={{ paddingBottom: `calc(12px + ${DRIVER_SAFE_BOTTOM})` }}
      >
        {step > 0 ? (
          <Button type="button" variant="outline" className="h-12 flex-1 rounded-2xl" onClick={back}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        ) : null}
        {step < WIZARD_STEPS.length - 1 ? (
          <Button type="button" className={`h-12 flex-1 rounded-2xl ${op.primaryBtn}`} onClick={next}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" disabled={submitting} className={`h-12 flex-1 rounded-2xl ${op.primaryBtn}`} onClick={() => void handleSubmit()}>
            {submitting ? "Submitting…" : "Submit to operator"}
          </Button>
        )}
      </div>
    </div>
  );
}

function mapSosToTypes(sosType) {
  const map = {
    assault: ["assault_abuse"],
    harassment: ["assault_abuse"],
    passenger_behaviour: ["assault_abuse"],
    accident: ["collision_vehicle"],
    vehicle: ["vehicle_defect"],
    accessibility: ["security"],
    other: [],
  };
  return map[sosType] ?? [];
}
