import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import DriverEmptyState from "@/components/driver/operational/DriverEmptyState";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { op } from "@/lib/driver-operational-theme";
import { formatUkDateTime } from "@/lib/uk-locale";
import { listDriverMessageThreads } from "@/services/messages.service";

export default function DriverMessageThreads({ driver, organisationId }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    return listDriverMessageThreads(driver.id, organisationId)
      .then(setThreads)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load threads"));
  }, [driver.id, organisationId]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void load();
    }, 8000);
    return () => window.clearInterval(interval);
  }, [load]);

  return (
    <div>
      <DriverOperationalHeader
        title="Conversations"
        subtitle="Your message threads"
        backTo="/messages"
        right={
          <Link to="/contact" className={`text-sm font-medium ${op.tealAccent} shrink-0 px-2 py-1`}>
            New
          </Link>
        }
      />
      <div className="px-4 pb-8">
        {loading ? <DriverPageLoader label="Loading conversations…" /> : null}
        {error ? <p className="mt-6 text-red-600 text-sm">{error}</p> : null}

        {!loading && threads.length === 0 ? (
          <DriverEmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="Start a message with dispatch or the yard team from Inbox."
            action={
              <Link to="/messages" className={`text-sm font-medium ${op.tealAccent}`}>
                Open inbox
              </Link>
            }
          />
        ) : null}

        <div className="mt-4 space-y-3">
          {threads.map((thread) => (
            <Link key={thread.id} to={`/threads/${thread.id}`} className={`block p-4 ${op.cardInteractive}`}>
              <p className="font-semibold text-sm text-foreground">{thread.subject}</p>
              {thread.lastMessage ? (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{thread.lastMessage}</p>
              ) : null}
              <p className="text-xs text-muted-foreground/80 mt-2">
                {formatUkDateTime(thread.lastMessageAt)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
