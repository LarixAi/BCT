import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  FORM_SECTION_LABELS,
  calculateCompleteness,
  categoryLabel,
  getCompletionFormFields,
  groupFormFieldsBySection,
  type IncidentFormField,
} from "@veyvio/incidents";
import { AuthPrimaryButton } from "@/components/auth/AuthLayout";
import { DocumentFilePicker } from "@/components/driver/more/DocumentFilePicker";
import { HomeCard } from "@/components/driver/home/HomeCard";
import { TriStateField } from "@/components/driver/incidents/TriStateField";
import { Button } from "@/components/ui/button";
import { DOCUMENT_CAMERA_ACCEPT, DOCUMENT_UPLOAD_ACCEPT } from "@/domain/more/document-upload";
import {
  buildIncidentEvidenceFromFile,
  pickIncidentPhoto,
} from "@/platform/incidents/evidence-capture";
import { useIncidentStore } from "@/store/incidents";
import type { DriverIncidentRecord } from "@/store/incidents";
import { getPassengerProfile } from "@/domain/passenger/passenger-profiles";
import { Capacitor } from "@capacitor/core";

function FieldInput({
  field,
  record,
  onChange,
}: {
  field: IncidentFormField;
  record: DriverIncidentRecord;
  onChange: (key: string, value: unknown) => void;
}) {
  const value = record.submission.answers[field.key]?.value;
  const manifest = record.submission.operationalContext.passengerManifest ?? [];

  if (field.type === "tristate") {
    return (
      <TriStateField
        label={field.label}
        value={value as import("@veyvio/incidents").TriStateAnswer | undefined}
        onChange={(next) => onChange(field.key, next)}
        helpText={field.helpText}
      />
    );
  }

  if (field.type === "passenger_select") {
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">{field.label}</legend>
        <div className="space-y-2">
          {manifest.length === 0 ? (
            <p className="text-sm text-muted">No passengers linked to this journey.</p>
          ) : (
            manifest.map((passenger) => {
              const profile = getPassengerProfile(passenger.passengerId);
              return (
                <button
                  key={passenger.passengerId}
                  type="button"
                  onClick={() => onChange(field.key, passenger.passengerId)}
                  className={`flex min-h-12 w-full flex-col items-start rounded-xs border px-3 py-2 text-left text-sm ${
                    value === passenger.passengerId ? "border-link bg-link/10" : "border-border bg-card"
                  }`}
                >
                  <span className="font-medium">{profile?.displayName ?? passenger.name}</span>
                  {profile?.journeySummary && (
                    <span className="mt-0.5 text-xs text-muted">{profile.journeySummary}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </fieldset>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="block space-y-2">
        <span className="text-sm font-semibold">{field.label}</span>
        <textarea
          className="min-h-24 w-full rounded-xs border border-border bg-card px-3 py-2 text-sm"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      </label>
    );
  }

  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold">{field.label}</span>
      <input
        type="text"
        className="h-12 w-full rounded-xs border border-border bg-card px-3 text-sm"
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(field.key, event.target.value)}
      />
    </label>
  );
}

export function IncidentCompletionWizard({ recordId }: { recordId: string }) {
  const navigate = useNavigate();
  const record = useIncidentStore((s) => s.getRecord(recordId));
  const updateRecordField = useIncidentStore((s) => s.updateRecordField);
  const addRecordEvidence = useIncidentStore((s) => s.addRecordEvidence);
  const submitCompletionReport = useIncidentStore((s) => s.submitCompletionReport);

  const [submitting, setSubmitting] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);

  if (!record) {
    return <p className="text-sm text-muted">Incident not found.</p>;
  }

  const fields = useMemo(
    () => getCompletionFormFields(record.submission.categoryCode),
    [record.submission.categoryCode],
  );
  const grouped = useMemo(() => groupFormFieldsBySection(fields), [fields]);
  const completeness = calculateCompleteness(record.submission);
  const sections = Object.entries(grouped).filter(([, sectionFields]) => sectionFields.length > 0);

  async function handleAddPhoto(file: File) {
    try {
      const evidence = await buildIncidentEvidenceFromFile(file, "vehicle_damage_photo");
      addRecordEvidence(record.localIncidentId, evidence);
      toast.success("Photo added to incident evidence");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Photo could not be added.");
    }
  }

  async function handleCamera() {
    setAddingPhoto(true);
    try {
      const file = await pickIncidentPhoto();
      if (file) await handleAddPhoto(file);
    } finally {
      setAddingPhoto(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    const result = await submitCompletionReport(record.localIncidentId);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    toast.success("Full report sent to control");
    navigate({ to: "/incidents/$incidentId", params: { incidentId: record.localIncidentId } });
  }

  return (
    <div className="space-y-5">
      <HomeCard tone="teal">
        <p className="font-semibold">Complete the report</p>
        <p className="mt-2 text-sm text-muted">
          {categoryLabel(record.submission.categoryCode)} · {completeness.overall}% complete
        </p>
      </HomeCard>

      {sections.map(([section, sectionFields]) => (
        <section key={section} className="space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">
            {FORM_SECTION_LABELS[section as IncidentFormField["section"]]}
          </h2>
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            {sectionFields
              .filter((field) => field.type !== "evidence")
              .map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  record={record}
                  onChange={(key, value) => updateRecordField(record.localIncidentId, key, value)}
                />
              ))}
          </div>
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">Evidence</h2>
        <p className="text-sm text-muted">Add photos only where it is safe and lawful to do so.</p>
        <div className="grid grid-cols-2 gap-2">
          {Capacitor.isNativePlatform() && (
            <Button type="button" variant="outline" className="h-12" disabled={addingPhoto} onClick={() => void handleCamera()}>
              {addingPhoto ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              Photograph
            </Button>
          )}
          <DocumentFilePicker
            accept={`${DOCUMENT_UPLOAD_ACCEPT},${DOCUMENT_CAMERA_ACCEPT}`}
            capture={!Capacitor.isNativePlatform()}
            className="h-12 border border-border bg-card font-semibold"
            onFile={(file) => void handleAddPhoto(file)}
          >
            <FileUp className="size-4" />
            Upload photo
          </DocumentFilePicker>
        </div>
        {record.submission.evidence.length > 0 && (
          <p className="text-sm text-muted">
            {record.submission.evidence.length} photo{record.submission.evidence.length === 1 ? "" : "s"} attached
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">Declaration</h2>
        <TriStateField
          label="I confirm this report is accurate to the best of my knowledge"
          value={record.submission.answers.declarationConfirmed?.value as import("@veyvio/incidents").TriStateAnswer | undefined}
          onChange={(value) => updateRecordField(record.localIncidentId, "declarationConfirmed", value)}
          helpText="You may add further information later if more facts become available."
        />
      </section>

      <AuthPrimaryButton type="button" disabled={submitting} onClick={() => void handleSubmit()}>
        {submitting ? "Sending full report…" : "Submit full report to control"}
      </AuthPrimaryButton>
    </div>
  );
}
