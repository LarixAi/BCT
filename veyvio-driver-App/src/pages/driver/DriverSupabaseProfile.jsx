import { Link } from "react-router-dom";
import {
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  HelpCircle,
  Settings,
  Shield,
  User,
  Wrench,
  ClipboardList,
  Bus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DriverIdBadge from "@/components/driver/DriverIdBadge";
import DriverCredentialTimeline from "@/components/driver/operational/DriverCredentialTimeline";
import DriverPageContainer from "@/components/driver/operational/DriverPageContainer";
import DriverSectionTitle from "@/components/driver/operational/DriverSectionTitle";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";

function NavRow({ to, icon: Icon, label, description }) {
  return (
    <Link
      to={to}
      className="flex min-h-[52px] items-center gap-4 border-b border-border bg-card px-4 py-3.5 last:border-b-0 active:bg-muted/60"
    >
      <div className={op.iconWrap}>
        <Icon className={`h-5 w-5 ${op.iconTeal}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-foreground">{label}</p>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/60" />
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
  const duty = bootstrap?.duties?.[0];
  const vehicleReg =
    duty?.vehicle?.registrationNumber ||
    duty?.vehicle?.registration ||
    driver.assignedVehicleRegistration ||
    null;

  return (
    <DriverPageContainer>
      <div className="mb-4 flex items-start gap-3">
        <Link
          to="/more"
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card active:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <p className={op.appLabel}>Veyvio</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">My profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Account details linked to {organisationName}. Contact changes go through Admin.
          </p>
        </div>
      </div>

      <div className={`overflow-hidden ${op.listCard}`}>
        <div className="flex items-start gap-4 px-4 py-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--ridova-teal)]/25 bg-[var(--ridova-teal)]/10">
            <User className={`h-7 w-7 ${op.iconTeal}`} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight text-foreground">
              {driver.fullName}
            </h2>
            {driver.email ? (
              <p className="mt-1 truncate text-sm text-muted-foreground">{driver.email}</p>
            ) : null}
            {driver.phone ? <p className="text-sm text-muted-foreground">{driver.phone}</p> : null}
            {depotName ? (
              <p className="mt-2 text-xs font-medium text-[var(--ridova-teal)]">{depotName}</p>
            ) : null}
          </div>
        </div>
      </div>

      {(vehicleReg || duty?.reference) && (
        <Link to="/vehicle" className={`mt-3 flex items-center gap-3 p-4 ${op.card}`}>
          <div className={op.iconWrap}>
            <Bus className={`h-5 w-5 ${op.iconTeal}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Current vehicle
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
              {vehicleReg || "On published duty"}
            </p>
            <p className="text-xs text-muted-foreground">
              {duty?.reference || duty?.routeName || "Open vehicle hub"}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/60" />
        </Link>
      )}

      <div className="mt-4">
        <DriverIdBadge driver={driver} organisationName={organisationName} compact />
      </div>

      <div className={`mt-5 ${op.listCard}`}>
        <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-[var(--ridova-teal)]">
          Credentials
        </p>
        <DriverCredentialTimeline driver={driver} />
      </div>

      <DriverSectionTitle>Shift &amp; hours</DriverSectionTitle>
      <div className={op.listCard}>
        <NavRow to="/duty" icon={Clock} label="My duty" description="Sign on, activities, sign off" />
        <NavRow
          to="/working-time"
          icon={Clock}
          label="My working time"
          description="Weekly hours from Command duties"
        />
        <NavRow
          to="/schedule"
          icon={ClipboardList}
          label="Schedule"
          description="Published duties from Admin"
        />
        <NavRow
          to="/schedule"
          icon={CalendarOff}
          label="Schedule & time off"
          description="Calendar, duties, and leave requests"
        />
      </div>

      <DriverSectionTitle>Safety</DriverSectionTitle>
      <div className={op.listCard}>
        <NavRow
          to="/check"
          icon={ClipboardCheck}
          label="Daily vehicle check"
          description="Required walkaround before duty"
        />
        <NavRow
          to="/vehicle/checks"
          icon={ClipboardCheck}
          label="My vehicle checks"
          description="Completed walkarounds"
        />
        <NavRow
          to="/defects"
          icon={Wrench}
          label="Report defect"
          description="Sends to Command / Admin defects"
        />
        <NavRow
          to="/incidents/new"
          icon={Shield}
          label="Report incident"
          description="Accidents and safety events"
        />
        <NavRow
          to="/acknowledgements"
          icon={ClipboardList}
          label="Acknowledgements"
          description="Debriefs and corrective actions"
        />
        <NavRow
          to="/policies"
          icon={Shield}
          label="Policies"
          description="Review and re-accept operator policies"
        />
      </div>

      <DriverSectionTitle>Account</DriverSectionTitle>
      <div className={op.listCard}>
        <NavRow
          to="/profile/licence"
          icon={Shield}
          label="Licence & compliance"
          description="Reviewed in Admin for your company"
        />
        <NavRow
          to="/documents"
          icon={FileText}
          label="Documents"
          description="Uploads sync to Command for verification"
        />
        <NavRow
          to="/profile/settings"
          icon={Settings}
          label="Settings"
          description="Notifications, navigation and contact"
        />
        <NavRow to="/help" icon={HelpCircle} label="Help & support" description="FAQs and operator contact" />
      </div>

      <Button
        variant="ghost"
        onClick={onLogout}
        className="mt-8 min-h-[44px] w-full text-muted-foreground hover:bg-red-50 hover:text-red-600"
      >
        Sign out
      </Button>
    </DriverPageContainer>
  );
}
