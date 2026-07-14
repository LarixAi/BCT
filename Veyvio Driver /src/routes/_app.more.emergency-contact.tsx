import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MoreSubpageLayout, MoreField } from "@/components/driver/more/MoreLayout";
import { useMoreStore } from "@/store/more";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/more/emergency-contact")({
  head: () => ({ meta: [{ title: "Emergency contact — Veyvio Driver" }] }),
  component: EmergencyContactPage,
});

function EmergencyContactPage() {
  const contact = useMoreStore((s) => s.driverMore.emergencyContact);
  const update = useMoreStore((s) => s.updateEmergencyContact);
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState(contact.primaryPhone);

  return (
    <MoreSubpageLayout title="Emergency contact">
      <p className="text-sm text-muted">
        Only authorised operational and safeguarding staff can access this information.
      </p>
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1">
          <Label htmlFor="ec-name">Contact name</Label>
          <Input id="ec-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <MoreField label="Relationship" value={contact.relationship} />
        <div className="space-y-1">
          <Label htmlFor="ec-phone">Primary telephone</Label>
          <Input id="ec-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        {contact.alternativePhone && (
          <MoreField label="Alternative telephone" value={contact.alternativePhone} />
        )}
        {contact.notes && <MoreField label="Notes" value={contact.notes} />}
      </div>
      <Button className="w-full" onClick={() => update({ name, primaryPhone: phone })}>
        Save emergency contact
      </Button>
    </MoreSubpageLayout>
  );
}
