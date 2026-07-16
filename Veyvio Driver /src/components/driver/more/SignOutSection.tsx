import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getSignOutAssessment, performSignOut } from "@/platform/auth/sign-out";
import { cn } from "@/lib/utils";

export function SignOutSection({ variant = "default" }: { variant?: "default" | "hub" }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const assessment = open ? getSignOutAssessment() : null;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await performSignOut();
      navigate({ to: "/sign-in", replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  if (!open) {
    return (
      <section className={cn(variant === "hub" ? "mt-2" : "mt-8 border-t border-border pt-6")}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "w-full font-extrabold",
            variant === "hub"
              ? "min-h-[52px] rounded-[14px] border border-[rgba(217,45,32,0.25)] bg-white text-vor"
              : "h-12 rounded-xl border border-border bg-card text-foreground",
          )}
        >
          Sign out
        </button>
      </section>
    );
  }

  const blocked = assessment?.severity === "blocked";
  const warned = assessment?.severity === "warning";

  return (
    <section
      className={cn("space-y-4", variant === "hub" ? "mt-2" : "mt-8 border-t border-border pt-6")}
    >
      <div>
        <p className="text-sm font-bold">Sign out of Veyvio Driver</p>
        <p className="mt-1 text-xs text-muted">
          {blocked
            ? "Finish active work on this device before signing out."
            : "Downloaded operational data will remain protected on this device. Unsynced changes must be sent before signing out."}
        </p>
      </div>

      {assessment?.blockers.map((blocker) => (
        <p
          key={blocker}
          className="rounded-xl border border-vor/30 bg-vor/5 px-4 py-3 text-sm text-vor"
        >
          {blocker}
        </p>
      ))}

      {assessment?.warnings.map((warning) => (
        <p
          key={warning}
          className="rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn"
        >
          {warning}
        </p>
      ))}

      <div className="flex flex-col gap-2">
        {blocked && assessment?.primaryAction && (
          <Button asChild className="h-12 w-full font-bold">
            <Link to={assessment.primaryAction.href}>{assessment.primaryAction.label}</Link>
          </Button>
        )}

        {!blocked && (
          <Button
            variant="destructive"
            className="h-12 w-full font-bold"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
          >
            {signingOut ? "Signing out…" : warned ? "Sign out anyway" : "Sign out"}
          </Button>
        )}

        <Button
          variant="outline"
          className="h-12 w-full"
          disabled={signingOut}
          onClick={() => setOpen(false)}
        >
          {blocked ? "Stay signed in" : "Cancel"}
        </Button>
      </div>
    </section>
  );
}
