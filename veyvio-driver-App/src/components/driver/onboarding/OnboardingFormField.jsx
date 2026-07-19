import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingFormField({
  label,
  value,
  onChange,
  type = "text",
  adminProvided = false,
  readOnly = false,
  placeholder = "",
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {adminProvided ? (
          <span className="text-[10px] uppercase tracking-wide text-[#1eaeae] font-semibold">On file</span>
        ) : null}
      </div>
      <Input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        className={`mt-1.5 bg-background border-input ${readOnly ? "opacity-70 bg-muted/50" : ""}`}
      />
    </div>
  );
}

export function OnboardingReadOnlyField({ label, value }) {
  return (
    <div>
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <Input value={value ?? ""} readOnly className="mt-1.5 bg-muted/50 border-input text-muted-foreground" />
    </div>
  );
}

export function OnboardingToggleField({ label, checked, onChange, disabled }) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        className="mt-1 rounded border-input accent-[#8ec63f] w-4 h-4"
      />
      <span className="text-sm text-foreground leading-snug">{label}</span>
    </label>
  );
}
