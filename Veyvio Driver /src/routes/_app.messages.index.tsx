import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { MessagesWorkspaceScreen } from "@/components/driver/messages/MessagesWorkspaceScreen";
import { buildEmptyInbox, buildMockMessagesInbox } from "@/data/mocks/messages-inbox";
import { useMessagesStore } from "@/store/messages";
import { resolveDemoParam } from "@/platform/dev/dev-guards";

type MessagesDemo = "normal" | "empty" | "offline";

export const Route = createFileRoute("/_app/messages/")({
  validateSearch: (search: Record<string, unknown>) => ({
    demo: (search.demo as MessagesDemo | undefined) ?? "normal",
    conversationId: (search.conversationId as string | undefined) ?? undefined,
  }),
  head: () => ({ meta: [{ title: "Messages — Veyvio Driver" }] }),
  component: MessagesInboxPage,
});

function MessagesInboxPage() {
  const { demo: rawDemo, conversationId } = Route.useSearch();
  const demo = resolveDemoParam(rawDemo) ?? "normal";
  const storeInbox = useMessagesStore((s) => s.inbox);

  const inbox = useMemo(() => {
    if (demo === "empty") return buildEmptyInbox();
    if (demo === "offline") return buildMockMessagesInbox();
    return storeInbox;
  }, [demo, storeInbox]);

  return (
    <MessagesWorkspaceScreen inbox={inbox} initialConversationId={conversationId} />
  );
}
