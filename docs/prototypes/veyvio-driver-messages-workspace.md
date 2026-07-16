# Veyvio Driver — Messages Workspace

Interactive HTML reference adopted as the Messages tab (`/messages`).

Source: `docs/prototypes/veyvio-driver-messages-workspace/`

Implementation:
- `MessagesWorkspaceScreen.tsx` — thread canvas + floating chrome + inbox overlay
- `messages-workspace-view.ts` — inbox / conversation / driving / offline → stage copy
- Reuses `useDutiesSheetDrag` for the adaptive bottom sheet

## Sheet = message action hub

| Stage | Meaning |
|-------|---------|
| Inbox | Unread / urgent overview |
| Ack | Operational update needs acknowledgement (read ≠ ack) |
| Thread | Normal conversation + composer |
| Urgent | Critical update — call Ops first |
| Offline | Outgoing message waiting to send |
| Driving | Previews and composer hidden |
| Safeguarding | Secure authorised channel |
| Resolved | Record retained |

Deep flows (`/messages/$id`, `/messages/new`, search) stay as destinations. Home FAB replaces bottom nav on `/messages` only.
