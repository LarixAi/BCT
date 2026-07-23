import type { ReactNode } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { YardAuthBrandHero } from "@/components/auth/YardAuthWordmark";
import { cn } from "@/lib/utils";

export const yardAuthLinkClass = "yard-auth-link";

type YardMobileAuthLayoutProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  showBrand?: boolean;
  showPlatformHint?: boolean;
  animate?: boolean;
  centerContent?: boolean;
};

export function YardMobileAuthLayout({
  title,
  subtitle,
  children,
  footer = null,
  showBrand = true,
  showPlatformHint = false,
  animate = false,
  centerContent = false,
}: YardMobileAuthLayoutProps) {
  const anim = (step: number) => (animate ? `yard-auth-anim-${step}` : "");

  return (
    <div className="yard-auth-page yard-auth-shell">
      <div className="yard-auth-inner">
        <div className={cn("yard-auth-content", centerContent && "justify-center")}>
          {showBrand ? (
            <YardAuthBrandHero showPlatformHint={showPlatformHint} className={anim(1)} />
          ) : null}

          {title ? <h1 className={cn("yard-auth-title", anim(2))}>{title}</h1> : null}
          {subtitle ? <p className={cn("yard-auth-subtitle", anim(2))}>{subtitle}</p> : null}

          <div className={anim(3)}>{children}</div>

          {footer ? <footer className={cn("yard-auth-footer", anim(4))}>{footer}</footer> : null}
        </div>
      </div>
    </div>
  );
}

export function YardAuthTrustLine({ children }: { children: ReactNode }) {
  return <p className="yard-auth-trust">{children}</p>;
}

type YardAuthPrimaryButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  ready?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
};

export function YardAuthPrimaryButton({
  children,
  disabled = false,
  ready,
  type = "button",
  onClick,
  className,
}: YardAuthPrimaryButtonProps) {
  const isReady = ready ?? !disabled;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "yard-auth-primary",
        isReady && !disabled && "yard-auth-primary--ready",
        className,
      )}
    >
      <span>{children}</span>
      {isReady && !disabled ? <ArrowRight className="h-4 w-4 shrink-0" aria-hidden /> : null}
    </button>
  );
}

type YardAuthTextFieldProps = {
  id: string;
  label?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  hideLabel?: boolean;
  placeholder?: string;
  maxLength?: number;
  readOnly?: boolean;
  className?: string;
};

export function YardAuthTextField({
  id,
  label,
  type = "text",
  autoComplete,
  inputMode,
  value,
  onChange,
  required,
  hideLabel = false,
  placeholder,
  maxLength,
  readOnly,
  className,
}: YardAuthTextFieldProps) {
  return (
    <div className="space-y-2">
      {label && !hideLabel ? (
        <label htmlFor={id} className="text-sm font-medium text-[#6b7280]">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        readOnly={readOnly}
        className={cn("yard-auth-field", className)}
      />
    </div>
  );
}

type YardAuthEmailFieldProps = {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  invalid?: boolean;
  placeholder?: string;
};

export function YardAuthEmailField({
  id,
  value,
  onChange,
  invalid = false,
  placeholder = "Work email",
}: YardAuthEmailFieldProps) {
  return (
    <div className={cn("yard-auth-field-wrap", invalid && "is-invalid")}>
      <Mail className="yard-auth-field-icon h-[1.125rem] w-[1.125rem]" aria-hidden />
      <input
        id={id}
        type="email"
        autoComplete="username"
        inputMode="email"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="yard-auth-field-inline"
        aria-invalid={invalid}
      />
    </div>
  );
}

type YardAuthOptionButtonProps = {
  title: string;
  meta?: string;
  onClick: () => void;
  disabled?: boolean;
};

export function YardAuthOptionButton({ title, meta, onClick, disabled }: YardAuthOptionButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="yard-auth-option">
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{title}</div>
        {meta ? <div className="yard-auth-option-meta">{meta}</div> : null}
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-[#9ca3af]" aria-hidden />
    </button>
  );
}
