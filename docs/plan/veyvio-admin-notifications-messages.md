# Notifications vs Messages

## Separation

| Page | Answers | Created by | Typical action |
|------|---------|------------|----------------|
| **Notifications** | What has happened, and what needs my attention? | System / workflow | Review, acknowledge, assign, open record |
| **Messages** | Who is contacting us, and who needs to respond? | Person / team | Read, reply, resolve conversation |
| **Exceptions** | Which operational problems need controlled resolution? | System / admin | Own, investigate, close |

## Notifications (`/notifications`)

- Personalised operational alert centre under **Command**
- Summary cards: Unread · Action required · Critical · Assigned to me
- Tabs: All · Unread · Action required · Mentions · System
- Grouped feed + detail drawer
- Opens related records; reading ≠ resolving the underlying issue
- Can link into Messages or escalate into Exceptions

## Messages (`/messages`)

- Communication centre under **Communication**
- Three columns: inbox · thread + composer · context panel
- Tabs: All · Unread · Awaiting reply · Assigned to me · Groups · Archived
- Supports reply, internal notes, new message compose (`?compose=1&to=&run=`)
- Does **not** host system alert workflows

## Top bar

- Bell → notification preview → View all notifications
- Keep message unread counts separate (do not merge badges)
