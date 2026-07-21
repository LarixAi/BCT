import { ArrowRight, ChevronDown, Mail, Smartphone } from "lucide-react";
import { DriverAuthBrandHero } from "@/components/driver/brand/DriverAuthWordmark";
import { DRIVER_SCREEN_TOP } from "@/lib/driverSafeArea";

export const driverAuthLinkClass = "driver-auth-link";

export function DriverAuthTrustLine({ children }) {
  return <p className="driver-auth-trust">{children}</p>;
}

export default function DriverMobileAuthLayout({
  title,
  subtitle,
  children,
  altMethods = null,
  footer = null,
  stickyFooter = null,
  showBrand = true,
  showPlatformHint = false,
  animate = false,
  centerContent = false,
}) {
  const anim = (step) => (animate ? `driver-auth-anim-${step}` : "");

  return (
    <div className="driver-auth-page driver-auth-shell" style={{ paddingTop: DRIVER_SCREEN_TOP }}>
      <div className="driver-auth-inner">
        <div className={`driver-auth-content ${centerContent ? "justify-center" : ""}`}>
          {showBrand ? (
            <DriverAuthBrandHero showPlatformHint={showPlatformHint} className={anim(1)} />
          ) : null}

          {title ? <h1 className={`driver-auth-title ${anim(2)}`}>{title}</h1> : null}
          {subtitle ? <p className={`driver-auth-subtitle ${anim(2)}`}>{subtitle}</p> : null}

          <div className={anim(3)}>{children}</div>

          {altMethods ? <div className={anim(4)}>{altMethods}</div> : null}

          {stickyFooter ? <div className="pb-2">{stickyFooter}</div> : null}

          {footer ? <footer className={`driver-auth-footer ${anim(6)}`}>{footer}</footer> : null}
        </div>
      </div>
    </div>
  );
}

export function DriverAuthOrDivider() {
  return (
    <div className="driver-auth-or relative flex items-center">
      <div className="h-px flex-1 bg-[#e5e7eb]" />
      <span className="px-3 text-xs font-medium uppercase tracking-[0.12em] text-[#9ca3af]">or</span>
      <div className="h-px flex-1 bg-[#e5e7eb]" />
    </div>
  );
}

export function DriverAuthSecondaryButton({ icon: Icon, children, onClick, disabled, type = "button" }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="driver-auth-social">
      {Icon ? <Icon className="h-5 w-5 shrink-0" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function DriverAuthPrimaryButton({
  children,
  disabled = false,
  ready = undefined,
  type = "button",
  onClick = undefined,
  className = "",
}) {
  const isReady = ready ?? !disabled;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`driver-auth-primary ${isReady && !disabled ? "driver-auth-primary--ready" : ""} ${className}`.trim()}
    >
      <span>{children}</span>
      {isReady && !disabled ? <ArrowRight className="h-4 w-4 shrink-0" aria-hidden /> : null}
    </button>
  );
}

export function DriverCountrySelector({ label = "United Kingdom" }) {
  return (
    <div
      className="flex h-full shrink-0 items-center gap-1.5 border-r border-[#e5e7eb] bg-[#f3f4f6] px-3"
      aria-label={`Country: ${label}`}
    >
      <UkFlag />
      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
    </div>
  );
}

export function DriverPhoneInput({ id, value, onChange, placeholder = "Mobile number", invalid }) {
  return (
    <div className={`driver-auth-phone-row flex-1 ${invalid ? "is-invalid" : ""}`}>
      <DriverCountrySelector />
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="h-[3.375rem] min-w-0 flex-1 bg-transparent px-3 text-base text-foreground placeholder:text-[#9ca3af] focus:outline-none"
        aria-invalid={invalid}
      />
    </div>
  );
}

export function DriverAuthIdentifierField({ id, value, onChange, isPhoneMode = false, invalid }) {
  if (isPhoneMode) {
    return (
      <DriverPhoneInput
        id={id}
        value={value}
        onChange={onChange}
        placeholder="Mobile number"
        invalid={invalid}
      />
    );
  }

  const Icon = value.includes("@") || /[a-zA-Z]/.test(value) ? Mail : Smartphone;

  return (
    <div className={`driver-auth-field-wrap ${invalid ? "is-invalid" : ""}`}>
      <Icon className="driver-auth-field-icon h-[1.125rem] w-[1.125rem]" aria-hidden />
      <input
        id={id}
        type="text"
        autoComplete="username"
        inputMode="email"
        placeholder="Phone number or email"
        value={value}
        onChange={onChange}
        className="driver-auth-field-inline"
        aria-invalid={invalid}
      />
    </div>
  );
}

export function DriverAuthTextField({
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
}) {
  return (
    <div className="space-y-2">
      {label && !hideLabel ? (
        <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
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
        className="driver-auth-field"
      />
    </div>
  );
}

export function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.08z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C4.79 15.25 3.8 10.54 6.61 7.72c1.12-1.11 2.58-1.74 4.07-1.65 1.02.08 1.74.45 2.63.45.86 0 1.51-.36 2.56-.36 1.64.03 3.05.95 3.84 2.32-3.37 1.83-2.82 6.58.56 7.79-.67 1.72-1.54 3.42-3.22 4.31ZM12.03 4.5c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
    </svg>
  );
}

function UkFlag() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden className="rounded-[2px] shadow-sm">
      <rect width="22" height="16" fill="#012169" />
      <path d="M0 0 L22 16 M22 0 L0 16" stroke="#fff" strokeWidth="3" />
      <path d="M0 0 L22 16 M22 0 L0 16" stroke="#C8102E" strokeWidth="1.5" />
      <path d="M11 0 V16 M0 8 H22" stroke="#fff" strokeWidth="5" />
      <path d="M11 0 V16 M0 8 H22" stroke="#C8102E" strokeWidth="3" />
    </svg>
  );
}
