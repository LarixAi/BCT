import type {
  ConversationDetail,
  ConversationSummary,
  MessageItem,
  MessagesInboxPayload,
  MessagePriority,
  SenderTeam,
} from "@/types/messages";
import { formatMessageTime, senderTeamLabel } from "@/domain/messages/message-helpers";
import { NEW_MESSAGE_OPTIONS } from "@/data/mocks/messages-inbox";
import type { DutiesSheetSize } from "@/domain/trips/duties-workspace-view";
import { isOnline } from "@/platform/device/connectivity";

export type MessagesWorkspaceStage =
  | "inbox"
  | "ack"
  | "thread"
  | "urgent"
  | "offline"
  | "driving"
  | "safeguarding"
  | "resolved";

export type MessagesSheetSize = DutiesSheetSize;

export interface MessagesThreadBubble {
  id: string;
  direction: "in" | "out" | "system";
  sender?: string;
  body: string;
  meta: string;
  urgent?: boolean;
  structuredFields?: { label: string; value: string }[];
}

export interface MessagesWorkspaceView {
  stage: MessagesWorkspaceStage;
  toneClass: "" | "ok" | "warn" | "red";
  toneLabel: string;
  stageLabel: string;
  stageTitle: string;
  title: string;
  copy: string;
  meta1: { label: string; value: string };
  meta2: { label: string; value: string };
  primaryLabel: string;
  primaryTone: "" | "ok" | "warn" | "red";
  primaryAction:
    | "open_urgent"
    | "acknowledge"
    | "view_conversation"
    | "call_ops"
    | "open_when_stopped"
    | "start_safeguarding"
    | "view_resolution"
    | "none";
  secondary1: { label: string; href?: string; action?: "mark_all_read" | "call_ops" | "call_999" };
  secondary2: { label: string; href?: string; action?: "acknowledge" };
  pillSub: string;
  showComposer: boolean;
  contextChips: string[];
  bubbles: MessagesThreadBubble[];
  conversations: ConversationSummary[];
  unreadTotal: number;
  focusedId?: string;
  approvedTypes: Array<{
    id: string;
    initials: string;
    title: string;
    subtitle: string;
    tone: "" | "ok" | "red";
    href: string;
  }>;
}

export function avatarInitials(label: string, team?: SenderTeam): string {
  if (team === "dispatch") return "OP";
  if (team === "yard") return "YD";
  if (team === "maintenance") return "MT";
  if (team === "compliance") return "SG";
  if (team === "company") return "CO";
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function avatarTone(
  priority: MessagePriority,
  team: SenderTeam,
  requiresAck?: boolean,
): "" | "ok" | "red" {
  if (priority === "critical" || requiresAck || team === "compliance") return "red";
  if (priority === "normal" && team === "company") return "ok";
  return "";
}

function deliveryMeta(message: MessageItem): string {
  const time = formatMessageTime(message.createdAt);
  if (message.deliveryStatus === "waiting") return `${time} · Waiting to send`;
  if (message.deliveryStatus === "failed") return `${time} · Failed`;
  if (message.requiresAcknowledgement && !message.acknowledged) {
    return `${time} · Requires acknowledgement`;
  }
  if (message.deliveryStatus === "delivered") return `${time} · Delivered`;
  if (message.deliveryStatus === "sent") return `${time} · Sent`;
  if (message.isOwn) return `${time} · Sent`;
  return time;
}

function bubblesFromConversation(
  conversation: ConversationDetail | null,
  hidePreview: boolean,
): MessagesThreadBubble[] {
  if (!conversation) return [];
  if (hidePreview) {
    return [
      {
        id: "hidden",
        direction: "system",
        body: "Message preview hidden while the vehicle is moving.",
        meta: "Stop safely before reading or replying",
      },
      {
        id: "hidden-2",
        direction: "in",
        sender: "Safety mode",
        body: "Stop safely before reading or replying.",
        meta: "Driving safety mode",
        urgent: true,
      },
    ];
  }

  return conversation.messages
    .filter((m) => m.messageType !== "system_event")
    .slice(-6)
    .map((m) => ({
      id: m.id,
      direction: (m.isOwn ? "out" : "in") as "in" | "out",
      sender: m.isOwn ? undefined : m.senderLabel,
      body: m.body,
      meta: deliveryMeta(m),
      urgent:
        (m.requiresAcknowledgement && !m.acknowledged) ||
        conversation.priority === "critical" ||
        conversation.priority === "urgent",
      structuredFields: m.structuredFields,
    }));
}

function contextChips(conversation: ConversationDetail | null, inboxMode: boolean): string[] {
  if (inboxMode) return ["All messages", "Operations", "Today"];
  if (!conversation) return ["Messages"];
  const chips: string[] = [];
  if (conversation.context.routeName) chips.push(conversation.context.routeName);
  if (conversation.context.vehicleRegistration) {
    chips.push(`Vehicle ${conversation.context.vehicleRegistration}`);
  }
  if (conversation.context.tripReference) chips.push(conversation.context.tripReference);
  if (chips.length === 0) chips.push(senderTeamLabel(conversation.senderTeam));
  if (conversation.senderTeam === "dispatch") chips.push("Dispatch");
  else if (conversation.senderTeam === "yard") chips.push("Yard");
  return chips.slice(0, 3);
}

function pickFocusConversation(
  inbox: MessagesInboxPayload,
  preferredId?: string,
): ConversationSummary | undefined {
  if (preferredId) {
    const preferred = inbox.conversations.find((c) => c.id === preferredId);
    if (preferred) return preferred;
  }
  if (inbox.urgent && !inbox.urgent.acknowledged) {
    const urgent = inbox.conversations.find((c) => c.id === inbox.urgent!.conversationId);
    if (urgent) return urgent;
  }
  return (
    inbox.conversations.find((c) => c.requiresAcknowledgement && !c.acknowledged) ??
    inbox.conversations.find((c) => c.unreadCount > 0) ??
    inbox.conversations[0]
  );
}

function mapStage(input: {
  inbox: MessagesInboxPayload;
  conversation: ConversationDetail | null;
  drivingSafetyMode: boolean;
  online: boolean;
  inboxOverview: boolean;
}): MessagesWorkspaceStage {
  if (input.drivingSafetyMode) return "driving";
  if (input.inboxOverview || !input.conversation) return "inbox";

  const conv = input.conversation;
  if (conv.type === "safeguarding" || conv.category === "safeguarding") return "safeguarding";
  if (conv.status === "resolved" || conv.status === "archived") return "resolved";

  const hasPendingOut = conv.messages.some(
    (m) => m.isOwn && (m.deliveryStatus === "waiting" || m.deliveryStatus === "sending"),
  );
  if (!input.online && hasPendingOut) return "offline";

  if (
    input.inbox.urgent &&
    !input.inbox.urgent.acknowledged &&
    input.inbox.urgent.conversationId === conv.id &&
    (input.inbox.urgent.priority === "critical" || conv.priority === "critical")
  ) {
    return "urgent";
  }

  const needsAck =
    (conv.requiresAcknowledgement && !conv.acknowledged) ||
    conv.messages.some((m) => m.requiresAcknowledgement && !m.acknowledged);
  if (needsAck) return "ack";

  if (conv.priority === "critical" || conv.priority === "urgent") return "urgent";

  return "thread";
}

const approvedTypes: MessagesWorkspaceView["approvedTypes"] = [
  {
    id: "running_late",
    initials: "+5",
    title: "Report running late",
    subtitle: "Send a structured delay update",
    tone: "" as const,
    href: "/messages/new?type=running_late",
  },
  {
    id: "vehicle_issue",
    initials: "V",
    title: "Vehicle issue",
    subtitle: "Send to Yard or Operations",
    tone: "" as const,
    href: "/messages/new?type=vehicle_issue",
  },
  {
    id: "safeguarding",
    initials: "SG",
    title: "Safeguarding concern",
    subtitle: "Secure authorised channel",
    tone: "red" as const,
    href: "/messages/new?type=safeguarding",
  },
].map((row) => {
  const option = NEW_MESSAGE_OPTIONS.find((o) => o.id === row.id);
  return option
    ? {
        ...row,
        title: option.label === "Running late" ? row.title : option.label,
        subtitle: option.description,
      }
    : row;
});

/**
 * Map inbox + focused conversation into the Messages workspace sheet / thread.
 */
export function buildMessagesWorkspaceView(input: {
  inbox: MessagesInboxPayload;
  conversation: ConversationDetail | null;
  drivingSafetyMode: boolean;
  online?: boolean;
  /** Force the inbox-overview sheet (pill / empty focus) */
  inboxOverview?: boolean;
}): MessagesWorkspaceView {
  const online = input.online ?? isOnline();
  const conversations = input.inbox.conversations;
  const unread = input.inbox.unreadTotal;
  const stage = mapStage({
    inbox: input.inbox,
    conversation: input.conversation,
    drivingSafetyMode: input.drivingSafetyMode,
    online,
    inboxOverview: Boolean(input.inboxOverview) || !input.conversation,
  });

  const base = {
    conversations,
    unreadTotal: unread,
    focusedId: input.conversation?.id,
    approvedTypes,
    contextChips: contextChips(input.conversation, stage === "inbox"),
    bubbles: bubblesFromConversation(input.conversation, stage === "driving"),
  };

  switch (stage) {
    case "inbox":
      return {
        ...base,
        stage,
        toneClass: unread > 0 ? "" : "ok",
        toneLabel: unread > 0 ? `${unread} unread` : "All caught up",
        stageLabel: "Messages",
        stageTitle: "Inbox overview",
        title: unread > 0 ? "Messages that need your attention" : "You're all caught up",
        copy:
          unread > 0
            ? "Urgent operational updates appear first. Routine conversations remain available below."
            : "Operational messages, trip updates and company announcements will appear here.",
        meta1: {
          label: "Urgent",
          value: input.inbox.urgent && !input.inbox.urgent.acknowledged ? "1 update" : "None",
        },
        meta2: { label: "Unread", value: `${unread} message${unread === 1 ? "" : "s"}` },
        primaryLabel: input.inbox.urgent && !input.inbox.urgent.acknowledged
          ? "OPEN URGENT UPDATE"
          : unread > 0
            ? "OPEN FIRST UNREAD"
            : "NEW MESSAGE",
        primaryTone: "",
        primaryAction:
          input.inbox.urgent && !input.inbox.urgent.acknowledged
            ? "open_urgent"
            : unread > 0
              ? "view_conversation"
              : "none",
        secondary1: { label: "Mark all read", action: "mark_all_read" },
        secondary2: { label: "New message", href: "/messages/new" },
        pillSub: unread > 0 ? `${unread} unread` : "Inbox clear",
        showComposer: false,
      };

    case "ack": {
      const conv = input.conversation!;
      return {
        ...base,
        stage,
        toneClass: "warn",
        toneLabel: "Acknowledgement required",
        stageLabel: "Current conversation",
        stageTitle: `${conv.senderLabel} · ${conv.context.routeName ?? conv.subject}`,
        title: conv.subject,
        copy: "Read the operational update and acknowledge it before departure.",
        meta1: { label: "From", value: conv.senderLabel },
        meta2: {
          label: "Applies to",
          value: conv.context.routeName ?? conv.context.tripReference ?? "Current duty",
        },
        primaryLabel: "ACKNOWLEDGE UPDATE",
        primaryTone: "warn",
        primaryAction: "acknowledge",
        secondary1: { label: "Call Operations", action: "call_ops", href: "/more/support" },
        secondary2: {
          label: "View duty",
          href: conv.context.tripId ? `/trips?dutyId=${conv.context.tripId}` : "/trips",
        },
        pillSub: unread > 0 ? `${unread} unread` : "Acknowledgement needed",
        showComposer: true,
      };
    }

    case "thread": {
      const conv = input.conversation!;
      return {
        ...base,
        stage,
        toneClass: "",
        toneLabel: conv.context.vehicleRegistration ? "Vehicle context" : "Conversation",
        stageLabel: "Conversation",
        stageTitle: conv.senderLabel,
        title: conv.subject,
        copy: conv.preview,
        meta1: {
          label: conv.context.vehicleRegistration ? "Vehicle" : "From",
          value: conv.context.vehicleRegistration ?? conv.senderLabel,
        },
        meta2: {
          label: conv.context.tripReference ? "Trip" : "Updated",
          value: conv.context.tripReference ?? formatMessageTime(conv.updatedAt),
        },
        primaryLabel: conv.context.vehicleRegistration
          ? "VIEW VEHICLE DETAILS"
          : "VIEW CONVERSATION",
        primaryTone: "",
        primaryAction: "view_conversation",
        secondary1: {
          label: conv.senderTeam === "yard" ? "Call Yard" : "Call Operations",
          href: "/more/support",
        },
        secondary2: { label: "Open duty", href: "/trips" },
        pillSub: unread > 0 ? `${unread} unread` : "Conversation open",
        showComposer: conv.allowReply,
      };
    }

    case "urgent": {
      const conv = input.conversation!;
      const urgent = input.inbox.urgent;
      return {
        ...base,
        stage,
        toneClass: "red",
        toneLabel: "Critical operational update",
        stageLabel: "Urgent message",
        stageTitle: conv.senderLabel,
        title: urgent?.title ?? conv.subject,
        copy:
          urgent?.body ??
          "A critical operational update needs action. Contact Operations before continuing.",
        meta1: {
          label: "Case",
          value: conv.context.tripReference ?? conv.id.replace("conv_", "").toUpperCase(),
        },
        meta2: {
          label: "Status",
          value: conv.context.tripStatus ?? "Action required",
        },
        primaryLabel: "CALL OPERATIONS",
        primaryTone: "red",
        primaryAction: "call_ops",
        secondary1: { label: "View case", href: `/messages/${conv.id}` },
        secondary2: { label: "Acknowledge", action: "acknowledge" },
        pillSub: "Urgent update",
        showComposer: false,
      };
    }

    case "offline": {
      const conv = input.conversation!;
      const pending = [...conv.messages].reverse().find(
        (m) => m.isOwn && (m.deliveryStatus === "waiting" || m.deliveryStatus === "sending"),
      );
      return {
        ...base,
        stage,
        toneClass: "warn",
        toneLabel: "Offline · saved on device",
        stageLabel: "Conversation",
        stageTitle: conv.senderLabel,
        title: "Message waiting to send",
        copy: "Your update is stored safely and will send when the connection returns.",
        meta1: { label: "Delivery", value: "Waiting" },
        meta2: {
          label: "Saved",
          value: pending ? formatMessageTime(pending.createdAt) : "On device",
        },
        primaryLabel: "VIEW OUTGOING MESSAGE",
        primaryTone: "warn",
        primaryAction: "view_conversation",
        secondary1: { label: "Retry now", href: `/messages/${conv.id}` },
        secondary2: { label: "Keep saved" },
        pillSub: "Offline · 1 pending",
        showComposer: true,
      };
    }

    case "driving":
      return {
        ...base,
        stage,
        toneClass: "warn",
        toneLabel: "Use only when safely stopped",
        stageLabel: "Driving safety mode",
        stageTitle: "Replies disabled",
        title: "Messages hidden while moving",
        copy: "Message previews and the composer are unavailable until the vehicle is safely stationary.",
        meta1: {
          label: "Current journey",
          value: input.conversation?.context.routeName ?? "Active duty",
        },
        meta2: {
          label: "Next stop",
          value: input.conversation?.context.tripStatus ?? "Next stop",
        },
        primaryLabel: "OPEN WHEN STOPPED",
        primaryTone: "warn",
        primaryAction: "open_when_stopped",
        secondary1: { label: "Call Operations", href: "/more/support" },
        secondary2: { label: "Safety guidance", href: "/more/support" },
        pillSub: "Driving mode",
        showComposer: false,
        contextChips: ["Journey active", "Safety mode", "Stationary only"],
      };

    case "safeguarding": {
      const conv = input.conversation!;
      return {
        ...base,
        stage,
        toneClass: "red",
        toneLabel: "Authorised channel only",
        stageLabel: "Secure message",
        stageTitle: "Safeguarding",
        title: "Safeguarding concern",
        copy: "This secure message is routed only to authorised safeguarding staff. For immediate danger, contact emergency services first.",
        meta1: { label: "Access", value: "Restricted" },
        meta2: { label: "Context", value: "Current duty" },
        primaryLabel: "START SECURE REPORT",
        primaryTone: "red",
        primaryAction: "start_safeguarding",
        secondary1: { label: "Call 999", action: "call_999" },
        secondary2: { label: "Safeguarding guidance", href: "/more/support" },
        pillSub: "Secure safeguarding",
        showComposer: false,
        contextChips: ["Protected", "Authorised staff", "Current duty"],
        bubbles: [
          {
            id: "sg1",
            direction: "in",
            sender: "Safeguarding",
            body: "Secure safeguarding messages are not shown in the general inbox preview.",
            meta: "Protected channel",
            urgent: true,
          },
          {
            id: "sg2",
            direction: "in",
            sender: "Safeguarding",
            body: "Evidence and passenger details remain protected.",
            meta: "Authorised staff only",
            urgent: true,
          },
        ],
      };
    }

    case "resolved": {
      const conv = input.conversation!;
      return {
        ...base,
        stage,
        toneClass: "ok",
        toneLabel: "Record retained",
        stageLabel: "Conversation",
        stageTitle: "Resolved",
        title: conv.subject,
        copy: "Operations closed this conversation. The record remains available.",
        meta1: { label: "Resolved", value: formatMessageTime(conv.updatedAt) },
        meta2: {
          label: "Reference",
          value: conv.context.tripReference ?? conv.senderLabel,
        },
        primaryLabel: "VIEW RESOLUTION",
        primaryTone: "ok",
        primaryAction: "view_resolution",
        secondary1: { label: "Archive" },
        secondary2: { label: "Open duty", href: "/trips" },
        pillSub: unread > 0 ? `${unread} unread` : "Resolved",
        showComposer: false,
      };
    }
  }
}

export function selectFocusedConversation(
  inbox: MessagesInboxPayload,
  preferredId?: string,
): ConversationSummary | undefined {
  return pickFocusConversation(inbox, preferredId);
}
