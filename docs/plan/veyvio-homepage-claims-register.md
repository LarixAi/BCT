# Veyvio homepage — claims substantiation register

**Authority:** Homepage blueprint Part E (`docs/blueprint/veyvio-homepage-blueprint-v2.md`)  
**Source of truth in code:** `veyvio-website/src/lib/claims-register.ts`  
**Review:** Required at every content publish (blueprint §16.5, state 2)

Only rows with `approvedForPublic: true` may appear on the live site. Rows with `approvedForPublic: false` are explicit stop-ship items.

| ID | Claim | Classification | Approved | Owner |
|----|-------|----------------|----------|-------|
| positioning-headline | One connected platform for safer, clearer transport operations | Available | Yes | Product Marketing |
| app-command | Veyvio Command operational control centre | Pilot | Yes | Product |
| app-driver | Veyvio Driver duties, checks, handback | Pilot | Yes | Product |
| app-yard | Veyvio Yard location, condition, readiness | Pilot | Yes | Product |
| app-maintenance | Veyvio Maintenance defects to RTS | In development | Yes | Product |
| app-portal | Customer Portal | Planned | Yes | Product |
| vehicle-readiness | Readiness outputs (Ready / Warning / Restricted / Not ready / Unknown) | Pilot | Yes | Engineering |
| tenant-isolation | Each company's information properly separated | Available | Yes | Security |
| offline-operations | Offline queuing with visible sync state | Pilot | Yes | Engineering |
| compliance-guarantee | **MUST NOT PUBLISH** — legal compliance guarantee | Exploratory | **No** | Legal |
| app-store-badges | App Store / Play badges | Planned | **No** | Engineering |
| customer-logos | Customer logos or testimonials | Exploratory | **No** | Marketing |

## Open decisions still blocking full publication

See `veyvio-website/src/lib/open-decisions.ts` and blueprint §21:

1. **Legal company identity** — provisional `Veyvio Ltd` until Legal confirms
2. **CRM / email / calendar** — stub mode in dev; set `HUBSPOT_ACCESS_TOKEN`, `RESEND_API_KEY`, `VITE_CALENDAR_BOOKING_URL` for production
3. **Contact details** — provisional `hello@veyvio.com` / `support@veyvio.com`
4. **Data hosting region** — confirm before local-authority procurement conversations
