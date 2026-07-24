import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, MapPin, Shield, User } from "lucide-react";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { MoreSubpageLayout } from "@/components/yard/more/MoreSubpageLayout";
import { useSessionStore } from "@/platform/auth/session-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { beginCompanySwitch, beginDepotSwitch } from "@/platform/tenancy/switch-tenant";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { hubListPanelClass } from "@/features/hub/HubContentPrimitives";

export const Route = createFileRoute("/_app/more/account")({
  head: () => ({ meta: [{ title: yardPageTitle("Account") }] }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const user = useSessionStore(s => s.user);
  const companyName = useTenancyStore(s => s.companyName);
  const depotName = useTenancyStore(s => s.depotName);
  const depotCode = useTenancyStore(s => s.depotCode);
  const role = useTenancyStore(s => s.role);
  const [switching, setSwitching] = useState<"company" | "depot" | null>(null);
  const displayName = user ? `${user.firstName} ${user.lastName}` : "—";
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "?"
    : "?";

  async function handleSwitchCompany() {
    setSwitching("company");
    try {
      await beginCompanySwitch();
      navigate({ to: "/company-select", search: { switch: true } });
    } finally {
      setSwitching(null);
    }
  }

  function handleSwitchDepot() {
    setSwitching("depot");
    beginDepotSwitch();
    navigate({ to: "/depot-select", search: { switch: true } });
    setSwitching(null);
  }

  return (
    <MoreSubpageLayout title="Account" eyebrow="Identity">
      <DashboardSurface>
        <div className="flex items-center gap-3">
          <div className="grid size-14 place-items-center rounded-xl bg-accent text-lg font-extrabold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg font-extrabold truncate text-ink">{displayName}</div>
            <div className="text-sm text-[#667085] truncate">{user?.email ?? "—"}</div>
            <div className="mt-1 text-xs font-semibold text-[#175cd3]">
              {role?.replace(/_/g, " ") ?? "—"}
            </div>
          </div>
        </div>
      </DashboardSurface>

      <DashboardSurface>
        <div className={hubListPanelClass}>
          <AccountRow icon={User} label="Signed-in user" value={displayName} />
          <AccountRow
            icon={MapPin}
            label="Depot"
            value={depotName ? `${depotName} (${depotCode})` : "No depot selected"}
          />
          <AccountRow icon={Building2} label="Company" value={companyName ?? "—"} />
          <AccountRow icon={Shield} label="Role" value={role?.replace(/_/g, " ") ?? "—"} />
        </div>
      </DashboardSurface>

      <DashboardSurface>
        <div className={hubListPanelClass}>
          <button
            type="button"
            onClick={() => void handleSwitchCompany()}
            disabled={switching === "company"}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#fcfcfd] disabled:opacity-60"
          >
            <Building2 className="size-4 shrink-0 text-[#667085]" strokeWidth={1.75} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">Switch company</div>
              <div className="text-xs text-[#667085]">Only operators you are invited to appear here</div>
            </div>
          </button>
          <button
            type="button"
            onClick={handleSwitchDepot}
            disabled={switching === "depot"}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#fcfcfd] disabled:opacity-60"
          >
            <MapPin className="size-4 shrink-0 text-[#667085]" strokeWidth={1.75} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">Switch depot</div>
              <div className="text-xs text-[#667085]">Pick a different yard for this operator</div>
            </div>
          </button>
        </div>
      </DashboardSurface>

      <Link
        to="/more/settings"
        className="block rounded-xl border border-[#b2ddff] bg-[#eff8ff] px-4 py-3 text-sm font-semibold text-[#175cd3]"
      >
        Open settings & security →
      </Link>
    </MoreSubpageLayout>
  );
}

function AccountRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-[#667085]" strokeWidth={1.75} />
      <div className="min-w-0">
        <div className="text-sm font-medium text-[#667085]">{label}</div>
        <div className="text-sm font-semibold truncate text-ink">{value}</div>
      </div>
    </div>
  );
}
