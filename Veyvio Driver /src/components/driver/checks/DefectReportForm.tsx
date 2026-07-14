import { useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { DefectTiming, DriverSafetyAssessment, DefectSeverity } from "@/types/vehicle-check";

export function DefectReportForm({
  vehicleRegistration,
  component,
  position,
  onSubmit,
}: {
  vehicleRegistration: string;
  component: string;
  position?: string;
  onSubmit: (data: {
    description: string;
    timing: DefectTiming;
    assessment: DriverSafetyAssessment;
    severity: DefectSeverity;
    photoTaken: boolean;
  }) => void;
}) {
  const [description, setDescription] = useState("");
  const [timing, setTiming] = useState<DefectTiming>("before_duty");
  const [assessment, setAssessment] = useState<DriverSafetyAssessment>("unsure");
  const [photoTaken, setPhotoTaken] = useState(false);

  function severityFromAssessment(a: DriverSafetyAssessment): DefectSeverity {
    if (a === "unsafe") return "safety_critical";
    if (a === "unsure") return "operational";
    return "cosmetic";
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Report defect</p>
        <h1 className="font-display text-xl font-extrabold">{component}</h1>
        <p className="mt-1 text-sm text-muted">
          Vehicle: {vehicleRegistration}
          {position ? ` · ${position}` : ""}
        </p>
      </header>

      <button
        type="button"
        onClick={() => setPhotoTaken(true)}
        className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 text-muted"
      >
        <Camera className="size-8" />
        <span className="text-sm font-medium">{photoTaken ? "Photo captured" : "Take photo"}</span>
      </button>

      <div className="space-y-2">
        <Label htmlFor="defect-desc">What did you find?</Label>
        <Input
          id="defect-desc"
          placeholder="Use voice or type"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">When was it found?</legend>
        {(
          [
            ["before_duty", "Before duty"],
            ["during_duty", "During duty"],
            ["end_of_duty", "At end of duty"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="timing"
              checked={timing === value}
              onChange={() => setTiming(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Do you believe the vehicle is unsafe?</legend>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["unsafe", "Yes"],
              ["unsure", "Unsure"],
              ["safe", "No"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant={assessment === value ? "default" : "outline"}
              onClick={() => setAssessment(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </fieldset>

      <Button
        className="h-12 w-full"
        disabled={!description.trim()}
        onClick={() =>
          onSubmit({
            description,
            timing,
            assessment,
            severity: severityFromAssessment(assessment),
            photoTaken,
          })
        }
      >
        Submit defect report
      </Button>
    </div>
  );
}