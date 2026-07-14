export type ConversationType =
  | "direct"
  | "trip"
  | "vehicle"
  | "defect"
  | "incident"
  | "announcement"
  | "safeguarding";

export type MessagePriority = "normal" | "important" | "urgent" | "critical";

export type MessageCategory =
  | "general_operations"
  | "trip_instruction"
  | "schedule_change"
  | "passenger_issue"
  | "delay"
  | "vehicle_assignment"
  | "vehicle_defect"
  | "safety"
  | "safeguarding"
  | "compliance"
  | "announcement"
  | "system";

export type MessageFilter = "all" | "trips" | "operations" | "updates";

export type MessageType = "text" | "structured_update" | "system_event" | "instruction";

export type MessageDeliveryStatus =
  | "sending"
  | "waiting"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type SenderTeam =
  | "dispatch"
  | "yard"
  | "maintenance"
  | "compliance"
  | "company"
  | "driver"
  | "system";

export interface ConversationContext {
  tripReference?: string;
  tripId?: string;
  routeName?: string;
  vehicleRegistration?: string;
  vehicleId?: string;
  defectId?: string;
  tripStatus?: string;
}

export interface ConversationSummary {
  id: string;
  type: ConversationType;
  senderTeam: SenderTeam;
  senderLabel: string;
  title: string;
  subject: string;
  preview: string;
  priority: MessagePriority;
  category: MessageCategory;
  unreadCount: number;
  updatedAt: string;
  isAnnouncement?: boolean;
  context?: ConversationContext;
  requiresAcknowledgement?: boolean;
  acknowledged?: boolean;
}

export interface UrgentMessage {
  id: string;
  conversationId: string;
  title: string;
  body: string;
  detailLines?: string[];
  actionLabel: string;
  priority: "urgent" | "critical";
  requiresAcknowledgement: boolean;
  acknowledged: boolean;
  category: MessageCategory;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  messageType: MessageType;
  senderLabel: string;
  senderTeam: SenderTeam;
  body: string;
  createdAt: string;
  isOwn?: boolean;
  requiresAcknowledgement?: boolean;
  acknowledged?: boolean;
  deliveryStatus?: MessageDeliveryStatus;
  structuredFields?: { label: string; value: string }[];
}

export interface ConversationDetail extends ConversationSummary {
  messages: MessageItem[];
  context: ConversationContext;
  status: "open" | "resolved" | "archived";
  allowReply: boolean;
}

export interface MessagesInboxPayload {
  unreadTotal: number;
  urgent?: UrgentMessage;
  conversations: ConversationSummary[];
}

export interface NewMessageOption {
  id: string;
  label: string;
  description: string;
  team: SenderTeam;
  priority: MessagePriority;
  category: MessageCategory;
}
