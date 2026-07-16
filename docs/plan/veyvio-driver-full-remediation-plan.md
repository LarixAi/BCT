# Veyvio Driver — Full Remediation and Production Readiness Plan

**Status:** Proposed technical-track source of truth  
**Created:** 16 July 2026  
**Scope:** Veyvio Driver application, shared operational domain, Driver-facing backend contracts, Command/Yard integration points, mobile runtime, offline behaviour, security, testing and release readiness  
**Audience:** Product, engineering, architecture, operations, safety/compliance, QA and delivery leadership  
**Primary repository:** `LarixAi/BCT`  
**Primary workspace:** `Veyvio Driver /`

---

## 1. Executive decision

Veyvio Driver has progressed beyond a visual prototype. It now has a credible transport-operational model, a strong five-tab information architecture and materially safer lifecycle handling for duties, journeys, stops, passenger tasks, vehicle checks and handback.

The next phase must not be another broad visual redesign. The next phase is a production data, integration and assurance programme.

The application must be classified as:

> **Operationally strong prototype — suitable for controlled demonstrations and engineering validation, but not yet suitable for live passenger transport.**

The principal reason is not the visible workflow. The visible workflow is now one of the strongest areas. The remaining risks sit underneath it:

- mock-generated bootstrap data;
- mock transport fallback inside general sync paths;
- local acceptance of operational actions when tenancy or session context is missing;
- false `synced` status for local-only mutations;
- plaintext persistence of potentially sensitive messages;
- incomplete authoritative backend projections;
- incomplete server-side lifecycle enforcement;
- unverified incident and safeguarding delivery;
- incomplete media durability;
- no confirmed live Operations event path;
- no verified CI status on the latest Driver commit;
- insufficient physical-device and process-death testing.

These are production stop-ship issues because they can create a false belief that a safety-critical action has been received, accepted or acted upon when it has only changed local application state.

---

## 2. Product and engineering principles

All remediation work must follow these principles.

### 2.1 Safety before convenience

A Driver action that affects passenger safety, vehicle roadworthiness, duty legality, custody, safeguarding or operational control must fail closed when the system cannot prove that the action is valid.

The application must never silently convert uncertainty into success.

Examples:

- missing session must not become a local clock-in;
- missing tenancy must not become a locally accepted vehicle check;
- an outbox write must not display as server accepted;
- an unresolved passenger exception must not advance the route;
- an unverified replacement vehicle must not be released into service;
- a locally completed duty must not be treated as complete until the server accepts it.

### 2.2 One authoritative operational truth

The server projection is authoritative.

The client may maintain:

1. a durable downloaded projection;
2. an optimistic local overlay;
3. a durable outbox of pending commands;
4. UI-focused derived state.

The client must not maintain several competing operational truths such as:

- mutable mock map;
- Zustand duty projection;
- route-local state;
- localStorage state;
- outbox state;
- independently reconstructed summaries.

### 2.3 Explicit state machines

Safety-critical workflows must use explicit state transitions and reject invalid transitions.

Required state machines include:

- duty lifecycle;
- journey lifecycle;
- stop lifecycle;
- passenger task lifecycle;
- vehicle custody;
- vehicle check submission;
- incident delivery;
- vehicle replacement;
- message delivery and acknowledgement;
- media upload;
- offline command delivery.

### 2.4 Driver-facing language must match the Driver mental model

Canonical hierarchy:

```text
Duty
  → Journey
    → Route
      → Stop
        → Passenger task
```

Internal IDs and backend terms may remain where they are meaningful, but they must not become primary Driver-facing wording.

### 2.5 Multi-company and multi-depot by default

Every read, write, cache record, media record, push token, event subscription and audit entry must be scoped to the authenticated operator, driver and permitted depot context.

### 2.6 Offline capable, not offline optimistic at any cost

Offline support must preserve work safely. It must not pretend the server accepted work that remains local.

### 2.7 Product honesty

Every visible button must do one of the following:

- perform a real available action;
- open a real destination;
- be disabled with an operational reason;
- be hidden because it is not applicable.

No live-looking dead controls are permitted.

### 2.8 Production must fail closed

Mock mode, demo controls and local-only fallbacks must be impossible in a production build.

---

## 3. Target architecture

### 3.1 Layer model

```text
Presentation
  Routes, screens, components, workspace shells, accessibility

Application
  Use cases, controllers, workflow orchestration, command preparation

Domain
  State machines, policies, invariants, selectors, decision models

Platform
  Auth, tenancy, API, storage, media, GPS, notifications, device runtime

Infrastructure
  HTTP/WebSocket transport, encrypted local database, native plugins

Shared operational contracts
  @veyvio/ops, events, commands, IDs, state vocabularies
```

### 3.2 Read model

```text
Authoritative server projection
          ↓
Encrypted local projection database
          ↓
Projection repository
          ↓
Query/cache selector layer
          ↓
React UI
```

### 3.3 Write model

```text
Driver action
   ↓
Domain validation
   ↓
Create idempotent command envelope
   ↓
Durable outbox write
   ↓
Optimistic overlay where policy allows
   ↓
HTTP command transport
   ↓
Server validation and transition
   ↓
Accepted/rejected event response
   ↓
Projection refresh/event application
```

### 3.4 Realtime model

```text
Command / Yard / Backend event
             ↓
Authenticated Driver event stream
             ↓
Persist event cursor
             ↓
Apply to local projection
             ↓
Surface operational update
```

Required event families:

- `duty.updated`;
- `duty.cancelled`;
- `journey.updated`;
- `stop.updated`;
- `vehicle.assignment.changed`;
- `vehicle.status.changed`;
- `passenger.task.updated`;
- `operations.override.approved`;
- `operations.override.rejected`;
- `incident.acknowledged`;
- `message.received`;
- `message.recalled`;
- `check.reviewed`;
- `driver.access.changed`.

---

## 4. Severity model

### P0 — stop-ship

A P0 issue can create unsafe service, data loss, privacy exposure, false operational confirmation, tenant leakage or inability to prove what happened.

### P1 — required for controlled pilot

A P1 issue may not immediately cause an unsafe action, but blocks a reliable limited deployment or creates substantial support and recovery risk.

### P2 — required for scale and product quality

A P2 issue affects maintainability, usability, consistency, performance or delivery speed.

### P3 — later optimisation

A P3 issue improves experience or efficiency but is not required to establish safe production operation.

---

# Part I — P0 stop-ship remediation

## 5. P0-01 — Remove mock bootstrap from production paths

### Problem

The Driver bootstrap process currently builds data from mock fixtures. A production Driver must receive authoritative data for:

- identity and access;
- operator and depot;
- current and future duties;
- active duty and journey;
- assigned vehicle;
- passenger tasks;
- eligibility blocks;
- vehicle check requirements;
- messages and urgent notices;
- sync cursor and server time.

### Required fix

Create:

```http
GET /driver/bootstrap
```

Response contract:

```ts
interface DriverBootstrapProjection {
  schemaVersion: number;
  serverTime: string;
  syncCursor: string;
  identity: {
    userId: string;
    driverId: string;
    companyId: string;
    depotIds: string[];
    activeDepotId: string;
    accessStatus: DriverAccessStatus;
  };
  operator: OperatorSummary;
  driver: DriverProfileProjection;
  duties: DutyDetail[];
  vehicleChecks: VehicleCheckSummary[];
  messages: MessagesInboxProjection;
  requiredActions: DriverRequiredAction[];
  featurePolicy: DriverFeaturePolicy;
}
```

### Client changes

- Replace mock `buildBootstrapPayload` use outside explicit demo/test code.
- Introduce `DriverBootstrapClient`.
- Store bootstrap in encrypted local database.
- Validate response with Zod.
- Reject unknown unsupported schema versions.
- Persist `serverTime` and `syncCursor`.
- Hydrate Driver store from repository, not fixture module.

### Production guard

```ts
if (isProductionBuild() && isMockApi()) {
  throw new ProductionConfigurationError("Mock API is not permitted in production");
}
```

### Acceptance criteria

- Production build contains no call to mock bootstrap.
- Offline startup uses the last encrypted accepted bootstrap.
- Bootstrap clearly shows cache age.
- Stale cache policy is operator-configurable.
- A disabled or removed Driver is blocked even if an older cache exists.
- E2E verifies server bootstrap and offline cached restart.

---

## 6. P0-02 — Remove mock mutation fallback from production sync

### Problem

Envelope-less mutations can fall back to mock sync. This allows unsupported actions to mutate local mock state rather than fail loudly.

### Required fix

In production, every operational mutation must map to a defined command.

```ts
const command = outboxMutationToCommand(mutation);
if (!command) {
  throw new UnsupportedOperationalMutationError(mutation.type);
}
```

Mock fallback may only exist when all of the following are true:

```text
build mode = development or test
mock API explicitly enabled
not a signed production package
```

### Required command inventory

At minimum:

```text
duty.acknowledge
duty.clock_in
duty.clock_out
duty.complete
vehicle.verify
vehicle.check.submit
vehicle.defect.report
vehicle.handback
journey.start
journey.complete
journey.break.start
journey.break.end
journey.note.add
delay.report
stop.arrive
stop.depart
passenger.outcome
incident.report
vehicle.replacement.request
message.send
message.acknowledge
```

### Acceptance criteria

- Command mapping test fails when a new mutation lacks a command.
- Production sync never imports or calls `mockSyncMutation`.
- Unsupported command UI displays a recoverable technical error and records diagnostics.
- No unsupported action is marked successful.

---

## 7. P0-03 — Missing session or tenancy must not apply locally

### Problem

When company, depot or user context is missing, operational mutations may be applied locally.

### Required fix

Replace fallback behaviour with an explicit access failure.

```ts
if (!session.user) {
  throw new OperationalAccessError("session_missing");
}
if (!tenancy.companyId) {
  throw new OperationalAccessError("company_context_missing");
}
if (!tenancy.depotId) {
  throw new OperationalAccessError("depot_context_missing");
}
```

### UX behaviour

- Preserve entered form data locally where safe.
- Do not transition the operational workflow.
- Display: “This action has not been recorded. Reconnect your account or contact Operations.”
- Offer sign-in recovery and Operations call.
- Record a local diagnostic event without sensitive payload content.

### Acceptance criteria

- Direct route access without valid tenancy cannot mutate operational state.
- Expired session during active duty pauses command submission and starts recovery flow.
- No local-only mutation is described as accepted or synced.
- Security test verifies cross-company context cannot be injected from client storage.

---

## 8. P0-04 — Introduce truthful sync states

### Problem

Local fallback can label work `synced` without server acceptance.

### Required state model

```ts
type OperationalDeliveryStatus =
  | "draft"
  | "saved_locally"
  | "queued"
  | "sending"
  | "received"
  | "accepted"
  | "needs_review"
  | "rejected"
  | "conflict"
  | "failed";
```

### UI language

Use these distinctions:

```text
Saved on this device
Waiting to send
Sending
Received by Veyvio
Accepted
Needs Operations review
Rejected — action required
Conflict — duty changed
```

Never use “Synced” as the only state for a safety-critical record.

### Acceptance criteria

- Outbox-only work shows “Saved on this device” or “Waiting to send”.
- Server acceptance is the only path to `accepted`.
- Check, incident, handback and duty completion surfaces display server receipt/reference.
- Sync status is consistent across Home, Duties, Checks, Messages and More.

---

## 9. P0-05 — Replace plaintext message persistence

### Problem

Messages and conversation details are persisted in browser `localStorage`. Driver messages may contain passenger, route, incident or safeguarding information.

### Required fix

Move messages into encrypted local storage.

Recommended production path:

- Capacitor native shell;
- SQLite-backed local database;
- encryption at rest using a device-bound key stored through platform secure storage;
- per-company and per-driver namespace;
- record-level classification and retention.

### Data model

```ts
interface LocalMessageRecord {
  companyId: string;
  driverId: string;
  conversationId: string;
  messageId: string;
  classification: "operational" | "urgent" | "passenger" | "safeguarding";
  encryptedBody: Uint8Array;
  createdAt: string;
  retentionUntil: string;
  deliveryStatus: MessageDeliveryStatus;
  serverVersion: number;
}
```

### Additional requirements

- Clear current-user message keys on secure logout.
- Never expose one Driver’s cache after another Driver signs in.
- Do not cache full safeguarding threads unless policy requires it.
- Prevent sensitive message bodies from entering logs or crash reports.
- Add migration to delete legacy localStorage message cache.

### Acceptance criteria

- No message body stored in `localStorage`.
- Shared-device test confirms no cross-user data visibility.
- Logout and remote revoke remove decrypted local access.
- Security review signs off storage and retention design.

---

## 10. P0-06 — Make server lifecycle enforcement authoritative

### Problem

Client-side gates improve UX but can be bypassed through stale clients, direct requests or manipulated local state.

### Required fix

The server must enforce all critical transitions.

Required validators:

```ts
canAcknowledgeDuty(...)
canClockIn(...)
canVerifyVehicle(...)
canSubmitVehicleCheck(...)
canStartJourney(...)
canArriveAtStop(...)
canRecordPassengerOutcome(...)
canDepartStop(...)
canCompleteJourney(...)
canHandbackVehicle(...)
canClockOut(...)
canCompleteDuty(...)
```

### Required server rejection contract

```ts
interface CommandRejection {
  status: "rejected";
  commandId: string;
  reasonCode: string;
  userMessage: string;
  currentVersion?: number;
  serverProjection?: unknown;
  recoveryActions?: RecoveryAction[];
}
```

### Acceptance criteria

- Direct API tests prove premature duty completion is rejected.
- A passenger exception blocks stop departure server-side.
- Handback cannot occur while another journey requiring custody remains.
- Journey start is rejected for an unverified/VOR vehicle.
- Old app versions cannot bypass current state rules.

---

## 11. P0-07 — Build production incident and safeguarding delivery

### Problem

Incident handling has strong UI concepts but production persistence, acknowledgement, escalation and restricted access are not yet proven.

### Required state machine

```text
Draft
→ Saved locally
→ Queued
→ Sent
→ Received
→ Acknowledged by Operations
→ Assigned
→ Resolved
```

Alternative states:

```text
Needs urgent phone escalation
Rejected as duplicate
Upload incomplete
Delivery failed
```

### Required backend contracts

```http
POST /ops/commands                       incident.report
POST /driver/media/uploads               evidence upload session
GET  /driver/incidents/:incidentId       current incident projection
```

### Safeguarding rules

- Safeguarding cannot be treated as a normal chat message.
- Use structured categories and minimal free text.
- Restrict access by role.
- Record every view, update, export and resolution.
- Surface a telephone escalation path while offline.
- Never claim “reported” before server receipt.

### Acceptance criteria

- Offline incident survives process death.
- Evidence survives app restart.
- Driver receives a server incident reference.
- Operations acknowledgement reaches Driver.
- Urgent incident triggers phone fallback guidance.
- Safeguarding records are excluded from normal analytics and logs.

---

## 12. P0-08 — Implement durable media outbox

### Problem

Vehicle check and incident photos can be lost if they rely on temporary browser URLs, transient memory or a form lifecycle.

### Required design

```ts
interface MediaUploadJob {
  localMediaId: string;
  companyId: string;
  driverId: string;
  linkedAggregateType: "vehicle_check" | "defect" | "incident";
  linkedAggregateId: string;
  localFileUri: string;
  checksumSha256: string;
  mimeType: string;
  bytes: number;
  capturedAt: string;
  status: "captured" | "queued" | "uploading" | "uploaded" | "verified" | "failed";
  retryCount: number;
  serverMediaId?: string;
}
```

### Upload protocol

1. Capture to durable app-controlled file location.
2. Compute checksum.
3. Persist media job.
4. Request upload session.
5. Upload bytes.
6. Server verifies checksum.
7. Attach server media ID to command.
8. Server accepts record only when required evidence exists.

### Acceptance criteria

- App kill during upload does not lose media.
- Retry resumes without duplicate server records.
- Duplicate uploads are idempotent.
- A submitted check cannot reference a missing temporary object URL.
- Storage cleanup never deletes pending evidence.

---

## 13. P0-09 — Build authoritative Operations event delivery

### Problem

The Driver can become stale when Operations changes work during a duty.

### Required capability

Use authenticated WebSocket, server-sent events or a robust push-plus-refresh strategy.

Events must support:

- duty cancellation;
- driver reassignment;
- vehicle replacement;
- stop cancellation;
- stop resequencing;
- passenger task removal/addition;
- urgent instruction;
- Operations exception resolution;
- check review result;
- incident acknowledgement.

### Conflict policy

When a server update conflicts with a local pending action:

1. preserve local evidence;
2. stop automatic progression;
3. apply server projection;
4. display what changed;
5. offer safe recovery actions;
6. notify Operations when human resolution is required.

### Acceptance criteria

- Mid-duty vehicle change appears without app restart.
- Cancelled stop cannot still be completed from stale UI.
- Active navigation updates safely when route sequence changes.
- Event cursor prevents missed or duplicate event application.

---

## 14. P0-10 — Establish mandatory CI status

### Problem

The latest Driver commit has no verified combined CI status.

### Required CI checks

```text
Driver / TypeScript
Driver / Unit tests
Driver / Domain state-machine tests
Driver / E2E critical workflows
Driver / Production demo-control scan
Driver / Mobile web build
Driver / Android debug build
Driver / Dependency audit
Driver / Secret scan
Shared ops / Contract tests
```

### Branch policy

- Protect `main`.
- Require passing checks.
- Require at least one review for production changes.
- Require code-owner review for shared domain, auth, storage and safety workflows.
- Block force push.
- Require signed or verified release workflow where feasible.

### Acceptance criteria

- Every commit intended for release has green CI.
- Android build artifact is retained.
- Test reports are visible.
- Secret scanning and dependency review are enforced.

---

# Part II — P1 controlled-pilot remediation

## 15. Authentication and account lifecycle

### Required Driver access model

```ts
type DriverAccessStatus =
  | "active"
  | "invitation_pending"
  | "password_reset_required"
  | "driver_not_linked"
  | "account_disabled"
  | "employment_ended"
  | "company_inactive"
  | "depot_access_removed"
  | "session_expired";
```

### Required behaviour

- Refresh tokens safely in the mobile runtime.
- Revoke access promptly from Command.
- Register the device to the Driver account.
- Support remote device revoke.
- Prevent operator switching unless explicitly authorised.
- Require re-authentication for sensitive account/security actions.
- Define active-duty behaviour when session expires.
- Prevent disabled Drivers from relying on stale offline cache.

### Deliverables

- `DriverAccessService`;
- session recovery screen;
- device registration API;
- remote revoke event;
- secure logout flow;
- access policy tests.

---

## 16. Encrypted local operational database

### Required tables

```text
bootstrap_cache
duty_projections
journey_projections
passenger_task_projections
vehicle_check_projections
message_records
incident_records
outbox_commands
media_upload_jobs
event_cursor
device_registration
app_metadata
```

### Requirements

- schema migrations;
- encryption at rest;
- tenant/user namespace;
- atomic transactions;
- crash-safe writes;
- retention policies;
- storage pressure handling;
- no destructive cleanup while unsent work exists.

### Migration strategy

1. Introduce repository interfaces.
2. Implement web test adapter.
3. Implement native SQLite adapter.
4. Migrate outbox first.
5. Migrate messages and incidents.
6. Migrate projections.
7. remove operational localStorage usage.

---

## 17. Driver bootstrap and projection APIs

### Required APIs

```http
GET /driver/bootstrap
GET /driver/duties
GET /driver/duties/:dutyId
GET /driver/vehicle-checks
GET /driver/messages
GET /driver/incidents/:incidentId
GET /driver/sync/events?after=:cursor
```

### Projection requirements

- include version numbers;
- include server timestamps;
- contain only data permitted for that Driver;
- minimise passenger data;
- include explicit expiry/staleness metadata;
- support incremental refresh;
- support ETag or version-based caching.

---

## 18. Eligibility and release-to-work

### Eligibility categories

- active employment;
- licence validity and required category;
- CPC validity;
- DBS/safeguarding status where applicable;
- training validity;
- occupational restriction;
- working-time/rest rule;
- depot permission;
- vehicle class permission;
- required card/equipment status;
- operator-specific compliance rules.

### Required server decisions

```ts
interface DriverReleaseDecision {
  allowed: boolean;
  evaluatedAt: string;
  expiresAt: string;
  blockers: ReleaseBlocker[];
  warnings: ReleaseWarning[];
}
```

### Timing

Evaluate:

- morning release batch;
- duty assignment;
- duty acknowledgement;
- clock-in;
- journey start;
- any relevant mid-duty expiry or suspension event.

### Acceptance criteria

- Expired licence blocks assignment and start.
- Warning-only items do not incorrectly block.
- Release decision is auditable.
- Offline continuation policy is explicit and operator-controlled.

---

## 19. Vehicle verification and QR security

### QR design

QR must contain only an opaque, immutable asset identifier or signed short-lived token. It must not contain sensitive vehicle or company information.

### Verification checks

- same company;
- permitted depot;
- assigned vehicle or approved replacement;
- not VOR;
- no blocking defect;
- correct vehicle class;
- QR not revoked;
- scan timestamp and source recorded.

### Offline behaviour

Offline verification may use cached assignment only when operator policy permits and cache age is within a defined limit. The UI must state that the result is based on offline data.

### Anti-copy controls

Consider:

- tamper-evident labels;
- rotating signed QR tokens for high-risk fleets;
- nearby Bluetooth/NFC confirmation later;
- location and depot context as supportive evidence.

---

## 20. Vehicle check submission lifecycle

### Required lifecycle

```text
Draft
→ Completed locally
→ Queued
→ Sending
→ Received
→ Accepted
```

Alternative states:

```text
Needs review
Rejected
Superseded
Cancelled
```

### Required policy

The operator must define whether a locally completed but not yet server-received check can release a vehicle while offline.

Possible policy modes:

```text
online_required
cached_assignment_offline_allowed
supervisor_override_required
```

### Check record requirements

- check template version;
- vehicle ID;
- duty ID;
- driver ID;
- start and completion timestamps;
- odometer;
- item outcomes;
- declared defects;
- evidence IDs;
- signature/attestation;
- app and device versions;
- server receipt and review status.

---

## 21. Duty preparation and clock-in

### Canonical preparation sequence

```text
Acknowledge duty
→ Confirm eligibility
→ Confirm vehicle
→ Complete required vehicle check
→ Review readiness
→ Clock in
```

### Clock-in policy checks

- time window;
- correct/allowed location;
- valid release decision;
- active operator membership;
- no duplicate active duty;
- vehicle verified;
- check accepted or allowed offline;
- no blocking incident/defect;
- rest/working-time rules.

### Clock-in evidence

```ts
interface ClockEventEvidence {
  occurredAtDevice: string;
  receivedAtServer?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  permissionState: "granted" | "denied" | "limited";
  networkState: "online" | "offline";
  deviceId: string;
}
```

Location is evidence, not the sole authority.

---

## 22. Duty and journey projections

### Required identifiers

```text
dutyId
journeyId
routeId
stopId
passengerTaskId
vehicleCustodyId
```

### Required projection fields

```ts
interface DutyDetail {
  id: string;
  version: number;
  lifecycleStatus: DutyLifecycleStatus;
  activeJourneyId?: string;
  activeStopId?: string;
  assignedVehicleId?: string;
  vehicleCustodyId?: string;
  journeys: JourneyDetail[];
  completionGate: DutyCompletionDecision;
}
```

### Remove remaining assumptions

Search and eliminate safety-critical use of:

```ts
runs[0]
primaryJourneyId ?? runs[0]
first journey is active
first stop is pickup
```

Helpers must require explicit lifecycle selection.

---

## 23. Passenger pickup outcomes

### Structured pickup outcomes

```text
boarded
not_travelling_authorised
passenger_not_present
unable_to_contact
refused_to_travel
unsafe_to_board
mobility_equipment_issue
carer_instruction_conflict
address_inaccessible
medical_concern
safeguarding_concern
operations_cancelled
```

### Outcome classification

```ts
interface PassengerOutcomePolicy {
  terminal: boolean;
  requiresOperations: boolean;
  requiresIncident: boolean;
  allowsDeparture: boolean;
  requiresNote: boolean;
}
```

### Safety rule

Exception outcomes move the stop to `waiting_for_operations` and block departure until an authorised server decision exists.

### Privacy rule

Prefer structured categories. Minimise free text. Safeguarding content opens the restricted incident workflow.

---

## 24. Passenger drop-off and handover

### Structured outcomes

```text
handed_to_authorised_person
independent_dropoff_permitted
authorised_person_absent
recipient_refused_handover
incorrect_location
unsafe_environment
passenger_unwell
passenger_remained_onboard
safeguarding_concern
operations_directed_alternative
```

### Non-negotiable rule

`authorised_person_absent` cannot count as successful handover.

### Operations resolution model

```ts
type HandoverResolution =
  | "continue_waiting"
  | "retry_contact"
  | "return_passenger"
  | "alternative_authorised_handover"
  | "contact_emergency_services"
  | "incident_escalated";
```

The resolution must identify who authorised it and when.

---

## 25. Breaks, delays and notes

### Break rules

- block unsafe break start while moving;
- account for passengers onboard;
- require safe parking confirmation;
- capture start/end timestamps;
- persist elapsed duration;
- notify Operations where policy requires;
- resume the correct active journey.

### Delay command

Use one command from every entry point:

```ts
delay.report({
  dutyId,
  journeyId,
  stopId,
  reason,
  estimatedMinutes,
  occurredAt,
});
```

### Note categories

```text
operational
passenger
vehicle
route
handover
```

Safeguarding is not a normal note category. It routes to incident handling.

---

## 26. Vehicle replacement state machine

### Required workflow

```text
Issue reported
→ Replacement requested
→ Operations reviews
→ Yard confirms vehicle availability
→ Replacement assigned
→ Old custody suspended/ended as appropriate
→ Driver verifies replacement
→ Required check completed
→ New custody opened
→ Journey resumes
```

### Required events

```text
vehicle.replacement.requested
vehicle.replacement.approved
vehicle.replacement.rejected
vehicle.custody.ended
vehicle.replacement.assigned
vehicle.replacement.verified
vehicle.check.completed
journey.resumed
```

### Rules

- Driver cannot self-approve replacement.
- Production UI contains no simulated Operations approval.
- Both old and new custody records remain auditable.
- Passenger onboard status affects replacement instructions.

---

## 27. Journey completion, handback and duty completion

### Canonical close workflow

```text
Complete current journey
→ Start next journey if required
→ Return to depot if required
→ Complete end-of-duty checks
→ Record final mileage
→ Hand back vehicle
→ Clock out
→ Complete duty
```

### Duty completion gate

Server must verify:

- all mandatory journeys complete;
- no unresolved passenger task;
- exception stops resolved;
- required depot return complete;
- final mileage present;
- vehicle handback complete;
- blocking defects reported;
- incident/debrief requirements complete;
- critical commands accepted;
- clock-out recorded.

### UX

Display blockers in operational language, not technical state names.

Example:

```text
Duty cannot be completed yet
• Return journey is still open
• Vehicle handback has not been accepted
• One passenger exception is waiting for Operations
```

---

## 28. Messaging backend and realtime delivery

### Required messaging capabilities

- inbox projection;
- conversation projection;
- idempotent send;
- delivery state;
- read state;
- acknowledgement state;
- urgent priority;
- attachment support;
- broadcast messages;
- recall/update policy;
- push notification;
- live refresh;
- retention and classification.

### State model

```ts
type MessageDeliveryStatus =
  | "draft"
  | "queued"
  | "sent"
  | "delivered"
  | "failed";
```

Read and acknowledged remain separate.

### Safeguarding

Safeguarding messages must open the incident workflow rather than remain as ordinary conversation content.

---

## 29. Sign-out and secure local data handling

### Sign-out blockers

Warn or block when:

- duty active;
- passenger onboard;
- vehicle custody open;
- unsent incident exists;
- unsent vehicle check exists;
- evidence upload pending;
- safety-critical command conflict unresolved.

### Secure logout sequence

1. Evaluate blockers.
2. Sync or clearly preserve pending safe work.
3. Revoke local tokens.
4. Remove decrypted keys.
5. Clear current-user projections according to policy.
6. Preserve encrypted unsent records only when recovery is supported.
7. Return to welcome/sign-in.

### Remote revoke

A remotely revoked device must stop decrypting operational data and must not continue using stale cached duties.

---

## 30. Driver focus and motion-aware interaction

### Keep-awake policy

Enable during:

- active navigation;
- active journey where operational view is required;
- active stop workflow;
- active vehicle check where useful.

Release during:

- duty end;
- sign out;
- prolonged background state;
- explicit Driver setting;
- critical battery policy where appropriate.

### Motion-aware UI

```text
Stationary
  Full operational controls

Moving
  Navigation, emergency, report delay, call Operations

Complex interaction
  Blocked until stationary or passenger-safe workflow
```

### Required tests

- vehicle begins moving during form;
- vehicle stops;
- app backgrounds;
- screen locks;
- Android battery optimisation;
- keep-awake permission/plugin failure.

---

## 31. Navigation production hardening

### Routing service requirements

- timeout;
- abort/cancellation;
- retry;
- route cache;
- offline fallback;
- stale route indicator;
- off-route detection;
- route recalculation policy;
- telemetry without sensitive destination leakage;
- licensing review for tiles and route service.

### Driver distraction controls

- no complex custom destination typing while moving;
- large controls;
- Operations-sent destination preferred;
- safe voice entry considered later;
- route update confirmation only when needed.

### Background behaviour

Define and test:

- app background;
- screen lock;
- process kill;
- GPS permission removal;
- low power mode;
- network handover;
- navigation service failure.

---

# Part III — P2 maintainability and product quality

## 32. Migrate visible Duties routes

### Current issue

The UI says Duties while primary list routes remain under `/trips`.

### Migration plan

```text
/trips                       → /duties
/trips/:assignmentId         → /duties/:dutyId
```

### Requirements

- add redirects;
- preserve deep links;
- update tests;
- update analytics names;
- update docs;
- keep backend assignment/run IDs unchanged;
- avoid one large uncontrolled rename.

---

## 33. Split oversized workspace components

### Target structure

```text
MessagesWorkspace/
  MessagesWorkspaceScreen.tsx
  MessagesMap.tsx
  MessagesSheet.tsx
  ConversationList.tsx
  MessageComposer.tsx
  useMessagesWorkspaceController.ts

ChecksWorkspace/
  ChecksWorkspaceScreen.tsx
  ChecksCanvas.tsx
  ChecksSheet.tsx
  CheckStagePanel.tsx
  useChecksWorkspaceController.ts

DutiesWorkspace/
  DutiesWorkspaceScreen.tsx
  DutiesMap.tsx
  DutiesSheet.tsx
  DutyPanel.tsx
  useDutiesWorkspaceController.ts
```

### Rules

- domain decisions do not move into components;
- controllers expose stable view models and commands;
- map/sheet layout logic remains reusable;
- components remain testable without full route environment.

---

## 34. Standardise error, empty, loading and stale states

Every major workspace must define:

```text
loading
loaded
empty
offline_cached
stale
partial
permission_denied
failed
conflict
access_removed
```

### Required shared components

```text
OperationalLoadingState
OperationalEmptyState
OperationalErrorState
OfflineCacheBanner
StaleProjectionBanner
ConflictResolutionPanel
AccessRemovedPanel
```

---

## 35. Accessibility and inclusive design

### Required standards

- minimum target size;
- screen-reader labels;
- logical focus order;
- visible focus;
- reduced-motion support;
- high-contrast support;
- large text without clipping;
- colour not sole status signal;
- haptic/visual alternatives;
- map controls usable without map precision.

### Test matrix

- Android TalkBack;
- 200% text scaling;
- portrait and landscape where supported;
- reduced motion;
- low vision contrast;
- one-handed use;
- gloved use for Yard/vehicle workflows where relevant.

---

## 36. Units, time and localisation

### Requirements

- UK default distance `mi`;
- operator-configurable units;
- 24-hour time default for UK operators;
- timezone-safe server timestamps;
- daylight-saving tests;
- explicit date labels for future/past duties;
- no business decisions based only on device clock.

---

## 37. Observability and diagnostics

### Required telemetry

Track technical events such as:

- bootstrap success/failure;
- command queued/accepted/rejected;
- conflict;
- media upload status;
- event stream reconnect;
- app process restoration;
- permission state;
- route service availability.

### Privacy rules

Do not log:

- passenger names;
- addresses;
- message bodies;
- safeguarding details;
- access tokens;
- full command payloads;
- unrestricted evidence URLs.

### Support bundle

Provide a Driver-safe diagnostic export containing:

- app version;
- device model;
- permission status;
- sync counts;
- last successful sync time;
- anonymised error codes;
- no passenger-sensitive content.

---

## 38. Performance

### Performance budgets

Define budgets for:

- cold startup;
- cached startup;
- workspace switch;
- map render;
- route calculation;
- message open;
- check form restore;
- command enqueue;
- battery use during navigation.

### Required improvements

- lazy-load noncritical routes;
- virtualise long message/history lists;
- avoid rerendering full maps on sheet movement;
- memoise derived view models;
- cancel stale route requests;
- cap cached media thumbnails;
- monitor memory on low/mid-range Android devices.

---

# Part IV — Cross-app integration

## 39. Driver ↔ Command integration

### Required loops

```text
Driver exception
→ Command Live Operations
→ Operations decision
→ Driver resolution event
```

```text
Driver incident
→ Command Incidents
→ acknowledgement/assignment
→ Driver status update
```

```text
Command duty change
→ Driver event
→ local projection update
→ Driver acknowledgement where required
```

### Command requirements

- show delivery status of Driver commands;
- show unsynced/offline warning without exposing sensitive device detail;
- issue audited overrides;
- never directly mutate Driver local state;
- send versioned server projections/events.

---

## 40. Driver ↔ Yard integration

### Required loops

```text
Driver defect
→ Yard vehicle alert
→ Vehicle restriction/VOR decision
→ Driver and Command update
```

```text
Driver handback
→ Yard expected return
→ Yard receipt/inspection
→ custody closure
```

```text
Replacement vehicle approved
→ Yard assigns physical vehicle
→ Driver verifies QR
→ Driver check
→ custody begins
```

### Shared identifiers

Vehicle, depot, defect, custody and check IDs must be immutable shared platform IDs.

---

## 41. Driver ↔ Maintenance integration

### Required loop

```text
Driver defect evidence
→ Maintenance triage
→ work order or monitor decision
→ vehicle status change
→ Driver/Yard/Command visibility
```

Driver must see only the operational result needed for safe use, not unrestricted workshop data.

---

# Part V — Testing and assurance

## 42. Unit test requirements

### Domain

- every duty transition;
- every journey transition;
- stop type routing;
- passenger outcome classification;
- handover rules;
- completion gate blockers;
- vehicle custody;
- replacement state machine;
- sync status mapping;
- access decisions.

### Platform

- command envelope creation;
- idempotency;
- storage migration;
- media retry;
- event cursor;
- session recovery;
- tenant namespace;
- production configuration guard.

---

## 43. Integration test requirements

- bootstrap validation and persistence;
- command accepted projection update;
- version conflict;
- offline queue then reconnect;
- media upload plus command attachment;
- event stream reconnect and replay;
- remote access revoke;
- cross-tenant rejection;
- Command override round trip;
- Yard VOR round trip.

---

## 44. E2E critical workflow matrix

### Duty lifecycle

1. Sign in.
2. Receive duty.
3. Acknowledge.
4. Pass eligibility.
5. Verify vehicle.
6. Complete nil-defect check.
7. Clock in.
8. Start journey 1.
9. Complete journey 1.
10. Start journey 2 without handback.
11. Return to depot.
12. Hand back.
13. Clock out.
14. Complete duty.

### Passenger exception

1. Arrive pickup.
2. Record unsafe-to-board.
3. Stop enters waiting for Operations.
4. Depart is blocked.
5. Operations resolves.
6. Driver receives resolution.
7. Route continues according to decision.

### Drop-off safeguarding

1. Authorised person absent.
2. Handover cannot complete.
3. Safeguarding/Operations path opens.
4. Driver receives audited instruction.
5. Passenger remains accounted for.

### Offline vehicle check

1. Start online.
2. Lose network.
3. Complete check and photos.
4. Kill app.
5. Reopen.
6. Check and photos remain.
7. Reconnect.
8. Upload resumes.
9. Server accepts.
10. Driver sees receipt.

### Mid-duty Operations change

1. Journey active.
2. Operations cancels next stop.
3. Driver event arrives.
4. Stop disappears or is marked cancelled.
5. Stale completion is rejected.

### Session expiry

1. Duty active.
2. Session expires.
3. Local evidence remains safe.
4. New safety command is not falsely accepted.
5. Recovery flow completes.
6. Work resumes against refreshed projection.

---

## 45. Physical Android test matrix

Test on low, mid and current-range devices.

### Native plugins

- camera;
- QR scanning;
- geolocation;
- keep-awake;
- splash screen;
- local notifications;
- app foreground/background;
- deep links.

### Failure conditions

- permission denied;
- permission revoked later;
- no GPS fix;
- poor accuracy;
- no network;
- captive portal;
- process death;
- device restart;
- low storage;
- low battery;
- battery optimisation;
- interrupted upload;
- Android WebView update.

---

## 46. Security test requirements

- cross-company duty access;
- cross-driver cache access;
- modified company/depot context;
- replayed commands;
- duplicate idempotency key;
- stale aggregate version;
- revoked Driver offline startup;
- copied QR;
- message cache extraction;
- logout data persistence;
- sensitive log scanning;
- CSRF/cookie behaviour in Capacitor;
- token refresh and revoke;
- evidence URL access control.

---

# Part VI — Delivery programme

## 47. Recommended implementation phases

### Phase A — Production fail-closed foundation

- production configuration guard;
- remove mock fallback;
- reject missing auth/tenancy;
- truthful sync statuses;
- CI gates;
- command inventory completeness.

**Exit gate:** Production build cannot silently use fixtures or local-success behaviour.

### Phase B — Authoritative backend projections

- Driver bootstrap endpoint;
- duty projection endpoint;
- command endpoint completion;
- event stream;
- access policy;
- server lifecycle validation.

**Exit gate:** Home and Duties operate against server authority.

### Phase C — Secure offline storage and media

- encrypted database;
- outbox migration;
- message migration;
- incident migration;
- media job queue;
- process-death recovery.

**Exit gate:** Safety-critical work and evidence survive app/device interruption without plaintext storage.

### Phase D — Safety and cross-app loops

- passenger exception resolution;
- incident acknowledgement;
- Yard defect/VOR loop;
- replacement state machine;
- handback/custody loop.

**Exit gate:** Driver, Command and Yard share closed operational workflows.

### Phase E — Mobile assurance

- Android build pipeline;
- physical-device matrix;
- background/navigation testing;
- permission recovery;
- signed staging release.

**Exit gate:** Controlled internal pilot approval.

### Phase F — Controlled pilot

- limited operator/depot;
- trained Drivers;
- staffed Operations support;
- daily audit review;
- feature flags;
- rollback plan;
- no unsupported safety workflow.

**Exit gate:** Measured production readiness decision.

---

## 48. Suggested engineering slices

| Slice | Scope | Priority |
|---|---|---:|
| R0 | Production configuration guard and no-mock enforcement | P0 |
| R1 | Complete command mapping and remove mock sync fallback | P0 |
| R2 | Auth/tenancy fail-closed behaviour | P0 |
| R3 | Truthful sync state vocabulary and UI | P0 |
| R4 | Real Driver bootstrap API and repository | P0 |
| R5 | Server lifecycle validators and rejection contract | P0 |
| R6 | Encrypted local DB foundation | P0/P1 |
| R7 | Message migration from localStorage | P0 |
| R8 | Durable media outbox | P0 |
| R9 | Production incident/safeguarding delivery | P0 |
| R10 | Driver event stream and projection refresh | P0 |
| R11 | Eligibility server release gate | P1 |
| R12 | QR/vehicle verification hardening | P1 |
| R13 | Vehicle replacement state machine | P1 |
| R14 | Driver/Command/Yard closed loops | P1 |
| R15 | Sign-out, device revoke and secure wipe | P1 |
| R16 | Navigation and motion-aware hardening | P1 |
| R17 | Route migration `/trips` → `/duties` | P2 |
| R18 | Workspace component decomposition | P2 |
| R19 | Accessibility, performance and observability | P2 |
| R20 | Controlled pilot readiness review | Gate |

### R0 implementation evidence — 16 July 2026

**Status:** Implemented and build-guard verified.

- Mock API is now an explicit development opt-in; the default selects real transport.
- Production and mobile builds reject mock API or development authentication bypass with `ProductionConfigurationError` before asset transformation.
- Application startup repeats the configuration assertion as runtime defence in depth.
- Driver unit suite passes: 30 test files, 134 tests.
- Production web and mobile builds pass with both development-only flags disabled.
- Production web and mobile builds both reject `VITE_USE_MOCK_API=true`.
- Repository-wide Driver type-check remains red on pre-existing route, store and domain diagnostics outside the R0 touch set; edited R0 files report no IDE diagnostics.

---

## 49. Ownership model

### Product

Owns:

- Driver mental model;
- workflow policy;
- operator configuration;
- offline continuation rules;
- acceptance wording;
- pilot scope.

### Architecture / principal engineering

Owns:

- state machines;
- authoritative data model;
- command/event contracts;
- tenancy model;
- offline architecture;
- cross-app boundaries;
- production gates.

### Driver frontend/mobile

Owns:

- workspace experience;
- local repositories;
- optimistic overlays;
- native plugin adapters;
- accessibility;
- process restoration.

### Backend/platform

Owns:

- bootstrap/projection APIs;
- command validation;
- event stream;
- authentication;
- tenancy enforcement;
- audit;
- media service.

### Command/Yard teams

Own:

- Operations resolution surfaces;
- VOR and replacement actions;
- handback receipt;
- incident acknowledgement;
- event publication.

### QA/safety assurance

Owns:

- critical workflow matrix;
- physical-device tests;
- regression gates;
- pilot evidence;
- release sign-off.

### Security/privacy

Owns:

- threat model;
- encryption approach;
- retention;
- access control review;
- safeguarding data handling;
- penetration testing.

---

## 50. Definition of done for every safety-critical slice

A slice is not done when the UI appears correct.

It is done only when:

- domain rule documented;
- server rule implemented;
- client rule implemented;
- command/event contract versioned;
- offline behaviour defined;
- failure behaviour defined;
- audit record defined;
- accessibility checked;
- unit tests passing;
- integration tests passing;
- E2E path passing;
- production build contains no demo bypass;
- documentation updated;
- Operations recovery instructions available.

---

## 51. Pilot readiness gates

The application may enter a controlled live pilot only when all gates below pass.

### Data authority

- real bootstrap;
- real duty projection;
- real command transport;
- no production mock fallback;
- realtime or reliable event refresh.

### Safety

- eligibility server gate;
- passenger exception hold;
- handover rules;
- duty completion server gate;
- vehicle VOR/replacement loop;
- incident acknowledgement.

### Offline

- encrypted storage;
- durable outbox;
- durable evidence;
- truthful status;
- conflict recovery;
- process-death restoration.

### Security

- tenancy tests;
- device revoke;
- secure logout;
- no plaintext sensitive cache;
- privacy review;
- logging review.

### Quality

- protected branch;
- green CI;
- physical Android matrix;
- signed staging build;
- support and rollback plan;
- Driver and Operations training.

---

## 52. Final technical-track position

The current Driver application should be preserved as the product and UI foundation. Its five-tab structure, workspace model, duty hierarchy and lifecycle improvements are sound.

The remediation programme should therefore avoid rewriting the application shell. It should replace the underlying mock and ambiguous operational infrastructure with:

```text
authoritative server projections
→ explicit command and event contracts
→ encrypted offline storage
→ durable evidence and incident delivery
→ closed Driver/Command/Yard workflows
→ mandatory CI and physical-device assurance
```

The highest-value engineering decision is to make production behaviour fail closed before adding further product surface area.

The highest-risk mistake would be to continue polishing screens while local mock success, plaintext data and incomplete server authority remain underneath them.

The immediate next engineering slice is:

> **R0–R3: production configuration guard, complete command mapping, fail-closed auth/tenancy, and truthful delivery states.**

Once those foundations are in place, implement the real Driver bootstrap and server lifecycle validators before any live operational trial.
