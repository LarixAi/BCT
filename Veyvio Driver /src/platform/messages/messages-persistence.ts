import type { ConversationDetail, MessagesInboxPayload } from "@/types/messages";

const STORAGE_KEY = "veyvio.driver.messages.v1";

export interface PersistedMessages {
  inbox: MessagesInboxPayload;
  conversationDetails: Record<string, ConversationDetail>;
  updatedAt: string;
}

export function loadPersistedMessages(): PersistedMessages | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedMessages;
  } catch {
    return null;
  }
}

export function persistMessages(state: {
  inbox: MessagesInboxPayload;
  conversationDetails: Record<string, ConversationDetail>;
}): void {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedMessages = {
      inbox: state.inbox,
      conversationDetails: state.conversationDetails,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode — ignore */
  }
}
