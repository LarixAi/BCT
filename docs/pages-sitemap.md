# Veyvio pages sitemap

Machine-readable index of **active** UI routes so humans and assistants can find screens quickly.

| App | Folder | Router source of truth |
| --- | --- | --- |
| **Command (Admin)** | `Veyvio admin /` | `Veyvio admin /src/App.tsx` |
| **Yard** | repo root (`src/`) | `src/routes/*` (TanStack file routes) |
| **Driver** | `veyvio-driver-App/` | `veyvio-driver-App/src/pages/driver/DriverApp.jsx` (+ auth / onboarding routers) |

Not listed: retired TanStack tree `Veyvio Driver /` (removed from product path).

`:id`, `:dutyId`, etc. are dynamic segments.

---

## 1. Command (Admin)

### Auth & system

| Path | Notes |
| --- | --- |
| `/login` | Sign in |
| `/signup` | Sign up |
| `/verify-email` | Email verify |
| `/forgot-password` | Forgot password |
| `/reset-password` | Reset password |
| `/accept-invitation` | Accept invite |
| `/select-company` | Company picker |
| `/access-denied` | Access denied |
| `/session-expired` | Session expired |
| `/company-unavailable` | Company unavailable |
| `/company-verification` | Company verification |
| `/setup/contracts` | Accept contracts |
| `/setup/company` | Company setup |
| `/setup/security` | MFA setup |
| `/not-found` | 404 |

### Control centre & ops

| Path | Notes |
| --- | --- |
| `/` | Overview / control centre |
| `/live-operations` | Live operations |
| `/live-operations/trips/:id` | Operational trip (live) |
| `/ops-trips/:id` | Operational trip (alias) |
| `/exceptions` | Exceptions inbox |
| `/notifications` | Notifications |
| `/dispatch` | Dispatch |
| `/runs` | Runs list |
| `/runs/:id` | Run detail |
| `/trips` | Trips list |
| `/trips/:id` | Trip detail |
| `/schedule` | Schedule |
| `/duties` | Duties |
| `/duties/:dutyId` | Duty detail |
| `/availability` | Availability |
| `/cancellations` | Cancellations |
| `/handover` | Handover |
| `/recurring-transport` | Recurring transport |

### Bookings

| Path | Notes |
| --- | --- |
| `/bookings` | Bookings list |
| `/bookings/new` | Create booking |
| `/bookings/new/urgent` | Urgent booking |
| `/bookings/:id` | Booking detail |
| `/bookings/:id/edit` | Edit booking |

### People

| Path | Notes |
| --- | --- |
| `/drivers` | Drivers list |
| `/drivers/new` | Driver onboarding wizard |
| `/drivers/:id` | Driver detail |
| `/drivers/:id/account` | Driver account |
| `/drivers/:id/edit` | Edit driver |
| `/drivers/:id/onboarding` | Driver onboarding (continue) |
| `/staff` | Staff list |
| `/staff/new` | New staff |
| `/staff/:id` | Staff detail |
| `/staff/:id/edit` | Edit staff |
| `/attendance` | Attendance |
| `/time-off` | Time off |

### Fleet & yards

| Path | Notes |
| --- | --- |
| `/vehicles` | Vehicles list |
| `/vehicles/new` | Vehicle onboarding |
| `/vehicles/vor` | VOR board |
| `/vehicles/compliance` | Fleet compliance |
| `/vehicles/intelligence` | Fleet intelligence |
| `/vehicles/:id` | Vehicle detail |
| `/vehicles/:id/edit` | Edit vehicle |
| `/vehicles/:id/onboarding` | Vehicle onboarding (continue) |
| `/depots` | Depots list |
| `/depots/new` | Depot onboarding |
| `/depots/:id` | Depot detail |
| `/depots/:id/onboarding` | Depot onboarding (continue) |
| `/yard` | Yard operations (admin view) |
| `/maintenance` | Maintenance hub |
| `/maintenance/work-orders` | Work orders (redirect) |
| `/maintenance/work-orders/:workOrderId` | Work order (redirect) |
| `/fleet-resources` | Fleet resources |
| `/vehicle-checks` | Vehicle checks |
| `/vehicle-checks/:checkId` | Check detail |
| `/vehicle-reports` | Vehicle reports |
| `/vehicle-reports/:id` | Report detail |
| `/defects` | Defects |
| `/defects/:id` | Defect detail |
| `/inspections` | Inspections |
| `/inspections/:inspectionId` | Inspection detail |

### Safety & compliance

| Path | Notes |
| --- | --- |
| `/incidents` | Incidents |
| `/incidents/settings` | Incident settings |
| `/incidents/:id` | Incident detail |
| `/compliance` | Compliance dashboard |
| `/compliance/expiries` | Expiries |
| `/compliance-rules` | Compliance rules |
| `/safeguarding` | Safeguarding |
| `/risk-assessments` | Risk assessments |
| `/corrective-actions` | Corrective actions |

### Customers & commercial

| Path | Notes |
| --- | --- |
| `/customers` | Customers |
| `/customers/:customerId` | Customer detail |
| `/passengers` | Passengers |
| `/passengers/:passengerId` | Passenger detail |
| `/schools` | Schools |
| `/schools/:schoolId` | School detail |
| `/contracts` | Contracts |
| `/contracts/:contractId` | Contract detail |
| `/pricing` | Pricing |

### Comms & reporting

| Path | Notes |
| --- | --- |
| `/messages` | Messages |
| `/messages/:conversationId` | Conversation |
| `/communication/delivery` | Delivery status |
| `/announcements` | Announcements |
| `/templates` | Templates |
| `/reports` | Reports hub |
| `/reports/daily-operations` | Daily operations report |
| `/reports/:reportId` | Standard report |
| `/performance` | Performance |
| `/audit` | Audit log |

### Settings & misc

| Path | Notes |
| --- | --- |
| `/settings/company` | Company settings |
| `/settings/users` | Users |
| `/settings/roles` | Roles |
| `/settings/invitations` | Invitations |
| `/settings/security` | Security |
| `/settings/notifications` | Notification settings |
| `/settings/integrations` | Integrations |
| `/search` | Global search |
| `/profile` | Profile |
| `/imports` | Imports |
| `/exports` | Exports |

---

## 2. Veyvio Yard

File-based routes under `src/routes/`. Layouts `_public` / `_app` are shells, not destinations.

### Public / startup

| Path | File |
| --- | --- |
| `/splash` | `_public.splash.tsx` |
| `/welcome/:step` | `_public.welcome.$step.tsx` |
| `/sign-in` | `_public.sign-in.tsx` |
| `/mfa` | `_public.mfa.tsx` |
| `/company-select` | `_public.company-select.tsx` |
| `/depot-select` | `_public.depot-select.tsx` |
| `/initial-sync` | `_public.initial-sync.tsx` |
| `/biometric-unlock` | `_public.biometric-unlock.tsx` |
| `/account-restricted` | `_public.account-restricted.tsx` |
| `/update-required` | `_public.update-required.tsx` |

### Home & yard board

| Path | File |
| --- | --- |
| `/` | `_app.index.tsx` |
| `/yard` | `_app.yard.index.tsx` |
| `/yard/map` | `_app.yard.map.tsx` |
| `/yard/:vehicleId` | `_app.yard.$vehicleId.index.tsx` |
| `/yard/:vehicleId/check` | `_app.yard.$vehicleId.check.tsx` |
| `/yard/:vehicleId/condition` | `_app.yard.$vehicleId.condition.tsx` |
| `/yard/:vehicleId/condition/compare` | `_app.yard.$vehicleId.condition.compare.tsx` |
| `/yard/:vehicleId/condition/inspect` | `_app.yard.$vehicleId.condition.inspect.tsx` |
| `/yard/:vehicleId/condition/damage/:damageId` | `_app.yard.$vehicleId.condition.damage.$damageId.tsx` |
| `/yard/:vehicleId/equipment` | `_app.yard.$vehicleId.equipment.tsx` |
| `/yard/:vehicleId/adblue/refill` | `_app.yard.$vehicleId.adblue.refill.tsx` |

### Operations

| Path | File |
| --- | --- |
| `/tasks` | `_app.tasks.index.tsx` |
| `/tasks/:taskId` | `_app.tasks.$taskId.tsx` |
| `/checks` | `_app.checks.index.tsx` |
| `/checks/:checkId` | `_app.checks.$checkId.tsx` |
| `/defects` | `_app.defects.index.tsx` |
| `/defects/:defectId` | `_app.defects.$defectId.tsx` |
| `/vor` | `_app.vor.index.tsx` |
| `/vor/:caseId` | `_app.vor.$caseId.tsx` |
| `/arrivals` | `_app.arrivals.tsx` |
| `/departure-line` | `_app.departure-line.tsx` |
| `/movements` | `_app.movements.tsx` |
| `/scan` | `_app.scan.tsx` |
| `/shift` | `_app.shift.tsx` |
| `/inspections` | `_app.inspections.index.tsx` |
| `/inspections/analytics` | `_app.inspections.analytics.tsx` |
| `/inspections/damage-review` | `_app.inspections.damage-review.tsx` |
| `/inspections/repair-verification` | `_app.inspections.repair-verification.tsx` |
| `/simulate/driver-report` | `_app.simulate.driver-report.tsx` |

### More

| Path | File |
| --- | --- |
| `/more` | `_app.more.index.tsx` |
| `/more/about` | `_app.more.about.tsx` |
| `/more/account` | `_app.more.account.tsx` |
| `/more/bodywork` | `_app.more.bodywork.tsx` |
| `/more/messages` | `_app.more.messages.tsx` |
| `/more/settings` | `_app.more.settings.tsx` |
| `/more/sync` | `_app.more.sync.tsx` |
| `/more/vehicle-checks` | `_app.more.vehicle-checks.tsx` |

---

## 3. Driver (`veyvio-driver-App`)

Capacitor phone app — **use this**, not `Veyvio Driver /`.

### Auth

| Path | Notes |
| --- | --- |
| `/auth` (or app auth entry) | Sign in — see `DriverAuthRoutes.jsx` / `DRIVER_AUTH_PATH` |
| `/auth/verify-phone` | Phone verify |
| `/auth/sign-up` | Sign up |
| `/auth/check-email` | Check email |
| `/auth/forgot-password` | Forgot password |
| `/auth/reset-password` | Reset password |
| `/auth/verify` | Auth verify |

### Onboarding

| Path | Notes |
| --- | --- |
| `/onboarding` | Onboarding home |
| `/onboarding/profile` | Profile details |
| `/onboarding/address-emergency` | Address / emergency |
| `/onboarding/licence` | Licence |
| `/onboarding/dvla` | DVLA check |
| `/onboarding/dqc` | DQC / CPC |
| `/onboarding/tachograph` | Tachograph card |
| `/onboarding/dbs` | DBS / safeguarding |
| `/onboarding/right-to-work` | Right to work |
| `/onboarding/medical` | Medical declaration |
| `/onboarding/handbook` | Policy acknowledgement |
| `/onboarding/training` | Training checklist |
| `/onboarding/defect-policy` | Defect policy |
| `/onboarding/review` | Submit review |

### Operational (main shell)

| Path | Notes |
| --- | --- |
| `/` | Home |
| `/duty` | My duty |
| `/check` | Walkaround flow |
| `/check/vehicles` | Change vehicle |
| `/check/history` | Check history |
| `/check/history/:checkId` | Check detail |
| `/jobs` | Jobs / trips hub |
| `/trips` | → redirects to `/jobs` |
| `/trips/:id` | → redirects to `/jobs` |
| `/duty/:dutyId/navigate` | Duty navigation |
| `/offers/:offerId` | Incoming offer |
| `/job/:id` | Job view |
| `/job/:jobId/closeout` | Duty closeout |
| `/defects` | Defect report |
| `/incidents/new` | Report incident |
| `/lost-property` | Found items |
| `/lost-property/report` | Report found item |
| `/documents` | Documents |
| `/notifications` | Notifications / messages |
| `/messages` | Messages (alias) |
| `/contact` | Contact admin |
| `/threads` | Message threads |
| `/threads/:threadId` | Thread detail |
| `/acknowledgements` | Acknowledgements |
| `/working-time` | Working time |
| `/time-off` | Time off request |
| `/more` | More menu |
| `/profile` | → `/more` |
| `/profile/details` | Profile details |
| `/profile/licence` | Licence compliance |
| `/profile/settings` | Settings |
| `/settings` | → `/profile/settings` |
| `/readiness` | Readiness |
| `/vehicle` | Vehicle hub |
| `/vehicle/equipment` | Equipment |
| `/vehicle/documents` | Vehicle documents |
| `/vehicle/handback` | Handback |
| `/vehicle/checks` | Completed checks |
| `/schedule` | Schedule |
| `/training` | Training centre |
| `/sync` | Sync centre |
| `/safety` | Safety hub |
| `/policies` | Policy re-ack |
| `/help` | Help / support |
| `/complete-dbs` | Complete DBS |

---

## How to refresh this list

```bash
# Admin paths
rg -n 'path="' "Veyvio admin /src/App.tsx"

# Yard route files
ls src/routes/_*.tsx

# Driver operational paths
rg -n 'path="' veyvio-driver-App/src/pages/driver/DriverApp.jsx
rg -n 'path="' veyvio-driver-App/src/pages/driver/DriverAuthRoutes.jsx
rg -n 'path="' veyvio-driver-App/src/pages/driver/onboarding/DriverOnboardingRouter.jsx
```

When adding a page, update the router **and** this file so assistants keep an accurate map.
