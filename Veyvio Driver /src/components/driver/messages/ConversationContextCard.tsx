import { Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConversationContext } from "@/types/messages";

export function ConversationContextCard({ context }: { context: ConversationContext }) {
  const hasContext =
    context.tripReference || context.vehicleRegistration || context.routeName || context.tripStatus;

  if (!hasContext) return null;

  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3 text-sm">
      {context.tripReference && (
        <p>
          <span className="text-muted">Trip </span>
          <span className="font-mono font-semibold">{context.tripReference}</span>
        </p>
      )}
      {context.routeName && <p className="text-muted">{context.routeName}</p>}
      {context.vehicleRegistration && (
        <p className="font-mono text-xs">Vehicle {context.vehicleRegistration}</p>
      )}
      {context.tripStatus && (
        <p className="mt-1 text-xs font-medium text-link">{context.tripStatus}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {context.tripId && (
          <Button asChild size="sm" variant="outline">
            <Link to={`/trips/${context.tripId}`}>View trip</Link>
          </Button>
        )}
        {context.vehicleId && (
          <Button asChild size="sm" variant="outline">
            <Link to="/checks">View vehicle</Link>
          </Button>
        )}
        {context.defectId && (
          <Button asChild size="sm" variant="outline">
            <Link to="/checks/result">View defect</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function ConversationScreenHeader({
  senderLabel,
  subject,
  onCall,
}: {
  senderLabel: string;
  subject: string;
  onCall?: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border pb-3">
      <div className="min-w-0">
        <Link to="/messages" className="text-sm text-link">
          ‹ Back
        </Link>
        <h1 className="font-display text-lg font-extrabold">{senderLabel}</h1>
        <p className="truncate text-sm text-muted">{subject}</p>
      </div>
      {onCall && (
        <Button variant="outline" size="icon" onClick={onCall} aria-label="Call office">
          <Phone className="size-4" />
        </Button>
      )}
    </header>
  );
}
