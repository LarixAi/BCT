# Veyvio Website Master Blueprint — v2

## Page Specification 01 — Homepage

**Document status:** Working design — v2 (expanded)
**Page name:** Veyvio Homepage
**Proposed URL:** `/`
**Primary domain:** `veyvio.com`
**Page type:** Public marketing and conversion page
**Primary objective:** Help qualified transport operators understand Veyvio and book a demonstration
**Secondary objectives:** Build trust, explain the platform, direct existing users to sign in and support product discovery through search engines and AI systems

---

## v2 Change Log — What's new and why

This revision keeps the original v1 structure and content intact (you'll recognise every section) and adds the things a working engineering/product/architecture team would ask for before this could actually be built and shipped. Nothing below removes a v1 decision; it either **tightens** a section that was directionally right but underspecified, or **adds** a section that was implied but missing.

| Area | What changed | Why |
|---|---|---|
| §5 Positioning | Added a differentiation table against named competitors | A positioning statement is untestable without knowing who you're positioned *against* |
| §9 Multi-Company Trust | Rewritten as a real tenant-isolation architecture decision, not a marketing paragraph | "Keep each company's data separated" is an engineering commitment, not just copy |
| §13 Accessibility | Added the 9 WCAG 2.2 success criteria explicitly, and flagged the EU/UK regulatory timeline | v1 said "target WCAG 2.2 AA" without listing what's actually new versus 2.1 |
| §21 Open Decisions | Converted from a bare list into a decision log with owner, recommendation and default | An "open decision" with no recommended default blocks implementation indefinitely |
| New Part A | Competitive landscape (UK community transport + fleet compliance market) | The homepage can't credibly claim differentiation without knowing the field |
| New Part C | Technical architecture addendum (tenant isolation pattern, system context, integration inventory, data flows) | v1 described *what* the platform must guarantee; it didn't describe *how* |
| New Part D | Risk register | Distinguished-engineer review requires naming the ways this fails, not just the way it succeeds |
| New Part E | Claims substantiation register | Operationalises §10's "no unsupported claims" rule into an actual review artefact |
| New Part F | Full-site information architecture | The homepage links to ~40 destinations that don't exist as specified pages yet |
| New Part G | UK public-sector procurement & compliance considerations | Local authorities are a named primary audience (§4.5) but v1 never mentions G-Cloud/Digital Marketplace, which is how UK councils actually buy this category of software |
| New Part H | Definition of Ready (added before Definition of Done) | A page can't reach "done" if it was never "ready" to build |

---

# PART A — Market & Competitive Context *(new)*

## A.1 Why this matters for the homepage

Section 5 of v1 asks Veyvio to claim it is different from "a basic booking or fleet-management system." That claim can't be written credibly, tested legally, or defended in a sales conversation without knowing what the alternatives actually do. This section groups the real market Veyvio is entering into three lanes, based on current UK and international offerings.

## A.2 Lane 1 — Scheduling and dispatch incumbents (mostly US/international, enterprise, agency-focused)

**Trapeze Group, RouteMatch, Ecolane, Optibus, Hastus** are the long-standing names in demand-responsive transit (DRT), paratransit and NEMT scheduling. Independent buyer-facing comparisons describe them consistently: <cite index="4-1">RouteMatch fits agencies that manage recurring trips and require structured service change workflows for daily operational consistency, while Ecolane fits operators that need route planning, scheduling and dispatch-ready outputs, and Trapeze Group supports enterprise-grade planning and operations for multi-mode transit agencies.</cite> On the governance side, <cite index="6-1">RouteMatch and Trapeze both tie dispatch outcomes and workflow history into audit-ready reporting baselines that compliance teams rely on for consistent evidence.</cite>

**Gap for Veyvio:** these platforms are built around *scheduling and dispatch as the core object*, with compliance and vehicle-readiness treated as an add-on or a separate module (often a separate vendor entirely). None of the public descriptions above bundle driver eligibility, vehicle readiness, yard/depot operations and maintenance into the same connected data model that dispatch reads from in real time — which is Veyvio's stated Section 8 differentiator ("know whether a vehicle is truly ready for work").

## A.3 Lane 2 — UK community and local-authority transport specialists

This is the lane Veyvio's named audiences (§4.1, §4.5) actually compete in day to day. UK-specific systems currently in this space include:

- **CTS Software — TripMaster**: <cite index="8-1">a full suite of scheduling, billing and reporting functions, plus mapping, auto-scheduling, an MDT interface, broker imports and an online rider portal.</cite>
- **CATSS**: <cite index="9-1">flexible, affordable transport scheduling software developed by community transport operators, for community transport operators.</cite>
- **Road XS**: <cite index="10-1">intelligent transport software covering DRT, patient transport, secure, commercial and community transport, bringing journey planning, driver coordination and booking management together.</cite>
- **RLDatix / Flexiroute**: positioned specifically around home-to-school and community transport transport-management workflows for local authorities.
- **OPTiMiSe**: <cite index="14-1">booking software designed specifically for community transport and community service organisations, with a pricing model built to suit groups of all sizes.</cite>
- **CTX (Shaunsoft)**, listed on the UK Government Digital Marketplace (G-Cloud), covers <cite index="17-1">home-to-school transport, social services transport and community transport, including contract management with external providers as well as an operator's own fleet, scheduling, route optimisation, travel passes, SEN transport and a custom API for third-party integrations</cite> — priced publicly at roughly £1,600 per licence per month.

**Gap for Veyvio:** this lane is fragmented, mostly desktop/Windows-application-era in origin (CTX explicitly still ships a Windows application alongside web and mobile), and none of the public feature lists mention connected *yard* operations (bay/damage/VOR tracking) or a distinct driver-facing mobile-first application with offline support as first-class citizens — both of which are core Veyvio applications (§2, Section 2 of the homepage).

## A.4 Lane 3 — Fleet compliance and walkaround-check tools

**FleetCheck, Fleet Planner**, and similar UK fleet-compliance products own the "driver walkaround check → defect → audit trail" workflow that Veyvio Yard and Veyvio Maintenance overlap with. <cite index="18-1">FleetCheck Driver is a customisable vehicle walkaround app that lets drivers carry out checks digitally instead of on paper, with everything at the driver's fingertips.</cite> Its audit positioning is explicit: <cite index="25-1">the product is built to comply with the DVSA Guide to Maintaining Roadworthiness, with fully customisable checksheets and instant photographic evidence of defects.</cite> Fleet Planner makes a similar audit-integrity claim: <cite index="23-1">once a walkaround check, defect or other event is recorded it cannot be manipulated, giving a clear, date-and-time-stamped, end-to-end audit trail.</cite>

**Gap for Veyvio:** these tools are excellent at the vehicle side but are not passenger-transport scheduling systems — they don't know about bookings, passengers, drivers' duty rosters or service delivery. A community transport operator using FleetCheck or Fleet Planner today is necessarily running it *alongside* a separate scheduling tool from Lane 2, with no shared operational picture. This is the exact "information spread everywhere" problem Section 3 of the homepage describes, and it is a genuine, evidenced gap rather than a hypothetical one.

## A.5 Recommended differentiation table (for internal use — do not publish claims about named competitors)

| Capability | Lane 1 (Trapeze/RouteMatch/Ecolane) | Lane 2 (CTS/CATSS/Road XS/CTX) | Lane 3 (FleetCheck/Fleet Planner) | Veyvio |
|---|---|---|---|---|
| Scheduling & dispatch | Strong | Strong | None | Strong (Command) |
| Driver mobile app (duties, checks, comms) | Varies | Varies, often desktop-led | Strong (checks only) | Strong (Driver) |
| Yard/depot/bay/VOR management | Rare | Rare | Partial | Strong (Yard) |
| Maintenance/defect/return-to-service | Partial | Rare | Strong | Strong (Maintenance) |
| Compliance evidence & audit trail | Strong | Varies | Strong | Strong, shared across all apps |
| Multi-company/tenant isolation as a sold feature | Rare (usually single large agency) | Rare | Rare | Explicit (§9 / Part C) |
| Customer/commissioner portal | Sometimes | Sometimes | No | Yes |

**Homepage implication:** Section 5's positioning line — *"One connected platform for safer, clearer transport operations"* — is defensible specifically because it is the connection between scheduling, driver workflow, yard, maintenance and compliance that the market lacks, not any single capability in isolation. Copy throughout the homepage should keep returning to *connectedness* as the differentiator, not to any one feature beating a competitor's equivalent feature, because in isolation most of Veyvio's individual features already exist somewhere in the market (Part A.2–A.4 above).

## A.6 Rule for how this research is used in the live site

Per §10's content rules, none of the vendor names or claims in Part A may appear on the public homepage or in structured data. This section exists for internal positioning, sales enablement and the copywriting brief only. If a future comparison page is approved by Legal, it must independently re-verify current claims at time of publication — competitor feature sets and pricing shown here reflect research current as of July 2026 and will drift.

---

# PART B — Homepage Specification (retained from v1, with targeted revisions)

*(Sections 1–4, 6–8, 10–12, 14–20 are unchanged from v1 and are retained below in full for a single source of truth. Sections 5, 9, 13 and 21 have been rewritten; changes are marked.)*

---

# 1. Purpose of the Homepage

The homepage must explain Veyvio clearly enough that a first-time visitor can answer the following questions within a short visit:

1. What is Veyvio?
2. Who is it designed for?
3. What operational problems does it solve?
4. How is it different from a basic booking or fleet-management system?
5. Which parts of a transport organisation can use it?
6. Can the visitor trust Veyvio with operational and passenger information?
7. What should the visitor do next?

The homepage must not attempt to explain every feature in detail.

Its role is to provide a clear overview and guide visitors to the most relevant product, solution, industry, trust or conversion page.

---

# 2. Primary Homepage Goal

The main conversion goal is:

> **Book a Veyvio demonstration**

The homepage should direct qualified visitors towards a demonstration rather than immediately asking them to purchase software without understanding their organisation.

The demonstration journey should lead to:

1. Visitor selects **Book a demo**.
2. Visitor completes a short qualification form.
3. The lead is recorded.
4. A confirmation is shown and emailed.
5. The visitor is offered a calendar booking.
6. The Veyvio team receives the enquiry.
7. The organisation's needs are reviewed before the demonstration.
8. The demonstration is tailored to the organisation's service type and operational priorities.

---

# 3. Secondary Homepage Goals

The homepage should also allow visitors to:

* Explore the complete Veyvio platform.
* Understand the individual applications.
* Find a solution for their operational problem.
* Find information for their industry.
* Review security and data-isolation information.
* Learn how implementation works.
* Review licensing information.
* Contact Veyvio.
* Sign in to an existing account.
* Access support and system-status information.
* Read educational resources.

---

# 4. Primary Audiences

## 4.1 Community transport leadership

Typical concerns:

* Replacing paper and spreadsheets.
* Improving visibility.
* Managing limited staff and resources.
* Demonstrating responsible governance.
* Controlling vehicle and driver compliance.
* Supporting accessible passenger transport.
* Producing evidence for funders and authorities.

Primary route:

`Homepage → Community Transport → Platform → Book a Demo`

---

## 4.2 Operations managers and controllers

Typical concerns:

* Knowing what is happening today.
* Scheduling drivers and vehicles.
* Responding to delays and exceptions.
* Managing bookings, runs, trips and changes.
* Communicating with drivers.
* Preventing missed work.

Primary route:

`Homepage → Veyvio Command → Dispatch and Live Operations → Book a Demo`

---

## 4.3 Fleet and yard managers

Typical concerns:

* Finding vehicles.
* Recording bays and yard movements.
* Managing known damage.
* Vehicle readiness.
* VOR management.
* Inspections, maintenance and tyres.
* Equipment and key control.

Primary route:

`Homepage → Veyvio Yard → Vehicle Readiness → Book a Demo`

---

## 4.4 Compliance and safety managers

Typical concerns:

* Driver eligibility.
* Vehicle readiness.
* Evidence.
* Expiry management.
* Inspections.
* Defects.
* Incidents.
* Audit history.
* Controlled overrides.

Primary route:

`Homepage → Safety and Compliance → Trust Centre → Book a Demo`

---

## 4.5 Local authorities and contract commissioners

Typical concerns:

* Service visibility.
* Contract performance.
* Passenger safety.
* Safeguarding.
* Evidence.
* Provider accountability.
* Reliable reporting.
* Data protection.

Primary route:

`Homepage → Local Authorities → Reporting and Evidence → Contact Sales`

> **v2 addition:** this audience buys software through a formal procurement process, most commonly the UK Government's **Digital Marketplace / G-Cloud** framework (at least one direct competitor, CTX, is listed there today — see Part G). The homepage should route this audience toward a page that speaks the language of procurement (framework listing, data processing terms, accessibility statement, DPIA support) rather than only a sales demo form.

---

## 4.6 Drivers and frontline users

They may visit the homepage to:

* Understand the product their employer is introducing.
* Find the Driver application.
* Download the mobile application.
* Sign in.
* Access help.
* Review privacy information.

Primary route:

`Homepage → Sign In or Driver App → Help Centre`

---

## 4.7 Existing customers

They may need:

* Sign in.
* Support.
* Documentation.
* System status.
* Release notes.
* Training.
* Account or billing access.

Primary route:

`Homepage → Sign In / Support / Status`

---

# 5. Primary Message *(revised in v2 — differentiation grounded against Part A)*

## 5.1 Recommended positioning statement

> **One connected platform for safer, clearer transport operations.**

Supporting message:

> Veyvio brings bookings, drivers, vehicles, yard activity, maintenance and compliance together so passenger transport teams can see what is happening, act on what matters and operate with confidence.

**v2 note:** this statement is now specifically defensible per Part A.5 — the market has strong point solutions in scheduling (Lane 1/2) and strong point solutions in compliance (Lane 3), but no evidenced UK competitor connects both to a shared driver and yard workflow. Any copywriter or salesperson using this line should be able to answer "connected to *what*, exactly?" with: scheduling ↔ driver duty ↔ vehicle readiness ↔ compliance evidence, all reading from one data model.

## 5.2 Alternative headline for testing

> **Run your transport operation from one trusted system.**

Supporting message:

> Plan work, manage drivers and vehicles, control fleet readiness and keep every important action connected across your organisation.

## 5.3 Community-transport-led alternative

> **Transport technology built around people, safety and community.**

This alternative may be strong for a community transport landing page, but the main homepage should remain broad enough to support Veyvio's wider licensed platform strategy.

## 5.4 What not to claim *(new)*

Based on Part A, the homepage must **not** say or imply any of the following, even loosely, because they are not evidenced against the real market:

* That Veyvio is the *first* platform to combine scheduling and compliance (untrue — several Lane-1 vendors bundle both at enterprise scale; Veyvio's edge is UK community-transport fit and connected yard/driver workflows, not "first").
* That existing tools "can't" do compliance or "can't" do scheduling (both lanes clearly can — the gap is the *connection between them for this market segment*, not raw capability).
* Any specific claim of being faster, cheaper, or more accurate than a named or identifiable competitor without a commissioned, methodologically sound comparison.

---

# 6. Homepage Header

## 6.1 Utility bar

Optional slim utility bar:

* System status.
* Support.
* Contact.
* Existing customer sign-in.

This bar should only be used when it improves clarity. It should not overcrowd the header.

## 6.2 Main navigation

Recommended top-level navigation:

* Platform
* Solutions
* Industries
* Pricing
* Resources
* Company

Right-side actions:

* Sign in
* Book a demo

## 6.3 Header behaviour

Desktop:

* Header remains visible when the visitor scrolls.
* It reduces slightly in height after scrolling.
* The primary action remains visible.
* Dropdown menus open through click and keyboard activation.
* Hover may provide enhancement but cannot be the only interaction.

Mobile:

* Logo on the left.
* Menu control on the right.
* Book a demo remains easy to access.
* Menu opens as a full-height accessible navigation panel.
* Menu sections can expand and collapse.
* Sign in and Book a demo remain visually distinct.
* Focus must be trapped correctly while the menu is open.

---

# 7. Homepage Content Structure

## Section 1 — Hero

### Purpose

Immediately communicate:

* What Veyvio is.
* Who it is for.
* The main benefit.
* The primary next action.

### Recommended content

**Eyebrow:**

> Transport operations, connected.

**Headline:**

> One connected platform for safer, clearer transport operations.

**Supporting copy:**

> Bring bookings, drivers, vehicles, yard activity, maintenance and compliance together in one trusted system designed for passenger transport teams.

**Primary action:**

> Book a demo

**Secondary action:**

> Explore the platform

**Supporting trust line:**

> Built for community transport, accessible passenger services and professional fleet operations.

### Hero visual

The hero should display a genuine or representative Veyvio interface composition containing:

* Command live-operations view.
* Driver mobile application.
* Yard vehicle-readiness view.
* A visible connection between the applications.

The hero should not use a generic bus photograph as the main explanation of the product.

Transport photography may be used as supporting brand imagery, but the product itself must remain visible.

### Hero interaction

A restrained animated sequence may show:

1. A booking appearing in Command.
2. A duty being assigned.
3. The driver receiving the duty.
4. A vehicle-readiness check.
5. The duty moving to ready.

Animation must:

* Avoid distracting continuous movement.
* Pause when not visible.
* respect `prefers-reduced-motion`.
* include an alternative static presentation.
* not delay the main content.
* not cause layout shifts.

---

## Section 2 — Immediate Product Understanding

### Heading

> Everything your transport operation needs to stay connected.

### Purpose

Show that Veyvio is a platform rather than a single application.

### Application cards

#### Veyvio Command

> Plan work, manage live operations and respond to exceptions from one operational control centre.

Link:

`Explore Veyvio Command`

#### Veyvio Driver

> Give drivers a clear, guided workflow for duties, checks, communication and end-of-shift handback.

Link:

`Explore Veyvio Driver`

#### Veyvio Yard

> Know where vehicles are, what condition they are in and what work must happen next.

Link:

`Explore Veyvio Yard`

#### Veyvio Maintenance

> Connect defects, inspections, servicing, tyres, work orders and return-to-service decisions.

Link:

`Explore Veyvio Maintenance`

#### Customer Portal

> Give authorised customers controlled access to bookings, passengers, communication and service information.

Link:

`Explore the Customer Portal`

### Interaction

Desktop:

* Five cards displayed in a structured grid.
* Hover may reveal a small interface preview.
* Cards remain usable without hover.

Mobile:

* Cards display in a vertical list.
* Avoid horizontal swipe-only carousels for essential content.
* Each card must contain a clear link.

---

## Section 3 — The Operational Problem

### Heading

> Transport operations become difficult when information is spread everywhere.

### Problem statements

* Bookings held in separate systems.
* Driver information stored in spreadsheets.
* Vehicle checks kept on paper.
* Damage photographs sent through messaging applications.
* Maintenance records separated from vehicle operations.
* Controllers calling drivers to find out what is happening.
* Compliance evidence difficult to retrieve.
* Different teams working from different information.

### Resolution statement

> Veyvio connects these workflows without forcing every role to use the same complicated interface.

### Visual treatment

Use a before-and-after comparison:

**Before Veyvio**

* Paper.
* Spreadsheets.
* Messaging applications.
* Email.
* Disconnected systems.
* Unclear ownership.

**With Veyvio**

* Shared operational truth.
* Role-specific applications.
* Defined workflows.
* Real-time visibility.
* Controlled evidence.
* Complete audit history.

The comparison must not make unsupported claims such as guaranteed cost savings or regulatory compliance.

---

## Section 4 — How Veyvio Works

### Heading

> One platform. Clear responsibilities. Connected decisions.

### Four-step explanation

#### 1. Plan

Capture bookings, passengers, requirements, schedules and recurring work.

#### 2. Prepare

Confirm driver eligibility, vehicle readiness, depot location and required equipment.

#### 3. Operate

Publish duties, guide drivers, manage live exceptions and communicate changes.

#### 4. Prove

Record checks, decisions, evidence, incidents, maintenance and operational outcomes.

### Supporting principle

> Every important action remains connected to the company, person, vehicle, journey and reason behind it.

---

## Section 5 — Safety and Compliance

### Heading

> Safety should be built into the workflow, not added afterwards.

### Content

Veyvio should be presented as helping operators:

* Check driver eligibility before assignment.
* Check vehicle readiness before use.
* Block unsafe actions.
* Track expiries and required evidence.
* Record defects and damage.
* Manage VOR and return to service.
* Link training to role requirements.
* Preserve inspection and incident history.
* Record authorised overrides.
* Produce audit evidence.

### Important wording rule

Do not state:

> Veyvio makes your organisation legally compliant.

Use:

> Veyvio helps organisations manage their compliance responsibilities through configured rules, evidence, controlled workflows and audit history.

The operator remains responsible for determining and meeting the legal, contractual and operational requirements that apply to it.

### CTA

> Explore safety and compliance

Secondary link:

> Visit the Trust Centre

---

## Section 6 — Industry Routes

### Heading

> Designed for the realities of passenger transport.

### Industry cards

* Community Transport
* Dial-a-Ride
* Home-to-School Transport
* SEND Transport
* Local Authorities
* NHS and Healthcare Transport
* Charities and Community Organisations
* PSV and Contracted Passenger Transport

Each card should explain a genuine industry problem rather than changing only the heading.

Example:

**Community Transport**

> Connect bookings, passengers, volunteer or employed drivers, vehicles, compliance and community-service evidence.

**Home-to-School Transport**

> Manage routes, children, guardians, escorts, term dates, changes and safeguarding-sensitive information.

### CTA

> View all industries

---

## Section 7 — Role-Based Value

### Heading

> Give every team the information they need.

Tabs or accessible segmented controls may show:

* Operations
* Drivers
* Yard
* Maintenance
* Compliance
* Leadership
* Customers

Each selection changes:

* The problem statement.
* Relevant interface screenshot.
* Main capabilities.
* Appropriate product link.

The content must remain accessible when JavaScript is unavailable or should be rendered in the page source.

Tabs must use correct semantic roles and keyboard behaviour.

---

## Section 8 — Connected Fleet Readiness

### Heading

> Know whether a vehicle is truly ready for work.

### Readiness inputs

* Vehicle checks.
* MOT.
* Safety inspections.
* Servicing.
* Defects.
* VOR status.
* Tyres.
* Equipment.
* Known damage.
* Depot and bay.
* Assignment.
* Required approvals.

### Readiness output

The system should show:

* Ready.
* Ready with warning.
* Restricted.
* Not ready.
* Unknown because evidence is missing.

The website should explain that readiness is calculated from configured rules and evidence rather than manually asserted.

### CTA

> Explore vehicle readiness

---

## Section 9 — Multi-Company and Multi-Depot Trust *(revised in v2 — see Part C.2 for the underlying architecture)*

### Heading

> Keep each company's information properly separated.

### Content

Explain that Veyvio is designed for licensed use by multiple independent organisations.

Cover:

* Company data boundaries.
* Depot and resource permissions.
* Application scopes.
* Controlled support access.
* Separate branding and configuration.
* Shared platform services without mixed customer data.
* Related companies remaining isolated unless explicitly configured through an approved mechanism.

**v2 note:** this section is a *product promise*. The engineering commitment behind it — which tenancy model, how isolation is enforced, and what happens under connection pooling or a background job — is specified in Part C.2 and must be reflected accurately here. Nothing on this page should claim a stronger isolation guarantee (e.g. "physically separate databases for every customer") than what Part C.2 actually implements, since this is one of the few technical claims a security-conscious local-authority buyer will ask to see evidenced during procurement (Part G).

### CTA

> Learn about tenant isolation

This section is a key differentiator and must not be hidden only inside a security page.

---

## Section 10 — Offline and Mobile Operations

### Heading

> Keep frontline work moving when connectivity is unreliable.

### Content

* Driver and Yard workflows designed for mobile use.
* Checks and selected actions can be queued safely.
* Media uploads continue when connectivity returns.
* Pending actions remain visible.
* Server rules are rechecked on reconnection.
* Conflicts and rejected actions are shown clearly.
* The application never silently claims an action has synchronised when it has not.

### CTA

> Explore offline operations

---

## Section 11 — Implementation

### Heading

> Move from your current process without losing operational control.

### Steps

1. Discovery.
2. Workflow mapping.
3. Company and depot configuration.
4. Data preparation.
5. User and permission setup.
6. Training.
7. Controlled pilot.
8. Acceptance.
9. Operational launch.
10. Continuous improvement.

### Supporting copy

> Veyvio implementation is designed around the operator's actual services, responsibilities and risk controls—not simply around installing software.

### CTA

> See how implementation works

---

## Section 12 — Customer Evidence

This section must not contain invented customers, metrics, logos, endorsements or quotations.

Until genuine customer evidence exists, use:

### Heading

> Built with real transport operations in mind.

### Permitted content

* Product-development principles.
* Pilot programme information.
* Confirmed operational involvement.
* An explanation of how users participate in design and testing.
* Verified prototype or pilot milestones.
* A clear invitation to become a design or pilot partner.

### CTA

> Explore the pilot programme

Once genuine evidence exists, this section may include:

* Approved customer logos.
* Case studies.
* Verified outcomes.
* Attributed testimonials.
* Measured before-and-after results.
* Scope and limitations of the evidence.

---

## Section 13 — Resources

### Heading

> Practical guidance for safer transport operations.

Featured resources may include:

* Moving from paper vehicle checks.
* Building a vehicle-damage workflow.
* Preparing for transport software implementation.
* Managing driver and vehicle readiness.
* Improving end-of-shift vehicle handback.
* Understanding operational audit evidence.

### CTA

> Visit the Resource Centre

Content must be useful and educational rather than written only to capture search traffic.

---

## Section 14 — Final Conversion

### Heading

> See how Veyvio could work for your organisation.

### Supporting copy

> Tell us about your services, fleet and current operational challenges. We will tailor the demonstration around the workflows that matter to your team.

### Primary CTA

> Book a demo

### Secondary CTA

> Contact Veyvio

### Supporting expectations

* No obligation.
* Demonstration tailored to the organisation.
* Clear explanation of suitable modules.
* Honest discussion of implementation requirements.
* No unsupported promise that every feature is currently available.

---

## Section 15 — Footer

### Platform

* Platform Overview
* Veyvio Command
* Veyvio Driver
* Veyvio Yard
* Veyvio Maintenance
* Customer Portal
* Integrations
* Mobile Applications

### Solutions

* Transport Operations
* Fleet Safety and Compliance
* Vehicle Readiness
* Workforce Readiness
* Multi-Depot Operations
* Accessible Transport
* Audit and Evidence

### Industries

* Community Transport
* Dial-a-Ride
* School Transport
* SEND Transport
* Local Authorities
* Healthcare Transport
* PSV Operators

### Resources

* Resource Centre
* Guides
* Templates
* Insights
* Glossary
* FAQs
* Release Notes
* Help Centre

### Company

* About
* Mission
* Partners
* Careers
* Contact
* Customer Success

### Trust and legal

* Trust Centre
* Security
* Tenant Isolation
* Privacy Notice
* Cookie Notice
* Accessibility
* Website Terms
* Vulnerability Disclosure
* System Status

### Footer controls

* Cookie preferences.
* Language selector when internationalisation exists.
* Social links only for active official accounts.
* Copyright statement.
* Company legal name and registration information once confirmed.
* Registered office details where legally required and appropriate.
* Contact information.

---

# 8. Homepage Responsive Behaviour

## 8.1 Mobile priorities

Mobile must not be treated as a reduced desktop page.

The mobile homepage should prioritise:

1. Clear headline.
2. Concise explanation.
3. Book a demo.
4. Platform overview.
5. Safety and trust.
6. Relevant industry routes.
7. Sign in and support.

## 8.2 Mobile changes

* Hero copy should remain concise.
* Product visual should use one clear mobile-friendly composition.
* Dense comparison tables become cards.
* Tabs become accessible accordions when appropriate.
* Images use responsive sources.
* Videos do not autoplay with sound.
* Primary controls remain easy to reach.
* No content should require horizontal page scrolling.
* Important information must not exist only in hover states.
* Forms use appropriate input modes and autocomplete attributes.

## 8.3 Tablet behaviour

* Two-column card structures may replace desktop four-column grids.
* Navigation may use the mobile menu depending on available width.
* Interface visuals should remain legible rather than being scaled down excessively.

## 8.4 Desktop behaviour

* Maximum readable content width.
* Wider product compositions.
* Sticky navigation.
* Controlled use of animation.
* Clear section rhythm.
* No unnecessary full-screen sections that slow scanning.

---

# 9. Visual Direction

## 9.1 Brand colours

Primary palette:

* Deep teal: `#173E48`
* Veyvio teal: `#4A8FA3`
* Lime: `#7AB82E`
* Supporting green: `#8EC63F`
* Black: `#000000`
* White: `#FFFFFF`
* Accessible neutral greys

## 9.2 Visual personality

The homepage should feel:

* Professional.
* Trustworthy.
* Operationally intelligent.
* Community-aware.
* Safe.
* Modern.
* Clear.
* Human.
* Practical.

It should not feel:

* Like a taxi-booking application.
* Like a generic technology start-up.
* Overly futuristic.
* Overloaded with animations.
* Cold or disconnected from passengers.
* Like a maintenance-only fleet product.
* Like software intended for only one company.

## 9.3 Photography

Use authentic imagery showing:

* Passenger transport operations.
* Accessible vehicles.
* Drivers assisting passengers appropriately.
* Yard and depot activity.
* Operational teams.
* Community transport contexts.
* A diverse range of users and passengers.

Avoid:

* Generic luxury coaches unless relevant.
* Images that misrepresent services.
* Unsafe working practices.
* Staged scenes that undermine credibility.
* Unlicensed or AI-generated imagery presented as a real customer operation.

## 9.4 Product imagery

Every product screenshot must:

* Use realistic but non-sensitive data.
* Avoid real passenger information.
* Show the current interface accurately.
* Use consistent dates, names and states.
* Be reviewed after major product changes.
* Include descriptive alternative text where the image conveys useful information.

---

# 10. Homepage Content Rules

The homepage must not:

* Claim Veyvio guarantees legal compliance.
* Claim artificial intelligence capabilities that are not operational.
* Display customer logos without permission.
* Display fake testimonials.
* Display fabricated statistics.
* claim app-store availability before release.
* Claim integrations that are not available or contractually confirmed.
* Describe prototype features as fully released.
* Use security claims that cannot be evidenced.
* Promise uptime without an approved service commitment.
* Use environmental or net-zero claims without evidence.
* Use hidden text or unsupported structured data for search manipulation.

Every material product claim should be classified internally as:

* Available.
* Pilot.
* In development.
* Planned.
* Exploratory.

Only appropriate classifications should appear publicly.

> **v2 note:** Part E turns this rule into a working register (claim → classification → owner → evidence → review date) so it can actually be audited rather than relying on memory during content review.

---

# 11. Search Engine Optimisation

## 11.1 Recommended title tag

> Veyvio | Connected Transport Management Platform

Alternative:

> Veyvio Transport Management Software | Driver, Fleet, Yard and Compliance

The final title should be tested for relevance and not overloaded with keywords.

## 11.2 Recommended meta description

> Connect bookings, drivers, vehicles, yard operations, maintenance and compliance with Veyvio—one trusted platform for passenger transport teams.

## 11.3 Primary search themes

* Transport management software.
* Community transport software.
* Passenger transport management system.
* Fleet compliance software.
* Driver and vehicle management.
* School transport management software.
* Dial-a-Ride software.
* Yard management for passenger fleets.
* Accessible transport software.
* PSV fleet management.

The homepage should not attempt to rank equally for every specialist subject. Detailed industry and capability pages should own the more specific search themes.

## 11.4 Heading structure

One primary `H1`:

> One connected platform for safer, clearer transport operations.

Primary page sections use `H2`.

Cards and subsections use `H3`.

Heading levels must follow a meaningful hierarchy rather than being selected for visual size.

## 11.5 Canonical URL

The homepage should declare one canonical production URL.

Example:

`https://veyvio.com/`

Redirect consistently between:

* HTTP and HTTPS.
* `www` and non-`www`.
* Trailing-slash variations.
* Legacy domains.
* Old product names.

## 11.6 Indexing

The production homepage should:

* Return a successful HTTP status.
* Be crawlable.
* Be included in the XML sitemap.
* Not contain `noindex`.
* Use a self-referencing canonical.
* render essential text in accessible HTML.
* Avoid requiring login or JavaScript-only interaction to understand the page.

Preview, staging and demonstration environments must be blocked from indexing.

---

# 12. Structured Data

Google states that structured data helps it understand page content, and it supports organisation structured data on a homepage to provide administrative details and help distinguish an organisation. Google also requires structured data to follow its technical and content guidelines.

## 12.1 Required homepage schema

Use JSON-LD for:

* `Organization`
* `WebSite`
* `WebPage`

## 12.2 Organisation fields

Only include confirmed public information:

* `@type`
* `name`
* `legalName`, once confirmed.
* `url`
* `logo`
* `description`
* `foundingDate`, if confirmed and appropriate.
* `address`, if publicly used.
* `contactPoint`
* `sameAs` for official active profiles.
* `email`, if publicly offered.
* `telephone`, if publicly offered.

Do not add:

* Unconfirmed awards.
* Fake reviews.
* Unsupported ratings.
* Unconfirmed office locations.
* Social profiles Veyvio does not control.
* Customer counts that are not published visibly.
* Founder or employee details not shown publicly.

## 12.3 Software schema

`SoftwareApplication` or another software-related schema should only be added when the page visibly provides the information required by the relevant schema and Google guidelines.

Google's software application guidance requires the relevant properties and recommends validating the output with its Rich Results Test.

The homepage should not include false:

* Pricing.
* Ratings.
* Reviews.
* Operating-system support.
* Application category.
* Download links.

## 12.4 Example JSON-LD structure

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://veyvio.com/#organization",
      "name": "Veyvio",
      "url": "https://veyvio.com/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://veyvio.com/assets/veyvio-logo.png"
      },
      "description": "A connected transport management platform for passenger transport operations."
    },
    {
      "@type": "WebSite",
      "@id": "https://veyvio.com/#website",
      "url": "https://veyvio.com/",
      "name": "Veyvio",
      "publisher": {
        "@id": "https://veyvio.com/#organization"
      }
    },
    {
      "@type": "WebPage",
      "@id": "https://veyvio.com/#homepage",
      "url": "https://veyvio.com/",
      "name": "Veyvio | Connected Transport Management Platform",
      "isPartOf": {
        "@id": "https://veyvio.com/#website"
      },
      "about": {
        "@id": "https://veyvio.com/#organization"
      }
    }
  ]
}
</script>
```

This example must be updated with the final domain, legal identity, logo URL and confirmed public information.

## 12.5 Structured-data release process

1. Confirm that every marked-up statement appears visibly or is legitimately associated with the page.
2. Generate JSON-LD from controlled site data.
3. Validate syntax.
4. Run Google's Rich Results Test.
5. Test the live URL using Search Console URL Inspection.
6. Check for warnings and errors.
7. Monitor Search Console after release.
8. Re-test after material content or template changes.

Structured data must not be managed entirely through an uncontrolled marketing tag without engineering review.

---

# 13. Accessibility Requirements *(revised in v2 — WCAG 2.2 criteria made explicit)*

The homepage target should be **WCAG 2.2 Level AA**. WCAG organises accessibility under four principles: content must be perceivable, operable, understandable and robust.

## 13.0 What's new in WCAG 2.2 versus 2.1 *(new)*

WCAG 2.2 became an official W3C standard in October 2023<cite index="28-1">, adding nine new success criteria on top of WCAG 2.1 and removing one (4.1.1 Parsing, now considered obsolete because modern browsers and assistive technology no longer depend on it)</cite>. The homepage build should explicitly test against all nine, since they target exactly the kind of barriers (cognitive, motor, low-vision) that a compliance-minded, multi-role B2B site like Veyvio's is likely to hit:

1. **2.4.11 Focus Not Obscured (Minimum)** — a focused element (e.g. a form field behind a sticky header) must not be completely hidden.
2. **2.4.12 Focus Not Obscured (Enhanced)** — AAA-level extension of the above; not required for AA but worth checking around the sticky header (§6.3).
3. **2.4.13 Focus Appearance** — focus indicators must meet a minimum size and contrast (relevant to §6.3's "visible focus indicators" requirement).
4. **2.5.7 Dragging Movements** — any drag interaction (none currently planned on the homepage, but relevant if Section 7's tabs are ever built as a swipe/drag control) must have a single-pointer alternative.
5. **2.5.8 Target Size (Minimum)** — interactive targets must be at least 24×24 CSS pixels unless spaced or otherwise exempt. Directly affects the mobile header's menu control, card links (§7 Section 2) and footer links.
6. **3.2.6 Consistent Help** — if a help/contact mechanism appears in the header or footer, it must appear in the same relative order on every page, not just the homepage.
7. **3.3.7 Redundant Entry** — the demo qualification form (§2) must not ask the visitor to re-enter information already provided earlier in the same process (e.g. company name repeated between the form and a calendar-booking step).
8. **3.3.8 Accessible Authentication (Minimum)** — the "Sign in" flow (out of scope for the homepage itself, but linked from it) must not rely on a cognitive function test (e.g. remembering a password with no paste/password-manager support) without an alternative.
9. **3.3.9 Accessible Authentication (Enhanced)** — AAA-level; note for the product team, not required for the homepage.

**Regulatory context:** the underlying European standard behind the EU/UK accessibility regulations, EN 301 549, has referenced WCAG 2.1 to date; <cite index="28-1">an update to reference WCAG 2.2 is expected via ETSI in early 2026</cite>. Building to 2.2 now is forward compatible with that shift and is good practice regardless of the exact date the formal reference updates.

## 13.1 Required controls

* Skip-to-content link.
* Semantic header, navigation, main and footer landmarks.
* Correct heading order.
* Keyboard-accessible navigation.
* Visible focus indicators.
* Accessible menu states.
* Meaningful link and button labels.
* Alternative text for informative images.
* Empty alternative text for decorative images.
* Captions and transcripts for meaningful video.
* Form labels and instructions.
* Clear validation messages.
* Error summary for submitted forms.
* Sufficient colour contrast.
* No information conveyed by colour alone.
* Zoom and reflow support.
* Reduced-motion support.
* Accessible accordions, tabs and dialogs.
* No keyboard traps.
* Adequate target sizes (24×24px minimum per WCAG 2.2 §2.5.8 — see 13.0).
* Consistent help and navigation.
* Accessible authentication where login links are provided.

## 13.2 Motion

Automatically moving, blinking or scrolling content can create distraction and accessibility barriers. Users must be able to pause or avoid non-essential motion, and reduced-motion preferences should be respected.

## 13.3 Accessibility and performance are related, not identical *(new)*

Accessibility and Core Web Vitals (§14) are separate disciplines that reinforce each other but must each be tested on their own terms: <cite index="32-1">passing Core Web Vitals does not guarantee accessibility, and passing WCAG is not a sign of good web performance — the two need separate, detailed attention.</cite> Concretely for this homepage: a slow, janky hero animation can simultaneously fail INP (§14.1) *and* create a barrier for a visitor using a switch device or a screen reader, because <cite index="32-1">assistive technology performance depends on browser responsiveness</cite>. Treat this as one reason (of several) the hero animation (§7 Section 1) must be lightweight, not just a nice-to-have for SEO.

## 13.4 Accessibility testing

Before release:

* Automated accessibility scan.
* Keyboard-only review.
* Screen-reader review.
* Browser zoom and reflow review.
* Mobile assistive-technology review.
* Colour and contrast review.
* Form-error review.
* Reduced-motion review.
* Manual WCAG acceptance checklist, including the nine WCAG 2.2 criteria listed in 13.0.

An automated score alone does not constitute accessibility acceptance.

---

# 14. Performance Requirements

Google's current Core Web Vitals are:

* Largest Contentful Paint.
* Interaction to Next Paint.
* Cumulative Layout Shift.

## 14.1 Homepage performance targets

At the 75th percentile of real-user visits:

* LCP: 2.5 seconds or better.
* INP: 200 milliseconds or better.
* CLS: 0.1 or better.

These are the commonly defined "good" Core Web Vitals thresholds<cite index="30-1">, measured at the 75th percentile of real users over a rolling window rather than from a single lab test</cite>, and should be measured using field data as traffic becomes available. INP fully replaced First Input Delay as the responsiveness metric in March 2024, so any legacy guidance still referencing FID is out of date — the homepage build should be tested against INP directly rather than FID from the outset.

## 14.2 Supporting budgets

Initial engineering budgets:

* Minimal critical JavaScript.
* No large autoplay hero video by default.
* Responsive next-generation images.
* Preload only the true critical hero asset.
* Reserve media dimensions to prevent layout movement.
* Lazy-load below-the-fold media.
* Self-host or carefully control fonts.
* Avoid unnecessary third-party scripts.
* Defer CRM, chat and analytics scripts where possible.
* Cache public assets through a CDN.
* Use static generation or server rendering for public content.
* Keep interactive components isolated rather than hydrating the entire page unnecessarily.

## 14.3 Measurement

Use:

* Real-user monitoring.
* PageSpeed Insights.
* Chrome UX Report when available.
* Lighthouse for development diagnostics.
* Browser performance traces.
* Deployment performance checks.

Laboratory scores are useful for diagnosing issues but should not be treated as the only measure of user experience.

---

# 15. Analytics and Measurement

## 15.1 Core homepage events

Track:

* Homepage viewed.
* Primary demo CTA selected.
* Secondary platform CTA selected.
* Navigation item selected.
* Application card selected.
* Industry selected.
* Solution selected.
* Trust Centre selected.
* Sign-in selected.
* Contact selected.
* Resource selected.
* Demo form started.
* Demo form completed.
* Demo form abandoned.
* Calendar booking started.
* Calendar booking completed.
* Form validation error.
* Outbound app-store link selected.
* Support link selected.

## 15.2 Event properties

Where lawful and necessary:

* Page.
* Section.
* CTA label.
* CTA position.
* Device category.
* Referrer category.
* Campaign identifiers.
* Landing-page variant.
* Consent status.
* Organisation type entered in the form.
* Fleet-size range entered in the form.

Do not send:

* Passenger information.
* Health or safeguarding information.
* Free-text support content.
* Passwords.
* Authentication tokens.
* Full form contents.
* Unnecessary personal identifiers.
* Sensitive data in URLs.

## 15.3 Success measures

Primary:

* Qualified demo submissions.
* Completed calendar bookings.
* Demo-to-opportunity rate.
* Opportunity-to-pilot rate.

Secondary:

* Platform-page engagement.
* Industry-page progression.
* Trust-page engagement.
* Resource engagement.
* Returning visitors.
* Organic discovery.
* Contact submissions.
* Support and sign-in task completion.

Avoid optimising only for:

* Page views.
* Time on page.
* Scroll depth.
* Raw form volume.

A small number of qualified operator enquiries is more valuable than large volumes of irrelevant traffic.

---

# 16. Backend and CMS Requirements

## 16.1 CMS-managed content

The CMS should manage:

* Hero copy.
* Application summaries.
* Industry cards.
* Solution cards.
* Resource cards.
* Trust messages.
* Customer evidence.
* Calls to action.
* Metadata.
* Social-preview image.
* Structured organisation data.
* Footer links.
* Banner announcements.
* Feature availability labels.

## 16.2 Controlled fields

Some content must require approval:

* Security claims.
* Compliance claims.
* Pricing.
* Availability.
* Integration claims.
* Customer logos.
* Testimonials.
* Statistics.
* Environmental claims.
* Legal-company information.
* Structured data.

## 16.3 Form integration

Demo and contact forms should connect to:

* CRM.
* Email confirmation service.
* Internal lead notification.
* Calendar scheduling.
* Consent record.
* Spam and abuse protection.
* Source attribution.
* Lead-routing logic.
* Audit log.

## 16.4 Form security

Requirements:

* Server-side validation.
* Rate limiting.
* Spam detection.
* Bot protection.
* CSRF protection where applicable.
* Sanitisation.
* Secure transport.
* No personal information in URLs.
* Controlled file uploads when later supported.
* Clear retention policy.
* Error handling without technical leakage.
* Duplicate submission handling.

## 16.5 Publishing workflow

Recommended states:

1. Draft.
2. Content review.
3. Product review.
4. Security or legal review when required.
5. Accessibility review.
6. Approved.
7. Scheduled.
8. Published.
9. Archived.

Material homepage changes should create a version history and rollback point.

---

# 17. Technical Delivery

## 17.1 Rendering

The homepage should use static generation or server rendering so that:

* Core content is immediately available.
* Search engines receive meaningful HTML.
* Performance is strong.
* JavaScript failure does not remove the main message.
* Social previews and metadata are reliable.

## 17.2 Component requirements

Recommended homepage components:

* SiteHeader
* MegaNavigation
* MobileNavigation
* Hero
* ProductEcosystem
* ProblemComparison
* HowItWorks
* SafetyCompliance
* IndustryGrid
* RoleTabs
* VehicleReadiness
* TenantIsolation
* OfflineOperations
* ImplementationSteps
* EvidenceOrPilot
* FeaturedResources
* FinalCTA
* SiteFooter
* CookiePreferences
* AnnouncementBanner
* FormModal, only when justified

## 17.3 Feature flags

Feature flags may control:

* Unreleased product cards.
* Pilot messaging.
* Customer-evidence sections.
* Pricing display.
* App-store links.
* New navigation groups.
* Campaign-specific hero variants.

Feature flags must be server-controlled and must not expose unfinished claims through page source or metadata.

---

# 18. Homepage States

The design must define:

## Normal state

All primary content and services available.

## Slow connection

* Text loads before non-essential media.
* Static hero visual shown.
* No blank content areas.
* Forms remain usable.

## JavaScript unavailable

* Navigation remains usable.
* Main content remains readable.
* Standard page links work.
* Essential structured information remains present.

## CMS failure

* Last successfully published version remains available.
* Homepage does not become blank.
* Monitoring alerts the responsible team.

## CRM or form-service failure

* Submission is either securely queued or clearly rejected.
* Visitor receives an honest message.
* No false success confirmation.
* Alternative contact route is offered where appropriate.

## Scheduled maintenance

* Public marketing site should remain available where possible.
* Product status is communicated separately through the status service.

## Unreleased product capability

* Remove the claim.
* Mark it clearly as planned or pilot only when approved.
* Do not hide it visually while leaving misleading metadata or structured data.

---

# 19. Homepage Acceptance Criteria

The homepage is not complete until all applicable criteria below pass.

## Content

* The first screen clearly explains what Veyvio is.
* The target customer can recognise that the platform is relevant.
* The distinction between Command, Driver, Yard and Maintenance is clear.
* Claims reflect actual or properly classified capability.
* No invented proof, statistics or testimonials appear.
* Terminology matches the Veyvio product blueprint.
* Calls to action are clear and consistent.
* No claim appears that Part A.5/5.4 identifies as unsupported against the real market. *(v2 addition)*

## Navigation

* Every navigation item leads to an approved destination.
* Keyboard users can operate the full menu.
* Mobile navigation works at supported widths.
* Sign in and Book a demo remain easy to find.
* There are no dead links.
* Every link referenced in §15 (Footer) resolves to a page defined in Part F's information architecture, or is explicitly marked "post-launch." *(v2 addition)*

## Conversion

* Demo form submits successfully.
* Duplicate submissions are handled.
* Confirmation email is sent.
* CRM lead is created.
* Lead source is captured.
* Internal notification is delivered.
* Calendar booking works.
* Failure states are visible and accurate.

## Search

* Unique title and description are present.
* Canonical URL is correct.
* Robots directives are correct.
* Homepage is included in the sitemap.
* Essential content is rendered in HTML.
* Organisation structured data matches visible and confirmed information.
* Structured data passes validation.
* Staging environments are not indexed.
* Social metadata is correct.

## Accessibility

* WCAG 2.2 AA acceptance review completed, including all nine 2.2-specific success criteria in §13.0. *(v2 addition)*
* Keyboard navigation completed.
* Focus order is logical.
* Focus is visible and meets the 2.4.13 minimum area/contrast. *(v2 addition)*
* Images have appropriate alternative text.
* Forms have labels and helpful errors, and do not request redundant entry (§13.0, criterion 7). *(v2 addition)*
* Contrast passes.
* Reduced-motion preference is supported.
* Mobile menu and interactive components work with assistive technology.
* All interactive targets meet the 24×24px minimum (§13.0, criterion 5). *(v2 addition)*
* No major automated or manual accessibility failures remain.

## Performance

* Core Web Vitals targets are met in pre-release testing and monitored after launch.
* Hero media does not block the main content unnecessarily.
* Images are responsive and dimensioned.
* No significant unexpected layout movement.
* Third-party scripts are reviewed and controlled.
* Performance budgets run in CI or the release process.

## Security and privacy

* Forms use server-side validation.
* Spam and rate-limit protection exists.
* No secrets appear in the client.
* Analytics respects consent requirements.
* No sensitive information appears in analytics or URLs.
* Security headers are configured.
* Dependencies are reviewed.
* Privacy and cookie links are present.
* Content Security Policy is tested.
* Tenant-isolation claims on the page match the implemented isolation model in Part C.2. *(v2 addition)*

## Operational readiness

* Monitoring exists.
* Error logging exists.
* Form-delivery monitoring exists.
* Rollback is tested.
* CMS publishing roles are configured.
* Named content owner exists.
* Named technical owner exists.
* Legal and privacy content is approved.
* Support route is operational.

---

# 20. Homepage Definition of Done

The Veyvio homepage reaches **Complete** only when it is:

* Designed.
* Content-approved.
* Implemented.
* Integrated.
* Accessibility-tested.
* Security-reviewed.
* Search-reviewed.
* Performance-tested.
* Deployed.
* Verified on real mobile and desktop devices.
* Connected to the CRM and scheduling workflow.
* Monitored.
* Accepted by the product and commercial owner.

A visually finished homepage without working lead handling, accessibility, accurate claims, structured metadata, monitoring and real-device verification is not considered complete.

---

# 21. Open Homepage Decisions *(revised in v2 — decision log with recommendations)*

The following decisions remain open. Each now carries a recommended default so implementation is not blocked while the formal decision is pending — the recommendation should be actively overridden by the named owner, not silently accepted by omission.

| # | Decision | v2 recommended default | Rationale | Suggested owner |
|---|---|---|---|---|
| 1 | Final Veyvio legal company identity | Block on this — cannot be defaulted | Required for `Organization` schema (§12.2), footer legal text, contracts | Founder/Legal |
| 2 | Confirmed production domain | Proceed with `veyvio.com` as used throughout this document | Already used consistently; low switching risk if confirmed early | Founder |
| 3 | Community transport vs. broader passenger transport lead | Lead broad (current §5.1 statement), with a dedicated community-transport landing page for that audience's paid/organic entry points | Part A shows Lane 2 (community transport) is the most differentiated *and* least sophisticated web presence — a dedicated landing page captures that without narrowing the flagship homepage's addressable market | Product/Marketing |
| 4 | Final licence and pricing approach | Do not publish list pricing at launch; publish a pricing *page* explaining tiers/factors without numbers, consistent with most Lane 1/2 competitors, several of which are also "contact sales" or custom-priced | Matches market norm (Trapeze is custom-priced; only CTX publishes a flat monthly figure) and avoids premature commitment before packaging is finalised | Commercial lead |
| 5 | Public pilot programme | Offer it (§Section 12) until real customer evidence exists | Directly required by §10's "no fabricated evidence" rule — the pilot programme is the honest interim content | Product/Marketing |
| 6 | Modules publicly available at launch | Mark accurately per the Available/Pilot/In development/Planned/Exploratory taxonomy in §10, reviewed against Part E's claims register before every release | Prevents the exact overclaiming risk §10 exists to stop | Product |
| 7 | Mobile applications available at launch | If Driver app is not yet on app stores, do not show app-store badges (§10 explicit rule); use "Available on iOS and Android" only once true | Direct rule violation risk otherwise | Engineering/Product |
| 8 | Confirmed integrations | List none publicly until contractually/technically confirmed; keep an internal integrations roadmap separate from the public Integrations page | §10 explicit rule | Product |
| 9 | Approved public security statements | Draft from Part C (tenant isolation architecture) once implemented, reviewed by whoever owns security before publishing | Statement must not overstate actual isolation model | Security/Engineering |
| 10 | Approved data-hosting statement | Confirm hosting region (UK/EU) early — local-authority buyers in Part G will ask during procurement | Directly affects UK GDPR data-residency answers | Engineering |
| 11 | Customer evidence available for publication | None at present — use §Section 12 pilot-programme content | — | Marketing |
| 12 | CRM and calendar provider | No default recommended — depends on sales team's existing tooling | Affects §16.3 integration work | Commercial/RevOps |
| 13 | CMS and website technology stack | Recommend a framework supporting static generation/SSR (§17.1) with structured content modelling for the CMS-managed fields in §16.1 | Matches the technical delivery requirements already specified | Engineering |
| 14 | Official sales and support contact details | Block on this | Needed for `contactPoint` schema, footer, forms | Commercial/Support |
| 15 | Final application screenshots | Block hero (§7 Section 1) build on having at least Command, Driver and Yard screens in a stable enough state to photograph | §9.4 requires screenshots reflect the current interface accurately | Product/Design |
| 16 | Homepage hero: video, static composition, or interactive demo | Recommend static composition with the restrained animated sequence in §7 Section 1 for v1 launch; revisit interactive demo post-launch once performance budget (§14) headroom is proven in production | Lowest performance/accessibility risk for a first release | Design/Engineering |
| 17 | Final analytics and consent platform | No default recommended — depends on existing tooling and UK/EU consent requirements | Affects §15 event tracking build | Engineering/Legal |
| 18 | Final website launch date and launch verdict | Sequence after Part H's Definition of Ready is met | Prevents a date-driven launch overriding readiness | Product/Commercial |

---

# PART C — Technical Architecture Addendum *(new)*

## C.1 System context

The homepage does not exist in isolation — it is the front door to a lead pipeline and, later, a customer-facing marketing site network. At minimum the following systems interact with it:

```
Visitor (browser)
   │
   ▼
Public website (static/SSR) ──► CDN / edge cache
   │  demo form submit
   ▼
Website backend (form API) ──► Spam/bot check ──► CRM (lead created)
   │                                             ──► Email service (confirmation)
   │                                             ──► Calendar scheduling
   │                                             ──► Internal notification (Slack/email)
   │
   ▼
Audit log (who submitted what, when, consent state)
```

None of this requires the Veyvio *product* (Command/Driver/Yard/Maintenance) itself — the homepage's only product-facing dependency is Sign In, which should link out to the actual application's authentication domain rather than replicate login on the marketing site.

## C.2 Tenant isolation — from marketing claim to engineering decision

Section 9 promises visitors that "each company's information [is] properly separated." That promise is made about the *product*, not the marketing site, but the homepage and Trust Centre are where it gets tested by a technical buyer. Current (2026) practice for B2B SaaS multi-tenancy converges on three patterns, in increasing order of isolation strength and operational cost:

| Pattern | Isolation strength | Operational cost | Fit for Veyvio |
|---|---|---|---|
| **Pooled** — shared database and schema, every table carries a `tenant_id`, isolation enforced by row-level security (RLS) and/or middleware | Weakest of the three; a single missed filter can leak rows | Lowest; easiest to back up, migrate and scale | Reasonable default for early-stage Veyvio, **provided RLS is enforced at the database layer, not only in application code** |
| **Bridge / schema-per-tenant** — shared database, one Postgres schema per tenant | Stronger logical isolation; simpler per-tenant backup/export and right-to-erasure | Schema migrations must be applied per tenant; connection pooling gets more complex at scale | Worth offering to larger local-authority or enterprise fleet customers who explicitly require it during procurement (Part G) |
| **Silo / database-per-tenant** | Strongest; a full blast-radius boundary | Highest; meaningful DevOps overhead once tenant count grows | Reserve for regulated or contractually mandated cases, not the default |

For Postgres-based pooled multi-tenancy specifically, current guidance is consistent across independent sources: <cite index="39-1">a shared schema with row-level security, where every row carries a tenant_id column and PostgreSQL RLS policies enforce isolation at the database driver level, is the most cost-effective isolation model for most SaaS products and is best suited to early-stage products with no compliance requirements beyond SOC 2-equivalent controls.</cite> The security-relevant implementation details that the engineering team must get right — because they are the actual difference between "we say we isolate tenants" and "we do" — are:

- **Force RLS, don't just enable it.** <cite index="38-1">Table owners bypass row-level security by default, so `FORCE ROW LEVEL SECURITY` matters; the request-serving database role must not hold the bypass privilege that a migration role is allowed to keep.</cite>
- **Tenant context must not leak across pooled connections.** <cite index="38-1">With a connection pooler such as PgBouncer, connections are reused, so tenant context must not persist between requests; if the tenant-identifying setting is missing, policies must fail closed (return no rows), never fail open.</cite>
- **Every query must filter by tenant, with no exceptions**, and this should be enforced as a checklist item in code review and CI, not left to developer discipline alone — current implementation guides recommend explicit checks that <cite index="43-1">all queries include an explicit tenant_id filter, RLS policies are enabled on all tenant tables, the application's database user has no superuser privileges, composite indexes exist on (tenant_id, primary_key) for all major tables, and tenant context is validated against auth-token claims on every request.</cite>
- **Background jobs and admin/support tooling are the most common real-world leak point** — a scheduled job or a support engineer's internal tool that queries "all vehicles due an MOT" across the whole database, rather than scoped per tenant, defeats RLS if it runs with an elevated role. §9's "controlled support access" bullet in the homepage copy corresponds directly to this engineering control and should not be published until it is actually implemented and tested.

**Recommendation for the public Trust Centre copy:** describe the *guarantee* (each company's data is logically separated and access-controlled; a company cannot see another company's bookings, passengers, vehicles or compliance records without an explicit, audited configuration) rather than the *mechanism* (RLS, connection pooling, etc.). The mechanism belongs in a security whitepaper made available under NDA or to verified procurement contacts, not on the public page — publishing implementation detail publicly does not build more trust and does slightly increase attack-surface information available to a bad actor.

## C.3 Integration inventory *(new — makes §16.3/§17 concrete)*

| Integration | Purpose | Data shared | Notes |
|---|---|---|---|
| CRM (provider TBD — Open Decision #12) | Lead capture, pipeline, sales follow-up | Name, organisation, role, contact details, service type, fleet size, consent status | No passenger, safeguarding or free-text support content per §15.2 |
| Email confirmation service | Demo confirmation, transactional email | Contact email, submission reference | Must not embed personal data in tracking links |
| Calendar scheduling | Demo booking slot selection | Contact details, chosen slot | Consider a UK/EU-hosted provider if data residency is a stated requirement (Open Decision #10) |
| Consent/cookie management platform | Record and enforce consent choices | Consent state, timestamp, IP (where lawful) | Feeds analytics gating (§15) |
| Spam/bot protection | Form abuse prevention | Behavioural signals, no PII beyond what's already submitted | Should not require a visible CAPTCHA if a lower-friction alternative meets bot-protection needs, for accessibility (§13) |
| CDN | Asset delivery, edge caching | No personal data | Also enforces `noindex` exclusion for previews (§11.6) |
| Search Console / analytics | SEO and usage monitoring | Aggregated, consent-gated | Per §15.2 restrictions |
| Status page service | System status display in utility bar (§6.1) | Product status only, no customer data | Independent of CMS uptime (§18) |

## C.4 Environments

Minimum environment set implied by §11.6 ("preview, staging and demonstration environments must be blocked from indexing") and §16.5 (publishing workflow):

- **Production** — `veyvio.com`, indexed, monitored, the only environment structured data should describe.
- **Staging** — pre-production content review, `noindex`, access-restricted (e.g. basic auth or IP allowlist), used for Section 5 (Product/Security/Accessibility review) of the publishing workflow.
- **Preview/Draft links** — per-change preview URLs for content review (§16.5 states 1–2), `noindex`, short-lived, ideally expiring automatically.
- **Local/development** — engineering only, never publicly reachable.

---

# PART D — Risk Register *(new)*

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Homepage overclaims a capability that isn't built yet (e.g. app-store availability, an integration, a compliance guarantee) | Medium | High — legal/regulatory exposure with local-authority buyers, reputational damage | Part E claims register; §10 rules; publishing workflow review gate (§16.5) | Product/Legal |
| Tenant-isolation copy (§9) overstates the actual isolation model implemented (Part C.2) | Medium | High — a security-conscious buyer's due diligence would surface the gap, and correcting it publicly after the fact is reputationally costly | Security review sign-off required before §9 copy changes (added to §19 checklist) | Security/Engineering |
| Homepage ranks poorly because it tries to own too many specific search themes (§11.3) instead of routing to dedicated pages | Medium | Medium — wasted SEO investment, diluted authority | §11.3 explicit rule already limits scope; enforce via content review | Marketing/SEO |
| Hero animation or interface composition (§7 Section 1) becomes the LCP/INP bottleneck | Medium-High | Medium — fails Core Web Vitals targets (§14), which both affects ranking and is evidence of the exact "connected but not overloaded" personality the brand wants (§9.2 visual direction) | Static-first fallback (Open Decision #16 recommendation), performance budget in CI (§14.2) | Engineering |
| Demo form lead pipeline (Part C.1) fails silently — form submits but CRM lead is never created | Low-Medium | High — direct loss of the homepage's primary conversion goal (§2) with no visibility | Form-delivery monitoring (§19 Operational readiness), duplicate/queued-state handling (§18 CRM or form-service failure) | Engineering |
| Accessibility regressions introduced after initial WCAG 2.2 sign-off, e.g. a later marketing campaign banner (§17.3 feature flags) breaks target size or focus order | Medium | Medium-High — legal exposure under the Equality Act 2010 / accessibility regulations, and directly undermines the "trustworthy" brand personality (§9.2) | Automated accessibility scan in CI, not just at initial launch; feature flags reviewed against §13 before enabling (§17.3) | Engineering/QA |
| Structured data (§12) drifts out of sync with visible page content after a content edit | Low-Medium | Medium — Rich Results eligibility lost, or worse, seen as manipulative | Re-test after material content changes (§12.5 step 8) enforced as a hard gate in the publishing workflow (§16.5), not a best-effort reminder | Engineering/SEO |
| Competitive positioning (§5, Part A) becomes stale as the market moves (new entrants, competitor feature launches, pricing changes) | Medium | Low-Medium — copy becomes inaccurate or a weaker differentiator over time | Re-run Part A research at a fixed cadence (recommend every 2 quarters) ahead of any homepage messaging refresh | Product Marketing |
| UK public-sector buyer (§4.5) cannot find Veyvio through their normal procurement channel (G-Cloud/Digital Marketplace) | Medium | Medium — lost or slowed opportunities in the local-authority segment named as a primary audience | See Part G | Commercial |

---

# PART E — Claims Substantiation Register *(new — operationalises §10)*

Every public claim on the homepage should have a row here before it ships. This is a live document, not a one-off; it should be reviewed at every publishing-workflow content review step (§16.5, state 2) and whenever a claim's underlying feature status changes.

| Claim (as it will appear on the page) | Classification | Evidence / source of truth | Review owner | Last verified |
|---|---|---|---|---|
| "One connected platform for safer, clearer transport operations" | Available (as a positioning statement, not a feature claim) | Part A.5 differentiation analysis | Product Marketing | — |
| Application card copy for Command/Driver/Yard/Maintenance/Portal (§7 Section 2) | Per-application, classify individually: Available / Pilot / In development | Product roadmap, not this document | Product | — |
| Safety and compliance bullet list (§7 Section 5) | Per-bullet, classify individually | Product roadmap | Product/Compliance | — |
| Vehicle readiness outputs (Ready/Warning/Restricted/Not ready/Unknown) (§7 Section 8) | Available only once the readiness engine is implemented and tested; otherwise Planned | Engineering test evidence | Engineering | — |
| Tenant isolation guarantee (§7 Section 9) | Must match Part C.2's implemented model exactly | Security review sign-off | Security | — |
| Offline/mobile operations claims (§7 Section 10) | Available only once offline queuing, conflict display and resync are implemented and tested | Engineering test evidence | Engineering | — |
| Any customer evidence, logo, testimonial, statistic (§7 Section 12) | Must remain "Exploratory/Pilot programme" framing until real evidence exists, per §10 | Signed customer permission on file | Marketing/Legal | — |
| Any integration name (§17.2 Integrations component) | Available only if contractually confirmed | Signed integration agreement | Product | — |
| Mobile app store badges/links | Available only once live on the named store | App Store Connect / Play Console listing | Engineering | — |
| Uptime or reliability figures, if ever added | Planned/Not published until an approved SLA exists | Approved service commitment document | Commercial/Legal | — |
| Any environmental/net-zero claim, if ever added | Not published without third-party evidence | Independent verification | Legal | — |

---

# PART F — Full-Site Information Architecture *(new)*

v1's homepage links to roughly 40 distinct destinations across the header, section CTAs and footer. This document specifies page 01 (the homepage) only; the pages below are **referenced but not yet specified**, and the homepage's "no dead links" acceptance criterion (§19 Navigation) cannot pass until each of them exists or is explicitly deferred.

## F.1 Pages directly required by the homepage (Tier 1 — needed for homepage launch)

- `/platform` — Platform Overview
- `/platform/command`, `/platform/driver`, `/platform/yard`, `/platform/maintenance`, `/platform/customer-portal`
- `/solutions/*` — one per Section 3 problem area if a dedicated Solutions hub is built, or these may resolve to anchors within `/platform`
- `/industries` and `/industries/*` — one per Section 6 card (Community Transport, Dial-a-Ride, Home-to-School, SEND, Local Authorities, NHS/Healthcare, Charities, PSV)
- `/trust` (Trust Centre), `/trust/security`, `/trust/tenant-isolation`
- `/implementation`
- `/pilot-programme`
- `/resources` and initial resource articles (§7 Section 13's six suggested topics)
- `/demo` (or a modal/embedded flow from the homepage CTA)
- `/contact`
- `/pricing` (even if it only explains the approach, per Open Decision #4)
- `/sign-in` (link to product authentication domain)
- `/legal/privacy`, `/legal/cookies`, `/legal/terms`, `/legal/accessibility-statement`, `/legal/vulnerability-disclosure`
- `/status` (system status)
- `/support` (Help Centre)

## F.2 Pages referenced in the footer but not required for homepage launch (Tier 2 — can be "post-launch" per §19)

- `/about`, `/mission`, `/partners`, `/careers`, `/customer-success`
- `/resources/guides`, `/resources/templates`, `/resources/insights`, `/resources/glossary`, `/resources/faqs`
- `/release-notes`
- Individual solution pages beyond the anchors in F.1, if the Solutions nav item is meant to be a full hub rather than a dropdown into `/platform`

## F.3 Recommendation

Treat F.1 as the actual launch scope alongside the homepage — not as "the homepage plus some other team's backlog." A homepage that promises eight industry pages and a Trust Centre in its primary navigation, when only the homepage itself exists, will fail its own §19 "no dead links" criterion on day one. If timeline pressure means F.1 can't all ship simultaneously, either (a) trim the homepage's navigation and CTAs to only what's live at launch, or (b) launch with clearly marked "coming soon" states rather than dead links — never silently 404.

---

# PART G — UK Public-Sector Procurement & Compliance Considerations *(new)*

## G.1 Why this belongs in the blueprint

§4.5 names local authorities and contract commissioners as a primary audience, and Part A.3 shows at least one direct competitor (CTX/Shaunsoft) already listed on the UK Government's Digital Marketplace at a public price point. UK councils very often can only buy through an approved framework, so being *invisible* to that channel is a real go-to-market gap, not a nice-to-have.

## G.2 Recommendations

- **G-Cloud / Digital Marketplace listing.** Evaluate listing Veyvio on G-Cloud once a stable, saleable product exists. This does not block the homepage build, but the homepage's `/trust` and `/pricing` pages should be written so their content can be reused directly in a G-Cloud service description (clear description, pricing basis, data-hosting location, security certifications) without a rewrite.
- **DVSA Guide to Maintaining Roadworthiness.** This is the reference standard the Lane 3 competitors (FleetCheck, Fleet Planner) explicitly position against for walkaround checks and defect audit trails. Veyvio Yard/Maintenance copy on the homepage (§7 Sections 8, 10) and the eventual product pages should be able to make the same class of claim honestly — i.e. "designed to support the DVSA Guide to Maintaining Roadworthiness," not "guarantees compliance," consistent with §7 Section 5's wording rule.
- **FORS (Fleet Operator Recognition Scheme) and DVSA Earned Recognition.** Both are referenced by competitor positioning as accreditation frameworks operators care about. Where Veyvio's evidence and audit-trail capabilities genuinely support an operator's own accreditation effort, the homepage may say so using the same "helps manage/support" framing as the DVSA point above — never "guarantees accreditation."
- **UK GDPR and data residency.** Given passenger data can include special-category information (health/mobility needs, safeguarding flags for SEND and home-to-school transport), the Trust Centre should be explicit about hosting location and data-processing terms. This is Open Decision #10 and should be resolved before any local-authority-facing sales conversation, not just before general availability.
- **Accessibility regulations (Public Sector Bodies Accessibility Regulations 2018).** Local-authority buyers are themselves legally required to consider supplier accessibility; a clear, published accessibility statement (already scoped at `/legal/accessibility-statement` in Part F.1) is not just good practice for Veyvio's own visitors, it is something procurement contacts will specifically ask for.

## G.3 What this does *not* require of the homepage itself

None of the above requires new homepage sections beyond what v1 already specified — §7 Section 5's compliance framing and §7 Section 9's Trust Centre link already provide the right entry points. What it requires is that the *content underneath those links* (Trust Centre, pricing, accessibility statement — see Part F) is written with a procurement reader in mind, not only a demo-booking commercial buyer.

---

# PART H — Definition of Ready *(new — precedes the existing Definition of Done)*

The homepage should not enter build until each of the following is true. This is deliberately positioned before §20's Definition of Done: a page can't be validated as "done" against criteria that were never actually specified before work began.

- [ ] Positioning statement (§5) is approved and grounded against current competitive research (Part A), not just internally agreed.
- [ ] Every claim planned for launch has a row in the Claims Substantiation Register (Part E) with a classification.
- [ ] Tenant-isolation model (Part C.2) has an engineering decision (which pattern, RLS enforcement approach) before §9 copy is finalised.
- [ ] Information architecture (Part F.1) has a committed launch scope — either all Tier 1 pages are in the same delivery plan as the homepage, or the homepage's navigation/CTAs are trimmed to match what will actually exist at launch.
- [ ] Brand visual system (§9) has approved components for at least: hero composition, application cards, before/after comparison, industry cards, and the footer.
- [ ] CRM, calendar and consent platforms (Open Decisions #10, #12, #17) are selected enough to build the form integration (Part C.1) against, even if final contracts are pending.
- [ ] Legal has confirmed company identity, domain and contact details (Open Decisions #1, #2, #14), or an explicit placeholder policy is agreed for structured data (§12) that won't need a rebuild later.
- [ ] A named content owner, technical owner and accessibility reviewer are assigned (this is currently only required at Done, per §19 Operational readiness — assigning it at Ready avoids last-minute ownership gaps).

---

# Appendix — Research sources used in this revision

Competitive and standards research was conducted in July 2026. Vendor feature descriptions reflect each vendor's own public marketing and third-party comparison sites at that time and should be re-verified before any claim derived from them is used in customer-facing material (see Part A.6 and the Risk Register's competitive-drift entry).

- Ecolane, RouteMatch, Trapeze Group, Optibus, Hastus — DRT/paratransit scheduling comparisons (Capterra, ZipDo, WorldMetrics, SaaSworthy, WifiTalents)
- CTS Software (TripMaster), CATSS, Road XS, RLDatix/Flexiroute, OPTiMiSe, CTX/Shaunsoft (UK Digital Marketplace G-Cloud listing) — UK community and local-authority transport software
- FleetCheck, Fleet Planner — UK fleet compliance and driver walkaround-check software
- W3C WCAG 2.2 (October 2023) and ETSI EN 301 549 regulatory timeline
- Google Core Web Vitals current thresholds (LCP/INP/CLS) and the March 2024 INP-for-FID transition
- Current (2026) multi-tenant SaaS architecture practice: pooled/RLS, schema-per-tenant, and database-per-tenant patterns, and PostgreSQL row-level-security implementation detail
