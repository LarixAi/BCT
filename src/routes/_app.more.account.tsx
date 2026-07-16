import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, MapPin, Shield, User } from "lucide-react";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { MoreSubpageLayout } from "@/components/yard/more/MoreSubpageLayout";
import { useSessionStore } from "@/platform/auth/session-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";

export const Route = createFileRoute("/_app/more/account")({
  head: () => ({ meta: [{ title: yardPageTitle("Account") }] }),
  component: AccountPage,
});

function AccountPage() {
  const user = useSessionStore(s => s.user);
  const companyName = useTenancyStore(s => s.companyName);
  const depotName = useTenancyStore(s => s.depotName);
  const depotCode = useTenancyStore(s => s.depotCode);
  const role = useTenancyStore(s => s.role);
  const displayName = user ? `${user.firstName} ${user.lastName}` : "—";
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "?"
    : "?";

  return (
    <MoreSubpageLayout title="Account" eyebrow="Identity">
      <section className="rounded-xs border border-border bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-14 place-items-center rounded-xs bg-accent text-lg font-extrabold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg font-extrabold truncate">{displayName}</div>
            <div className="text-xs text-muted truncate">{user?.email ?? "—"}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              {role?.replace(/_/g, " ") ?? "—"}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xs border border-border bg-white divide-y divide-border">
        <AccountRow icon={User} label="Signed-in user" value={displayName} />
        <AccountRow
          icon={MapPin}
          label="Depot"
          value={depotName ? `${depotName} (${depotCode})` : "No depot selected"}
        />
        <AccountRow icon={Building2} label="Company" value={companyName ?? "—"} />
        <AccountRow icon={Shield} label="Role" value={role?.replace(/_/g, " ") ?? "—"} />
      </section>

      <p className="text-xs text-muted px-1">
        Account details come from your company tenancy. Change depot from sign-in if you work across sites.
      </p>

      <Link
        to="/more/settings"
        className="block rounded-xs border border-primary/30 bg-yard-teal-soft px-4 py-3 text-sm font-bold text-accent"
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
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  );
}
