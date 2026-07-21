import { Link } from "react-router-dom";
import { Check, ChevronLeft, Lock } from "lucide-react";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { DRIVER_SAFE_BOTTOM } from "@/lib/driverSafeArea";

function Field({ label, value, locked = true, mono = false }) {
  return (
    <div>
      <label className="text-[13px] font-semibold text-foreground">{label}</label>
      <div
        className={`mt-1.5 flex min-h-[48px] items-center gap-2 rounded-xl border border-border bg-muted/40 px-3.5 ${
          locked ? "text-muted-foreground" : "bg-card text-foreground"
        }`}
      >
        <span
          className={`min-w-0 flex-1 truncate text-[15px] font-medium ${
            mono ? "font-mono tabular-nums tracking-tight" : ""
          }`}
        >
          {value || "—"}
        </span>
        {locked ? <Lock className="h-4 w-4 shrink-0 opacity-50" aria-hidden /> : null}
      </div>
    </div>
  );
}

/**
 * Edit profile — layout inspired by consumer profile forms, adapted for fleet:
 * identity is Command-owned; drivers review details and contact ops to change them.
 */
export default function DriverEditProfilePage({ driver }) {
  const { session, bootstrap } = useDriverSupabaseAuth();
  const organisationName =
    session?.organisationName ||
    bootstrap?.operator?.name ||
    bootstrap?.company?.name ||
    "Your operator";

  const initials = String(driver.fullName || "D")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`min-h-dvh ${op.pageBg} ${op.text}`}
      style={{ paddingBottom: `max(1rem, ${DRIVER_SAFE_BOTTOM})` }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          to="/profile/details"
          aria-label="Back to profile"
          className="flex h-10 w-10 items-center justify-center rounded-full active:bg-muted"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-lg font-bold tracking-tight">Edit profile</h1>
        <Link
          to="/profile/details"
          aria-label="Done"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--ridova-lime-dark)] active:bg-muted"
        >
          <Check className="h-6 w-6" strokeWidth={2.5} />
        </Link>
      </div>

      <div className="mx-auto max-w-lg px-4 pb-4">
        <div className="flex flex-col items-center pt-2">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--ridova-navy)] text-2xl font-bold text-white">
            {initials}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{organisationName}</p>
        </div>

        <div className={`mt-6 space-y-4 p-4 ${op.card}`}>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Name, email and licence are managed by your transport team in Command. Ask ops if something
            needs updating.
          </p>
          <Field label="Name" value={driver.fullName} />
          <Field label="Email address" value={driver.email} />
          <Field label="Phone number" value={driver.phone} />
          <Field label="Licence number" value={driver.licenceNumber} mono />
        </div>

        <div className="mt-5 space-y-3">
          <Link
            to="/contact"
            className={`flex min-h-[48px] w-full items-center justify-center rounded-full text-[15px] font-semibold ${op.primaryBtn}`}
          >
            Contact ops to update
          </Link>
          <Link
            to="/profile/security"
            className="flex min-h-[48px] w-full items-center justify-center rounded-full border border-border bg-card text-[15px] font-semibold text-foreground active:bg-muted"
          >
            Security & password
          </Link>
        </div>
      </div>
    </div>
  );
}
