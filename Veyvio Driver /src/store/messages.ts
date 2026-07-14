import { create } from "zustand";
import type { ConversationDetail, MessageItem, MessagesInboxPayload } from "@/types/messages";
import {
  buildMockMessagesInbox,
  getConversationDetail,
} from "@/data/mocks/messages-inbox";
import { isOnline } from "@/platform/device/connectivity";

interface MessagesStore {
  inbox: MessagesInboxPayload;
  conversationDetails: Record<string, ConversationDetail>;

  hydrateInbox: (payload: MessagesInboxPayload) => void;
  getConversation: (id: string) => ConversationDetail | null;
  acknowledgeUrgent: () => void;
  acknowledgeConversation: (conversationId: string, messageId?: string) => void;
  markConversationRead: (conversationId: string) => void;
  markAllRead: () => void;
  sendMessage: (conversationId: string, body: string) => MessageItem;
  sendStructuredDelay: (input: {
    tripReference: string;
    delayMinutes: number;
    reason: string;
    officeActionRequired: boolean;
  }) => void;
}

function recalcUnread(inbox: MessagesInboxPayload): number {
  return inbox.conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}

export const useMessagesStore = create<MessagesStore>((set, get) => ({
  inbox: buildMockMessagesInbox(),
  conversationDetails: {},

  hydrateInbox: (payload) => set({ inbox: payload }),

  getConversation: (id) => {
    const cached = get().conversationDetails[id];
    if (cached) return cached;
    const detail = getConversationDetail(id);
    if (detail) {
      set((s) => ({ conversationDetails: { ...s.conversationDetails, [id]: detail } }));
    }
    return detail;
  },

  acknowledgeUrgent: () =>
    set((s) => {
      if (!s.inbox.urgent) return s;
      const urgent = { ...s.inbox.urgent, acknowledged: true };
      const conversations = s.inbox.conversations.map((c) =>
        c.id === urgent.conversationId ? { ...c, acknowledged: true, requiresAcknowledgement: false } : c,
      );
      return {
        inbox: { ...s.inbox, urgent: undefined, conversations, unreadTotal: recalcUnread({ ...s.inbox, conversations }) },
      };
    }),

  acknowledgeConversation: (conversationId, messageId) =>
    set((s) => {
      const detail = s.conversationDetails[conversationId] ?? getConversationDetail(conversationId);
      const updatedMessages = detail?.messages.map((m) =>
        messageId
          ? m.id === messageId
            ? { ...m, acknowledged: true }
            : m
          : m.requiresAcknowledgement
            ? { ...m, acknowledged: true }
            : m,
      );

      const conversations = s.inbox.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, acknowledged: true, requiresAcknowledgement: false, unreadCount: 0 }
          : c,
      );

      const urgent =
        s.inbox.urgent?.conversationId === conversationId
          ? undefined
          : s.inbox.urgent;

      return {
        inbox: {
          ...s.inbox,
          urgent,
          conversations,
          unreadTotal: recalcUnread({ ...s.inbox, conversations }),
        },
        conversationDetails: detail
          ? {
              ...s.conversationDetails,
              [conversationId]: {
                ...detail,
                acknowledged: true,
                requiresAcknowledgement: false,
                unreadCount: 0,
                messages: updatedMessages ?? detail.messages,
              },
            }
          : s.conversationDetails,
      };
    }),

  markConversationRead: (conversationId) =>
    set((s) => {
      const conversations = s.inbox.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      );
      return {
        inbox: {
          ...s.inbox,
          conversations,
          unreadTotal: recalcUnread({ ...s.inbox, conversations }),
        },
      };
    }),

  markAllRead: () =>
    set((s) => ({
      inbox: {
        ...s.inbox,
        urgent: s.inbox.urgent ? { ...s.inbox.urgent, acknowledged: true } : undefined,
        conversations: s.inbox.conversations.map((c) => ({ ...c, unreadCount: 0 })),
        unreadTotal: 0,
      },
    })),

  sendMessage: (conversationId, body) => {
    const msg: MessageItem = {
      id: `msg_${Date.now()}`,
      conversationId,
      messageType: "text",
      senderLabel: "You",
      senderTeam: "driver",
      body,
      createdAt: new Date().toISOString(),
      isOwn: true,
      deliveryStatus: isOnline() ? "sent" : "waiting",
    };

    set((s) => {
      const detail = s.conversationDetails[conversationId] ?? getConversationDetail(conversationId);
      if (!detail) return s;
      return {
        conversationDetails: {
          ...s.conversationDetails,
          [conversationId]: {
            ...detail,
            messages: [...detail.messages, msg],
            preview: body,
            updatedAt: msg.createdAt,
          },
        },
        inbox: {
          ...s.inbox,
          conversations: s.inbox.conversations.map((c) =>
            c.id === conversationId ? { ...c, preview: body, updatedAt: msg.createdAt } : c,
          ),
        },
      };
    });

    return msg;
  },

  sendStructuredDelay: (input) => {
    const conversationId = "conv_dispatch_142";
    const body = `Running late — ${input.delayMinutes} min · ${input.reason}${input.officeActionRequired ? " · Office action required" : ""}`;
    get().sendMessage(conversationId, body);
  },
}));

export function useUnreadMessageCount(): number {
  return useMessagesStore((s) => s.inbox.unreadTotal);
}
