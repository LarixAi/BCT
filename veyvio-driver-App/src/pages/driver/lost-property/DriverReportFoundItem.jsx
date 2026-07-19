import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { OperationalPage } from "@/pages/driver/DriverOperationalPageParts";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import {
  LOST_ITEM_CATEGORIES,
  LOST_ITEM_FOUND_LOCATIONS,
  reportFoundItem,
  uploadLostItemPhoto,
} from "@/services/lost-property.service";

export default function DriverReportFoundItem({ driver }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { bootstrap } = useDriverSupabaseAuth();
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [foundLocation, setFoundLocation] = useState("");
  const [isHighValue, setIsHighValue] = useState(false);
  const [containsPersonalData, setContainsPersonalData] = useState(false);
  const [isMedication, setIsMedication] = useState(false);
  const [isChildRelated, setIsChildRelated] = useState(false);
  const [isHazardous, setIsHazardous] = useState(false);
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  const jobId = searchParams.get("jobId") || undefined;
  const schoolRunId = searchParams.get("schoolRunId") || undefined;
  const vehicleCheckId = searchParams.get("vehicleCheckId") || undefined;
  const incidentId = searchParams.get("incidentId") || undefined;
  const backTo = searchParams.get("back") || "/lost-property";

  const duty = bootstrap?.duties?.[0];
  const vehicleReg =
    duty?.vehicle?.registrationNumber ||
    duty?.vehicle?.registration ||
    driver?.assignedVehicleRegistration ||
    "";

  useEffect(() => {
    if (category === "medication") setIsMedication(true);
    if (category === "child_item") setIsChildRelated(true);
    if (category === "wallet_cards" || category === "documents" || category === "phone_electronics") {
      setContainsPersonalData(true);
    }
  }, [category]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    let photoPath;
    let photoFileName;
    if (photoFile) {
      const upload = await uploadLostItemPhoto({
        driver,
        vehicleId: duty?.vehicle?.id ?? null,
        itemId: `draft-${Date.now()}`,
        file: photoFile,
      });
      if (!upload.ok) {
        setSubmitting(false);
        setError(upload.message);
        return;
      }
      photoPath = upload.path;
      photoFileName = upload.fileName || photoFile.name;
    }

    const result = await reportFoundItem(driver, {
      category,
      description,
      foundLocation: foundLocation || null,
      isHighValue,
      containsPersonalData,
      isMedication,
      isChildRelated,
      isHazardous,
      notes,
      photoPath,
      photoFileName,
      jobId,
      schoolRunId,
      vehicleCheckId,
      incidentId,
      vehicleRegistration: vehicleReg || null,
      dutyReference: duty?.reference || duty?.routeName || null,
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setDone(result);
  };

  return (
    <OperationalPage
      title="Report found item"
      subtitle="Describe it, keep it safe, then hand it to depot."
      backTo={backTo}
    >
      <CommandBackendNotice
        status="partial"
        title="Hand to Yard / depot"
        description="Reports save for this driver. Admin lost-property intake is not on Command yet — confirm handover after you pass the item to depot staff."
      />

      {vehicleReg ? (
        <div className={`mt-4 p-4 ${op.card}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vehicle</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{vehicleReg}</p>
          {duty?.reference ? (
            <p className="mt-1 text-sm text-muted-foreground">Duty {duty.reference}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 pb-8">
        {done ? (
          <div className={`space-y-4 p-5 ${op.card}`}>
            <p className="text-lg font-semibold text-emerald-800">Item recorded</p>
            <p className="text-sm text-muted-foreground">
              Reference <span className="font-mono font-semibold text-foreground">{done.reference}</span>.
              Keep the item secure and hand it to depot staff.
            </p>
            {done.message ? <p className="text-sm text-amber-900">{done.message}</p> : null}
            <Button onClick={() => navigate("/lost-property")} className={`h-12 w-full ${op.primaryBtn}`}>
              View my reports
            </Button>
            <Button variant="outline" onClick={() => navigate(backTo)} className="h-11 w-full">
              Back
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Category">
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm"
              >
                <option value="">Select category</option>
                {LOST_ITEM_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Description">
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Colour, brand, distinctive marks…"
                className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm"
              />
            </Field>

            <Field label="Where found">
              <select
                value={foundLocation}
                onChange={(e) => setFoundLocation(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm"
              >
                <option value="">Select location</option>
                {LOST_ITEM_FOUND_LOCATIONS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Photo (optional)">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
            </Field>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <Toggle label="High value" checked={isHighValue} onChange={setIsHighValue} />
              <Toggle label="Personal data" checked={containsPersonalData} onChange={setContainsPersonalData} />
              <Toggle label="Medication" checked={isMedication} onChange={setIsMedication} />
              <Toggle label="Child-related" checked={isChildRelated} onChange={setIsChildRelated} />
              <Toggle label="Hazardous" checked={isHazardous} onChange={setIsHazardous} />
            </div>

            <Field label="Notes for depot (optional)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm"
              />
            </Field>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={submitting} className={`h-12 w-full ${op.primaryBtn}`}>
              {submitting ? "Saving…" : "Save found item report"}
            </Button>
          </form>
        )}
      </div>
    </OperationalPage>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex min-h-[48px] items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
