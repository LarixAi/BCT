import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { NEW_MESSAGE_OPTIONS } from "@/data/mocks/messages-inbox";
import { FocusedPageShell } from "@/components/driver/shells/FocusedPageShell";
import { useMessagesStore } from "@/store/messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/messages/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    type: (search.type as string | undefined) ?? undefined,
  }),
  head: () => ({ meta: [{ title: "New message — Veyvio Driver" }] }),
  component: NewMessagePage,
});

function NewMessagePage() {
  const { type } = Route.useSearch();
  const navigate = useNavigate();
  const sendStructuredDelay = useMessagesStore((s) => s.sendStructuredDelay);
  const [selected, setSelected] = useState(type ?? "");
  const [delayMinutes, setDelayMinutes] = useState(10);
  const [reason, setReason] = useState("Traffic");
  const [officeAction, setOfficeAction] = useState(false);

  if (selected === "running_late" || type === "running_late") {
    return (
      <FocusedPageShell
        title="Report running late"
        onBack={() => {
          setSelected("");
          void navigate({ to: "/messages/new" });
        }}
        backLabel="Back"
        eyebrow="Messages"
        subtitle="Route 142 · TRP-10482"
      >
        <div className="animate-in-up space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Estimated delay</legend>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 15].map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={delayMinutes === m ? "default" : "outline"}
                  onClick={() => setDelayMinutes(m)}
                >
                  {m} min
                </Button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label>Reason</Label>
            <div className="flex flex-wrap gap-2">
              {["Traffic", "Passenger delay", "Vehicle issue", "Road closure"].map((r) => (
                <Button
                  key={r}
                  type="button"
                  variant={reason === r ? "default" : "outline"}
                  size="sm"
                  onClick={() => setReason(r)}
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Does the office need to take action?</legend>
            <div className="flex gap-2">
              <Button type="button" variant={!officeAction ? "default" : "outline"} onClick={() => setOfficeAction(false)}>
                No
              </Button>
              <Button type="button" variant={officeAction ? "default" : "outline"} onClick={() => setOfficeAction(true)}>
                Yes
              </Button>
            </div>
          </fieldset>

          <Button
            className="w-full"
            onClick={() => {
              sendStructuredDelay({
                tripReference: "TRP-10482",
                delayMinutes,
                reason,
                officeActionRequired: officeAction,
              });
              void navigate({ to: "/messages/conv_dispatch_142" });
            }}
          >
            Send update
          </Button>
        </div>
      </FocusedPageShell>
    );
  }

  if (selected === "safeguarding") {
    return (
      <FocusedPageShell
        title="Safeguarding concern"
        onBack={() => setSelected("")}
        backLabel="Back"
        eyebrow="Messages"
        subtitle="Routes to authorised safeguarding staff only. For immediate danger, contact emergency services first."
      >
        <div className="animate-in-up space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sg-desc">Describe the concern</Label>
            <Input id="sg-desc" placeholder="Protected operational message" />
          </div>
          <Button className="w-full" variant="destructive">
            Send secure message
          </Button>
        </div>
      </FocusedPageShell>
    );
  }

  if (selected) {
    const option = NEW_MESSAGE_OPTIONS.find((o) => o.id === selected);
    return (
      <FocusedPageShell
        title={option?.label ?? "New message"}
        onBack={() => setSelected("")}
        backLabel="Back"
        eyebrow="Messages"
        subtitle={option?.description}
      >
        <div className="animate-in-up space-y-4">
          <Input placeholder="Describe the issue…" />
          <Button className="w-full">
            Send to {option?.team === "yard" ? "Yard" : option?.team}
          </Button>
        </div>
      </FocusedPageShell>
    );
  }

  return (
    <FocusedPageShell
      title="What do you need help with?"
      backTo="/messages"
      backLabel="Messages"
      eyebrow="Messages"
      subtitle="Choose an approved message type. The right team will be notified."
    >
      <ul className="animate-in-up space-y-2">
        {NEW_MESSAGE_OPTIONS.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              onClick={() => setSelected(option.id)}
              className="w-full rounded-[14px] border border-border bg-background p-4 text-left transition-colors hover:bg-secondary/40"
            >
              <p className="font-semibold">{option.label}</p>
              <p className="mt-0.5 text-sm text-muted">{option.description}</p>
            </button>
          </li>
        ))}
      </ul>
    </FocusedPageShell>
  );
}
