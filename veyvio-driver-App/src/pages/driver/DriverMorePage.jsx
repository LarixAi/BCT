import { Link } from "react-router-dom";
import {
  Bus,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  FileText,
  GraduationCap,
  MessageSquare,
  Settings,
  ShieldCheck,
  User,
  Wifi,
  Wrench,
  LogOut,
} from "lucide-react";
import DriverPageContainer from "@/components/driver/operational/DriverPageContainer";
import DriverSectionTitle from "@/components/driver/operational/DriverSectionTitle";
import DriverIdBadge from "@/components/driver/DriverIdBadge";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";

function Row({ to, icon: Icon, label, description }) {
  return (
    <Link
      to={to}
      className="flex min-h-[58px] items-center gap-3 border-b border-border bg-card px-4 py-3 last:border-b-0 active:bg-muted/60"
    >
      <div className={op.iconWrap}>
        <Icon className={`h-5 w-5 ${op.iconTeal}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium">{label}</p>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground/60" />
    </Link>
  );
}

export default function DriverMorePage({ driver, onLogout }) {
  const { session, bootstrap } = useDriverSupabaseAuth();
  const orgName =
    bootstrap?.operator?.companyName || session?.organisationName || driver?.organisationName || "Your operator";

  return (
    <DriverPageContainer>
      <div className="rounded-2xl bg-[var(--ridova-navy)] p-4 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ridova-lime)]">Veyvio</p>
        <h1 className="mt-2 text-2xl font-bold">More</h1>
        <p className="mt-1 text-sm text-white/70">
          {[orgName, bootstrap?.operator?.depotName].filter(Boolean).join(" · ") ||
            "Work, vehicle, safety and account tools."}
        </p>
      </div>

      <div className="mt-4">
        <DriverIdBadge driver={driver} organisationName={orgName} compact />
      </div>

      <CommandBackendNotice
        status="partial"
        title="Command-ready tools"
        description="Duties, sign-on, walkarounds, defects, incidents, documents and ops messages write to Admin. Full weekly WTD segments are still partial."
      />

      <DriverSectionTitle>Work</DriverSectionTitle>
      <div className={op.listCard}>
        <Row to="/duty" icon={Clock3} label="My duty" description="Published duties and acknowledgement" />
        <Row to="/schedule" icon={CalendarDays} label="Schedule & availability" description="Calendar, duties and request time off" />
        <Row to="/readiness" icon={ShieldCheck} label="Driver readiness" description="Compliance and eligibility to work" />
        <Row to="/training" icon={GraduationCap} label="Training centre" description="Mandatory modules and certificates" />
        <Row to="/working-time" icon={Clock3} label="Working time" description="Hours, breaks and WTD status" />
        <Row to="/documents" icon={FileText} label="Documents" description="Credentials and uploaded evidence" />
      </div>

      <DriverSectionTitle>Vehicle & safety</DriverSectionTitle>
      <div className={op.listCard}>
        <Row to="/vehicle" icon={Bus} label="Current vehicle" description="Assignment, equipment and handback" />
        <Row to="/check/history" icon={ClipboardCheck} label="Vehicle check history" />
        <Row to="/defects" icon={Wrench} label="Report defect" description="Sends to Command defects register" />
        <Row to="/safety" icon={ShieldCheck} label="Emergency & safeguarding" />
        <Row
          to="/lost-property"
          icon={FileText}
          label="Lost property"
          description="Report found items and depot handover"
        />
      </div>

      <DriverSectionTitle>Communication & support</DriverSectionTitle>
      <div className={op.listCard}>
        <Row to="/messages" icon={MessageSquare} label="Messages" description="Conversations, alerts and notices" />
        <Row to="/sync" icon={Wifi} label="Offline & sync" description="Command bootstrap status" />
        <Row
          to="/profile/details"
          icon={User}
          label="My profile"
          description="Operator account, credentials and links"
        />
        <Row
          to="/profile/settings"
          icon={Settings}
          label="Settings"
          description="Notifications, navigation and contact"
        />
        <Row to="/help" icon={CircleHelp} label="Help & support" />
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="mt-7 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 font-semibold text-red-700"
      >
        <LogOut className="h-5 w-5" />
        Sign out
      </button>
    </DriverPageContainer>
  );
}
