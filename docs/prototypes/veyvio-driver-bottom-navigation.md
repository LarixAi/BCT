# Veyvio Driver — Bottom Navigation

Redesigned five-tab hub navigation and route visibility policy.

## Navigation policy

Show the five-tab navigation only on:

| Path | Tab |
|------|-----|
| `/` | Home |
| `/trips` (and future `/duties` root) | Duties |
| `/checks` | Checks |
| `/messages` | Messages |
| `/more` | More |

Hide it on focused or nested workflows:

- Duty detail, journey, passenger and navigation screens
- Vehicle verification, walkaround, defect, review and result screens
- Message conversations, search and new-message forms
- More/settings detail screens
- Assignment detail and history screens
- Incident workflows
- Authentication and onboarding

## Implementation

- `src/domain/driver/navigation-policy.ts` — visibility + active tab
- `src/domain/driver/navigation-items.ts` — central tab definitions
- `src/domain/driver/navigation-policy.test.ts` — policy tests
- `src/components/driver/shells/BottomNav.tsx` — light bar + unread badge
- `AppShell` uses `shouldShowDriverBottomNav` and reserves offset for Duties/Checks/Messages hubs

## Visual

Light blurred bar over white; active tab uses Driver Blue label + soft blue icon well. Not Midnight.
