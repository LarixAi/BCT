import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { op } from "@/lib/driver-operational-theme";
import { contactAdmin } from "@/services/messages.service";

const AUDIENCES = [
  {
    value: "dispatch",
    label: "Dispatch / Command",
    description: "Transport office and controllers in Admin",
  },
  {
    value: "yard",
    label: "Yard",
    description: "Yard team — bay, vehicle readiness, handover",
  },
  {
    value: "both",
    label: "Dispatch and Yard",
    description: "Visible to Command and Yard at the same time",
  },
];

export default function DriverContactAdmin({ driver }) {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("dispatch");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSubmitting(true);
    setError("");
    const result = await contactAdmin(driver, { subject, message, audience });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate(`/threads/${result.threadId}`);
  };

  return (
    <div>
      <DriverOperationalHeader
        title="Contact ops"
        subtitle="Message dispatch or the yard team"
        backTo="/messages"
      />
      <div className="px-4 pb-8">
        <CommandBackendNotice
          status="ready"
          title="Messages reach Admin and Yard"
          description="Choose who should see this. Dispatch and Yard share the same Command inbox — no old Ridova tables."
        />
        <form
          className={`mt-4 space-y-4 ${op.card} p-4`}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Send to</p>
            <div className="mt-2 space-y-2">
              {AUDIENCES.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-3 ${
                    audience === option.value ? "border-[#1eaeae] bg-[#1eaeae]/10" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="audience"
                    value={option.value}
                    checked={audience === option.value}
                    onChange={() => setAudience(option.value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className={`mt-1 w-full rounded-xl px-4 py-3 text-sm ${op.input}`}
              placeholder="What do you need help with?"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
              className={`mt-1 w-full rounded-xl px-4 py-3 text-sm resize-none ${op.input}`}
              placeholder="Write your message…"
            />
          </div>
          {error ? <p className="text-red-600 text-sm">{error}</p> : null}
          <Button type="submit" disabled={submitting} className={`w-full h-11 ${op.primaryBtn}`}>
            {submitting ? "Sending…" : "Send message"}
          </Button>
          <Button type="button" variant="ghost" asChild className="w-full text-muted-foreground">
            <Link to="/messages">View past conversations</Link>
          </Button>
        </form>
      </div>
    </div>
  );
}
