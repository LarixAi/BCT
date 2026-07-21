import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ChevronRight,
  GraduationCap,
  MessageSquare,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DriverEmptyState from "@/components/driver/operational/DriverEmptyState";
import DriverPageContainer from "@/components/driver/operational/DriverPageContainer";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { formatUkDateTime } from "@/lib/uk-locale";
import { DRIVER_NOTIFICATIONS_CHANGED } from "@/lib/notifications/unread-events";
import {
  getDriverNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationCategoryLabel,
  resolveDriverNotificationPath,
} from "@/services/notifications.service";

function severityTone(severity) {
  const s = String(severity ?? "").toLowerCase();
  if (s === "critical" || s === "danger") return "bg-red-100 text-red-800";
  if (s === "attention" || s === "warning") return "bg-amber-100 text-amber-900";
  return "bg-muted text-muted-foreground";
}

function iconFor(type) {
  const t = String(type ?? "").toLowerCase();
  if (t.includes("training")) return GraduationCap;
  if (t.includes("onboarding") || t.includes("document") || t.includes("evidence")) return Shield;
  if (t.includes("critical") || t.includes("overdue")) return AlertTriangle;
  return Bell;
}

function isUnread(row) {
  return !row.readAt && !row.read_at && String(row.status ?? "").toLowerCase() !== "read";
}

export default function DriverNotificationsPage() {
  const navigate = useNavigate();
  const { session } = useDriverSupabaseAuth();
  const userId = session?.userId ?? null;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const skipNextRefreshRef = useRef(false);

  const refresh = useCallback(async () => {
    if (skipNextRefreshRef.current) {
      skipNextRefreshRef.current = false;
      return;
    }
    setError(null);
    try {
      const rows = await getDriverNotifications(userId);
      setItems(rows);
    } catch (err) {
      setError(err?.message || "Notifications could not be loaded from Command.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onChanged = () => {
      void refresh();
    };
    window.addEventListener(DRIVER_NOTIFICATIONS_CHANGED, onChanged);
    return () => window.removeEventListener(DRIVER_NOTIFICATIONS_CHANGED, onChanged);
  }, [refresh]);

  const unreadItems = useMemo(() => items.filter(isUnread), [items]);
  const unreadCount = unreadItems.length;

  async function openItem(row) {
    const path =
      resolveDriverNotificationPath(row.actionUrl || row.action_url, row) || "/documents";

    if (isUnread(row)) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                status: "read",
                readAt: new Date().toISOString(),
                read_at: new Date().toISOString(),
              }
            : item,
        ),
      );
      void markNotificationRead(row.id).catch(() => {});
    }

    navigate(path);
  }

  async function onMarkAll() {
    if (!unreadCount || markingAll) return;
    const unreadIds = unreadItems.map((item) => item.id);
    const previous = items;
    const now = new Date().toISOString();

    setMarkingAll(true);
    setError(null);
    // Optimistic UI — clear New badges immediately.
    setItems((prev) => prev.map((item) => ({ ...item, status: "read", readAt: now, read_at: now })));
    skipNextRefreshRef.current = true;

    try {
      await markAllNotificationsRead(userId, unreadIds);
    } catch (err) {
      setItems(previous);
      setError(err?.message || "Could not mark all as read.");
    } finally {
      setMarkingAll(false);
      // Allow a delayed refresh so the nav badge catches up after the server write.
      window.setTimeout(() => {
        skipNextRefreshRef.current = false;
        void refresh();
      }, 400);
    }
  }

  return (
    <DriverPageContainer>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={op.appLabel}>Notifications</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread from Command`
              : "Training, compliance and ops alerts from your operator"}
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button
            type="button"
            disabled={markingAll}
            className={`h-11 shrink-0 rounded-full px-4 text-sm ${op.secondaryBtn}`}
            onClick={() => void onMarkAll()}
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            {markingAll ? "Updating…" : "Mark all read"}
          </Button>
        ) : null}
      </div>

      <Link
        to="/messages"
        className="mt-4 flex min-h-[56px] items-center gap-3 rounded-2xl border border-[#1eaeae]/30 bg-[#1eaeae]/10 px-4 py-3 active:bg-[#1eaeae]/15"
      >
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/80">
          <MessageSquare className={`h-5 w-5 ${op.iconTeal}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Messages</p>
          <p className="text-xs text-muted-foreground">Dispatch and yard conversations</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          From Command
        </h2>
        {items.length > 0 ? <span className="text-xs text-muted-foreground">{items.length}</span> : null}
      </div>

      {loading ? <DriverPageLoader label="Loading notifications…" /> : null}

      {error ? (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{error}</p>
          <Button type="button" className={`mt-3 h-10 ${op.secondaryBtn}`} onClick={() => void refresh()}>
            Try again
          </Button>
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <div className="mt-3">
          <DriverEmptyState
            icon={Bell}
            title="No notifications yet"
            description="When your operator assigns training, requests documents, or sends an alert, it shows here."
            action={
              <Link to="/messages" className={`text-sm font-semibold ${op.tealAccent}`}>
                Open messages
              </Link>
            }
          />
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className={`mt-3 ${op.listCard}`}>
          {items.map((row) => {
            const Icon = iconFor(row.notificationType || row.notification_type);
            const unread = isUnread(row);
            const created = row.createdAt || row.created_at;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => void openItem(row)}
                className="flex w-full items-start gap-3 border-b border-border px-4 py-3.5 text-left last:border-b-0 active:bg-muted/50"
              >
                <div
                  className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    unread ? "bg-[#1eaeae]/15" : "bg-muted"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${unread ? op.iconTeal : op.textMuted}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`truncate text-[15px] ${unread ? "font-semibold" : "font-medium"}`}>
                      {row.title}
                    </p>
                    {unread ? (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                        New
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                    {row.body || row.message || "Open for details"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${severityTone(row.severity)}`}>
                      {notificationCategoryLabel(row.notificationType || row.notification_type)}
                    </span>
                    {created ? <span>{formatUkDateTime(created)}</span> : null}
                  </div>
                </div>
                <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/70" />
              </button>
            );
          })}
        </div>
      ) : null}
    </DriverPageContainer>
  );
}
