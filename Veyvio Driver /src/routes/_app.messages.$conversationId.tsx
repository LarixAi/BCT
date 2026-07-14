import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ConversationContextCard,
  ConversationScreenHeader,
} from "@/components/driver/messages/ConversationContextCard";
import { MessageBubble } from "@/components/driver/messages/MessageBubble";
import { QuickReplies } from "@/components/driver/messages/QuickReplies";
import { DrivingSafetyNotice, MessageComposer } from "@/components/driver/messages/MessageComposer";
import { quickRepliesForContext } from "@/domain/messages/message-helpers";
import { useMessagesStore } from "@/store/messages";
import { useDriverStore } from "@/store/driver";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/messages/$conversationId")({
  head: () => ({ meta: [{ title: "Conversation — Veyvio Driver" }] }),
  component: ConversationPage,
});

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const getConversation = useMessagesStore((s) => s.getConversation);
  const markConversationRead = useMessagesStore((s) => s.markConversationRead);
  const acknowledgeConversation = useMessagesStore((s) => s.acknowledgeConversation);
  const sendMessage = useMessagesStore((s) => s.sendMessage);
  const navigate = useNavigate();
  const drivingSafetyMode = useDriverStore((s) => s.drivingSafetyMode);

  const [draft, setDraft] = useState("");
  const [localDetail, setLocalDetail] = useState(() => getConversation(conversationId));

  useEffect(() => {
    markConversationRead(conversationId);
    setLocalDetail(getConversation(conversationId));
  }, [conversationId, getConversation, markConversationRead]);

  const conversation = useMessagesStore((s) => s.conversationDetails[conversationId]) ?? localDetail;

  const quickReplies = useMemo(() => {
    if (!conversation) return [];
    if (conversation.type === "trip") return quickRepliesForContext("trip");
    if (conversation.type === "vehicle" || conversation.type === "defect") return quickRepliesForContext("vehicle");
    return quickRepliesForContext("general");
  }, [conversation]);

  if (!conversation) {
    return <p className="text-sm text-muted">Conversation not found.</p>;
  }

  const needsAck = conversation.messages.some((m) => m.requiresAcknowledgement && !m.acknowledged);

  function handleSend(body: string) {
    sendMessage(conversationId, body);
    setDraft("");
    setLocalDetail(getConversation(conversationId));
  }

  function handleQuickReply(reply: string) {
    if (reply === "Running late") {
      const dutyId =
        useDriverStore.getState().activeDutyId ??
        useDriverStore.getState().homeSummary.nextTrip?.dutyId;
      if (dutyId) {
        void navigate({ to: "/duties/$dutyId/journey/delay", params: { dutyId } });
        return;
      }
      void navigate({ to: "/messages/new", search: { type: "running_late" } });
      return;
    }
    handleSend(reply);
  }

  return (
    <div className="animate-in-up flex min-h-[70vh] flex-col space-y-4 pb-28">
      <ConversationScreenHeader
        senderLabel={conversation.senderLabel}
        subject={conversation.subject}
        onCall={() => undefined}
      />

      <ConversationContextCard context={conversation.context} />

      {drivingSafetyMode && <DrivingSafetyNotice />}

      <div className="flex-1 space-y-3">
        {conversation.messages.map((message) => (
          <MessageBubble key={message.id} message={message} hidePreview={drivingSafetyMode} />
        ))}
      </div>

      {needsAck && !drivingSafetyMode && (
        <Button
          className="w-full"
          onClick={() => {
            acknowledgeConversation(conversationId);
            setLocalDetail(getConversation(conversationId));
          }}
        >
          Acknowledge
        </Button>
      )}

      {conversation.allowReply && (
        <>
          <QuickReplies replies={quickReplies} onSelect={handleQuickReply} disabled={drivingSafetyMode} />
          <MessageComposer
            value={draft}
            onChange={setDraft}
            onSend={() => handleSend(draft)}
            disabled={drivingSafetyMode}
          />
        </>
      )}
    </div>
  );
}
