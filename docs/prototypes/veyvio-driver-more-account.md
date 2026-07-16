# Veyvio Driver — More & Account

Uber-inspired two-screen hierarchy for the More tab.

## More hub (`/more`)

- Large **More** title + Help
- Profile row → **Account**
- Quick actions: Documents · Sync · Support
- Short menus: Driver · App · Help
- Shared bottom navigation
- No settings dashboard of long rows

## Account page (`/more/account`)

- Black focused header with Back
- Driver identity
- Company and depot, licences, training, declarations
- Security and privacy
- **No** bottom navigation

## App settings (`/more/settings`)

- Notifications, accessibility, driving mode, about
- Focused sheet chrome via `MoreSubpageLayout`

## Implementation

- `MoreHub.tsx` + `buildMoreHubView`
- `AccountPage.tsx` + `buildAccountPageView`
- Existing `/more/*` detail routes remain destinations

Standalone HTML: `docs/prototypes/veyvio-driver-more-account/index.html`
