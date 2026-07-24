import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { useSyncStore } from "@/platform/sync/outbox";

function formatLastSync(iso: string | null): string {
  if (!iso) return "Not synced yet";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60_000) return "Just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} min ago`;
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function HubPageHeader({
  title,
  description,
  primaryAction,
  secondaryAction,
  showSync = true,
}: {
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  showSync?: boolean;
}) {
  const lastSyncedAt = useSyncStore(s => s.lastSyncedAt);

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-[#667085]">{description}</p>
        ) : null}
        {showSync ? (
          <p className="mt-1 hidden items-center gap-1.5 text-sm text-[#667085] sm:flex">
            <RefreshCw className="size-3.5" aria-hidden />
            Last sync: {formatLastSync(lastSyncedAt)}
          </p>
        ) : null}
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
          {secondaryAction}
          {primaryAction}
        </div>
      )}
    </header>
  );
}

export function HubPrimaryButton({
  children,
  className = "",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white sm:w-auto ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function HubSecondaryButton({
  children,
  className = "",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#e4e7ec] bg-white px-4 text-sm font-medium text-ink shadow-sm sm:w-auto ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export const hubPageShellClass = "space-y-5 pb-6 animate-in-up";
