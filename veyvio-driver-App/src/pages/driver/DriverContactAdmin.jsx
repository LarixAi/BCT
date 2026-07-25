import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import {
  clearComposeDraft,
  contactAdmin,
  loadComposeDraft,
  saveComposeDraft,
} from "@/services/messages.service";

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
  const { session } = useDriverSupabaseAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("dispatch");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [queuedNotice, setQueuedNotice] = useState("");

  useEffect(() => {
    void loadComposeDraft(driver, session).then((draft) => {
      if (!draft) return;
      if (draft.subject) setSubject(draft.subject);
      if (draft.message) setMessage(draft.message);
      if (draft.audience) setAudience(draft.audience);
    });
  }, [driver, session]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void saveComposeDraft(driver, session, { subject, message, audience });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [subject, message, audience, driver, session]);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    setQueuedNotice("");
    const result = await contactAdmin(driver, { subject, message, audience, session });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (result.queued) {
      setQueuedNotice(result.message);
      await clearComposeDraft(driver, session);
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
          description="Drafts stay on this device in encrypted workspace storage — not browser localStorage."
        />
        {queuedNotice ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            {queuedNotice}
          </div>
        ) : null}
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
