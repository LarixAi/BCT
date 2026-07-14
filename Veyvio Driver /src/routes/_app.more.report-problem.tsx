import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isOnline } from "@/platform/device/connectivity";

export const Route = createFileRoute("/_app/more/report-problem")({
  head: () => ({ meta: [{ title: "Report a problem — Veyvio Driver" }] }),
  component: ReportProblemPage,
});

function ReportProblemPage() {
  const [description, setDescription] = useState("");
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);

  return (
    <MoreSubpageLayout title="Report an app problem">
      <p className="text-sm text-muted">
        Describe what went wrong. With your consent we can include app version, device and network status — not
        passenger-sensitive information.
      </p>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="problem">What happened?</Label>
          <Input
            id="problem"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue"
          />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeDiagnostics}
            onChange={(e) => setIncludeDiagnostics(e.target.checked)}
            className="mt-1 accent-primary"
          />
          <span>
            Include diagnostics (app v0.1.0, device, OS, network: {isOnline() ? "online" : "offline"})
          </span>
        </label>
      </div>
      <Button className="w-full" disabled={!description.trim()}>
        Submit report
      </Button>
    </MoreSubpageLayout>
  );
}
