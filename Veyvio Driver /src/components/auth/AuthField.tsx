import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function AuthField({
  id,
  label,
  type = "text",
  icon: Icon,
  hint,
  error,
  className,
  inputClassName,
  ...props
}: React.ComponentProps<typeof Input> & {
  label: string;
  icon?: LucideIcon;
  hint?: string;
  error?: string;
  inputClassName?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={fieldId} className="text-xs font-bold uppercase tracking-widest text-muted">
        {label}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
        )}
        <Input
          id={fieldId}
          type={inputType}
          className={cn(
            "h-12 rounded-xl border-border bg-background text-base shadow-none",
            Icon && "pl-10",
            isPassword && "pr-12",
            error && "border-vor focus-visible:ring-vor/30",
            inputClassName,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint ? `${fieldId}-hint` : error ? `${fieldId}-error` : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} className="text-xs font-medium text-vor" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthCheckbox({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-primary"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>}
      </span>
    </label>
  );
}
