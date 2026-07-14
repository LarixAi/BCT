import type {
  ConversationDetail,
  ConversationSummary,
  MessagesInboxPayload,
  NewMessageOption,
} from "@/types/messages";

const now = Date.now();

function minutesAgo(m: number): string {
  return new Date(now - m * 60_000).toISOString();
}

function yesterday(): string {
  return new Date(now - 86_400_000).toISOString();
}

export function buildMockMessagesInbox(): MessagesInboxPayload {
  return {
    unreadTotal: 3,
    urgent: {
      id: "urgent_1",
      conversationId: "conv_dispatch_142",
      title: "Route 142 departure changed",
      body: "The departure time has moved from 14:30 to 14:15.",
      detailLines: ["Acknowledge before starting the route."],
      actionLabel: "View and acknowledge",
      priority: "urgent",
      requiresAcknowledgement: true,
      acknowledged: false,
      category: "schedule_change",
    },
    conversations: [
      {
        id: "conv_dispatch_142",
        type: "trip",
        senderTeam: "dispatch",
        senderLabel: "Dispatch",
        title: "Dispatch",
        subject: "Route 142 · Trip TRP-10482",
        preview: "Pickup moved to the side entrance. Please confirm when received.",
        priority: "important",
        category: "trip_instruction",
        unreadCount: 2,
        updatedAt: minutesAgo(2),
        context: {
          tripReference: "TRP-10482",
          tripId: "asgn_transfer",
          routeName: "Route 142",
          vehicleRegistration: "LK23 ABC",
          tripStatus: "Active",
        },
        requiresAcknowledgement: true,
        acknowledged: false,
      },
      {
        id: "conv_yard_lk23",
        type: "vehicle",
        senderTeam: "yard",
        senderLabel: "Yard Team",
        title: "Yard Team",
        subject: "Vehicle LK23 ABC",
        preview: "A replacement vehicle has been assigned for your afternoon run.",
        priority: "important",
        category: "vehicle_assignment",
        unreadCount: 0,
        updatedAt: minutesAgo(18),
        context: {
          vehicleRegistration: "LK23 ABC",
          vehicleId: "veh_lk23",
        },
      },
      {
        id: "conv_maint_lk23",
        type: "defect",
        senderTeam: "maintenance",
        senderLabel: "Maintenance",
        title: "Maintenance",
        subject: "Defect report reviewed",
        preview: "Vehicle remains VOR. Do not drive.",
        priority: "urgent",
        category: "vehicle_defect",
        unreadCount: 0,
        updatedAt: new Date().setHours(10, 42, 0, 0).toString(),
        context: {
          vehicleRegistration: "LK23 ABC",
          defectId: "def_1",
        },
      },
      {
        id: "conv_company_safeguard",
        type: "announcement",
        senderTeam: "company",
        senderLabel: "Company update",
        title: "Company update",
        subject: "New safeguarding reminder",
        preview: "Please review the updated safeguarding guidance for passenger transport.",
        priority: "normal",
        category: "announcement",
        unreadCount: 1,
        updatedAt: yesterday(),
        isAnnouncement: true,
      },
      {
        id: "conv_dispatch_general",
        type: "direct",
        senderTeam: "dispatch",
        senderLabel: "Dispatch",
        title: "Dispatch",
        subject: "General operations",
        preview: "Thank you — noted for this afternoon.",
        priority: "normal",
        category: "general_operations",
        unreadCount: 0,
        updatedAt: minutesAgo(120),
      },
    ],
  };
}

export function getConversationDetail(conversationId: string): ConversationDetail | null {
  const inbox = buildMockMessagesInbox();
  const summary = inbox.conversations.find((c) => c.id === conversationId);
  if (!summary) return null;

  if (conversationId === "conv_dispatch_142") {
    return {
      ...summary,
      status: "open",
      allowReply: true,
      context: summary.context ?? {},
      messages: [
        {
          id: "m1",
          conversationId,
          messageType: "system_event",
          senderLabel: "System",
          senderTeam: "system",
          body: "14:02 — Pickup location updated by Dispatch",
          createdAt: minutesAgo(8),
        },
        {
          id: "m2",
          conversationId,
          messageType: "instruction",
          senderLabel: "Dispatch",
          senderTeam: "dispatch",
          body: "The pickup entrance has changed. Please use the side gate.",
          createdAt: minutesAgo(7),
          requiresAcknowledgement: true,
        },
        {
          id: "m3",
          conversationId,
          messageType: "text",
          senderLabel: "You",
          senderTeam: "driver",
          body: "Understood.",
          createdAt: minutesAgo(5),
          isOwn: true,
          deliveryStatus: "delivered",
        },
        {
          id: "m4",
          conversationId,
          messageType: "text",
          senderLabel: "Dispatch",
          senderTeam: "dispatch",
          body: "Thank you. Please arrive by 14:20.",
          createdAt: minutesAgo(4),
        },
        {
          id: "m5",
          conversationId,
          messageType: "instruction",
          senderLabel: "Dispatch",
          senderTeam: "dispatch",
          body: "Departure time changed from 14:30 to 14:15.",
          createdAt: minutesAgo(2),
          requiresAcknowledgement: true,
          structuredFields: [
            { label: "Previous", value: "14:30" },
            { label: "New", value: "14:15" },
          ],
        },
      ],
    };
  }

  if (conversationId === "conv_yard_lk23") {
    return {
      ...summary,
      status: "open",
      allowReply: true,
      context: summary.context ?? {},
      messages: [
        {
          id: "m1",
          conversationId,
          messageType: "structured_update",
          senderLabel: "Yard Team",
          senderTeam: "yard",
          body: "A replacement vehicle has been assigned for your afternoon run.",
          createdAt: minutesAgo(18),
          structuredFields: [
            { label: "New vehicle", value: "VN71 XYZ" },
            { label: "Fleet", value: "061" },
          ],
        },
      ],
    };
  }

  if (conversationId === "conv_maint_lk23") {
    return {
      ...summary,
      status: "open",
      allowReply: false,
      context: summary.context ?? {},
      messages: [
        {
          id: "m1",
          conversationId,
          messageType: "structured_update",
          senderLabel: "Maintenance",
          senderTeam: "maintenance",
          body: "Your defect report for LK23 ABC has been reviewed.",
          createdAt: new Date().setHours(10, 42, 0, 0).toString(),
          structuredFields: [
            { label: "Status", value: "Vehicle remains VOR" },
            { label: "Decision", value: "Do not drive" },
            { label: "Replacement", value: "Pending" },
          ],
        },
      ],
    };
  }

  return {
    ...summary,
    status: "open",
    allowReply: !summary.isAnnouncement,
    context: summary.context ?? {},
    messages: [
      {
        id: "m1",
        conversationId,
        messageType: "text",
        senderLabel: summary.senderLabel,
        senderTeam: summary.senderTeam,
        body: summary.preview,
        createdAt: summary.updatedAt,
      },
    ],
  };
}

export const NEW_MESSAGE_OPTIONS: NewMessageOption[] = [
  { id: "trip_issue", label: "Trip or passenger issue", description: "Report a problem with today's work", team: "dispatch", priority: "important", category: "passenger_issue" },
  { id: "vehicle_issue", label: "Vehicle or defect issue", description: "Report a vehicle problem", team: "yard", priority: "important", category: "vehicle_defect" },
  { id: "running_late", label: "Running late", description: "Send a structured delay update", team: "dispatch", priority: "important", category: "delay" },
  { id: "contact_dispatch", label: "Contact dispatch", description: "General operational question", team: "dispatch", priority: "normal", category: "general_operations" },
  { id: "contact_yard", label: "Contact yard", description: "Vehicle, fuel or depot matter", team: "yard", priority: "normal", category: "general_operations" },
  { id: "contact_maintenance", label: "Contact maintenance", description: "Defect or repair update", team: "maintenance", priority: "normal", category: "vehicle_defect" },
  { id: "safeguarding", label: "Safety or safeguarding concern", description: "Protected operational flow", team: "compliance", priority: "critical", category: "safeguarding" },
  { id: "other", label: "Other operational issue", description: "Anything else affecting your duty", team: "dispatch", priority: "normal", category: "general_operations" },
];

export function buildEmptyInbox(): MessagesInboxPayload {
  return { unreadTotal: 0, conversations: [] };
}

export function filterConversations(
  conversations: ConversationSummary[],
  filter: import("@/types/messages").MessageFilter,
): ConversationSummary[] {
  switch (filter) {
    case "trips":
      return conversations.filter((c) => c.type === "trip" || c.category === "trip_instruction" || c.category === "schedule_change");
    case "operations":
      return conversations.filter(
        (c) =>
          c.senderTeam === "dispatch" ||
          c.senderTeam === "yard" ||
          c.senderTeam === "maintenance" ||
          c.senderTeam === "compliance" ||
          c.type === "vehicle" ||
          c.type === "defect",
      );
    case "updates":
      return conversations.filter((c) => c.isAnnouncement || c.type === "announcement");
    default:
      return conversations;
  }
}
