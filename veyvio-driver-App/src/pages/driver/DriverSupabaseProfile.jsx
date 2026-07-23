import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  HelpCircle,
  LogOut,
  Settings,
  Shield,
  UserRound,
} from "lucide-react";
import DriverCredentialTimeline from "@/components/driver/operational/DriverCredentialTimeline";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { DRIVER_SAFE_BOTTOM } from "@/lib/driverSafeArea";

function MenuRow({ to, icon: Icon, label, danger = false, onClick }) {
  const className = `flex min-h-[54px] w-full items-center gap-3.5 border-b border-border px-4 py-3.5 last:border-b-0 active:bg-muted/50 text-left ${
    danger ? "text-red-600" : "text-foreground"
  }`;

  const inner = (
    <>
      <Icon className={`h-5 w-5 shrink-0 ${danger ? "text-red-500" : op.iconTeal}`} strokeWidth={1.75} />
      <span className="min-w-0 flex-1 text-[15px] font-medium">{label}</span>
      {!danger ? <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50" /> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }

  return (
    <Link to={to} className={className}>
      {inner}
    </Link>
  );
}

export default function DriverSupabaseProfile({ driver, onLogout }) {
  const { session, bootstrap } = useDriverSupabaseAuth();
  const organisationName =
    session?.organisationName ||
    bootstrap?.operator?.name ||
    bootstrap?.company?.name ||
    "Your operator";
  const depotName =
    driver.homeDepotName ||
    session?.depots?.[0]?.name ||
    bootstrap?.operator?.depotName ||
    null;

  const initials = String(driver.fullName || "D")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const subtitle = [organisationName, depotName].filter(Boolean).join(" · ");

  return (
    <div
      className={`min-h-dvh ${op.pageBg} ${op.text}`}
      style={{ paddingBottom: `max(1rem, ${DRIVER_SAFE_BOTTOM})` }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          to="/more"
          aria-label="Back to More"
          className="flex h-10 w-10 items-center justify-center rounded-full active:bg-muted"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-lg font-bold tracking-tight">My profile</h1>
        <Link
          to="/profile/settings"
          aria-label="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-full active:bg-muted"
        >
          <Settings className="h-5 w-5 text-foreground" />
        </Link>
      </div>

      <div className="mx-auto max-w-lg px-4 pb-4">
        {/* Identity card — inspiration: avatar + name + primary edit CTA */}
        <div className={`${op.listCard} p-4`}>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[var(--ridova-navy)] text-xl font-bold text-white">
                {initials}
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-[var(--ridova-teal)] text-white"
                aria-hidden
              >
                <UserRound className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold tracking-tight text-foreground">{driver.fullName}</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
              <Link
                to="/profile/edit"
                className={`mt-3 inline-flex min-h-[40px] w-full max-w-[200px] items-center justify-center rounded-xl px-4 text-sm font-semibold ${op.primaryBtn}`}
              >
                Edit profile
              </Link>
            </div>
          </div>
        </div>

        <div className={`mt-4 overflow-hidden ${op.listCard}`}>
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ridova-teal)]">
              Credentials
            </p>
          </div>
          <DriverCredentialTimeline driver={driver} />
        </div>

        <div className={`mt-4 overflow-hidden ${op.listCard}`}>
          <MenuRow to="/profile/licence" icon={Shield} label="Licence & compliance" />
          <MenuRow to="/documents" icon={FileText} label="Documents" />
          <MenuRow to="/profile/settings" icon={Settings} label="Settings" />
          <MenuRow to="/help" icon={HelpCircle} label="Help & support" />
          <MenuRow icon={LogOut} label="Sign out" danger onClick={() => onLogout?.()} />
        </div>
      </div>
    </div>
  );
}
