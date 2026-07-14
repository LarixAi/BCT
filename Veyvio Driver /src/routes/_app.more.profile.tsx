import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MoreSubpageLayout, MoreField } from "@/components/driver/more/MoreLayout";
import { useMoreStore } from "@/store/more";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/more/profile")({
  head: () => ({ meta: [{ title: "Personal information — Veyvio Driver" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const personal = useMoreStore((s) => s.driverMore.personal);
  const identity = useMoreStore((s) => s.driverMore.identity);
  const updatePersonal = useMoreStore((s) => s.updatePersonal);
  const [displayName, setDisplayName] = useState(personal.displayName);
  const [mobile, setMobile] = useState(personal.mobile);

  return (
    <MoreSubpageLayout title="Personal information">
      <div className="rounded-xl border border-border bg-card">
        <MoreField label="Legal name" value={personal.legalName} hint="Change requests require office review" />
        <MoreField label="Driver ID" value={identity.id} hint="Read-only" />
        <MoreField label="Date of birth" value={personal.dateOfBirth} hint="Read-only" />
        <MoreField label="Company" value={identity.companyName} hint="Read-only" />
        <MoreField label="Depot" value={identity.depotName} hint="Read-only" />
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1">
          <Label htmlFor="display-name">Preferred display name</Label>
          <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mobile">Mobile number</Label>
          <Input id="mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <p className="text-xs text-muted">Changes require verification</p>
        </div>
        <MoreField label="Email" value={personal.email} />
        <MoreField label="Home address" value={personal.homeAddress} hint="Changes are audit-recorded" />
        {personal.pronouns && <MoreField label="Pronouns" value={personal.pronouns} />}
      </div>

      <Button
        className="w-full"
        onClick={() => updatePersonal({ displayName, mobile })}
      >
        Save changes
      </Button>
    </MoreSubpageLayout>
  );
}
