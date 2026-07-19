# Veyvio Driver Page Audit

## Cleanup completed

The live dependency graph was traced from `src/main.jsx`. The following 25 unreachable legacy page modules were removed:

- DriverAbout
- DriverAddVehicle
- DriverAreaPreferences
- DriverBank
- DriverDailyCheck
- DriverDashboard
- DriverDashboardMobile
- DriverDestination
- DriverEarnings
- DriverFilters
- DriverHotAreas
- DriverIncidentReport
- DriverJobHistory
- DriverJobView
- DriverJobsToday
- DriverLogin
- DriverMessages
- DriverOnboarding
- DriverSettings
- DriverSetup
- DriverSignup
- DriverSupabaseLogin
- DriverVehicle
- DriverVehicleDocumentDetail
- DriverVehicleDocuments

No live route or reachable module imports any of these files.

## Current Veyvio Driver main navigation

The current bottom navigation is:

1. Home
2. Jobs
3. Check
4. Alerts
5. Profile

Recommended Veyvio naming:

1. Home
2. Trips
3. Vehicle Checks
4. Messages
5. More

## Current active capability coverage

### Already present

- Authentication and account verification
- Driver onboarding and compliance documents
- Home operational dashboard
- Duty start, breaks and working time
- Job/trip list
- Incoming job offers
- Job/trip detail and execution
- Job closeout
- Vehicle walkaround checks
- Vehicle selection and check history
- Defect reporting
- Incident reporting
- Lost property reporting
- Notifications
- Message threads
- Acknowledgements
- Driver documents and licence compliance
- Time-off requests
- Profile, settings, policies and help

## Missing or incomplete pages for the planned Veyvio Driver product

### P0 — required for the core driver workflow

1. **Dedicated Trips experience**
   - Rename Jobs to Trips throughout the driver-facing UI.
   - Separate Today, Upcoming, Completed and Cancelled/Changed trips.
   - Preserve job as an internal admin/domain term if needed.

2. **Trip execution screen with pickup and drop-off parity**
   - Arrival confirmation
   - Passenger identity/manifest confirmation
   - Boarding outcome
   - No-show and refusal reasons
   - Wheelchair and mobility assistance confirmation
   - Safeguarding notes
   - Drop-off handover recipient and outcome
   - Evidence and signature where required

3. **Current vehicle page**
   - Assigned vehicle
   - Registration, fleet number and depot
   - Fuel/charge level
   - Equipment assigned
   - Accessibility equipment
   - Existing defects
   - Vehicle documents
   - Request vehicle change
   - Handback status

4. **Driver readiness page**
   - Licence validity
   - DBS status
   - DQC/CPC status
   - Tachograph card status
   - Required training
   - Assigned vehicle readiness
   - Daily check status
   - Duty/working-time status
   - Clear blocked reason and resolution action

5. **Offline and sync centre**
   - Connection status
   - Pending uploads/actions
   - Failed sync items
   - Retry controls
   - Last successful sync
   - Offline evidence queue

### P1 — important for safe daily operations

6. **Training centre**
   - Required modules
   - Section 19/22 or operator-specific modules
   - MIDAS and accessible transport training
   - Safeguarding
   - Wheelchair restraint and passenger assistance
   - First aid and emergency procedures
   - Expiry and refresher dates
   - Certificates and acknowledgements

7. **Shift summary / end-of-duty page**
   - Hours and breaks
   - Trips completed
   - Mileage
   - Incidents and defects raised
   - Vehicle handback
   - Lost property check
   - Outstanding actions
   - Driver declaration

8. **Announcements page**
   - Company-wide notices separate from operational alerts
   - Required-read notices
   - Policy updates
   - Depot notices

9. **Emergency and safeguarding hub**
   - Emergency assistance shortcut
   - Contact operations
   - Safeguarding concern
   - Passenger medical event
   - Breakdown
   - Collision
   - Police/reference details

10. **Availability and schedule page**
    - Upcoming assigned duties
    - Availability submission
    - Leave/time-off status
    - Shift changes
    - Depot/reporting location

### P2 — valuable supporting pages

11. **Performance and driving feedback**
    - Safety events
    - Speeding/harsh driving summaries
    - Coaching actions
    - Recognition
    - Dispute/context submission

12. **Equipment page**
    - Driver-issued equipment
    - Vehicle equipment
    - QR scan/confirmation
    - Missing or damaged equipment report

13. **App diagnostics page**
    - GPS permission
    - Background location
    - Notifications
    - Battery optimisation
    - Screen-awake mode
    - App version and device details

## Consolidation required

- `/notifications` and `/messages` currently render the same notifications component.
- `/threads` and `/threads/:threadId` provide the actual two-way messaging flow.
- These should become one Messages hub with tabs or filters for Conversations, Alerts and Announcements.
- Profile should become More and act as the secondary navigation hub.
- The app still contains PHV-oriented supporting code such as earnings, destination and hot-area concepts even though their old pages were removed. Those libraries/components require a separate feature-level audit before deletion because some remain reachable from live components.

## Recommended final page structure

### Main tabs

- Home
- Trips
- Vehicle Checks
- Messages
- More

### Home secondary screens

- My Duty
- Driver Readiness
- Current Vehicle
- Shift Summary
- Emergency & Safeguarding

### Trips secondary screens

- Trip Details
- Pickup Workflow
- Drop-off Workflow
- Trip Changes
- Trip Closeout
- Trip History

### Vehicle Checks secondary screens

- Start Check
- Select Vehicle
- Check History
- Check Detail
- Report Defect
- Current Defects
- Equipment

### Messages secondary screens

- Conversations
- Alerts
- Announcements
- Acknowledgements
- Contact Operations

### More secondary screens

- Profile
- Documents
- Licence & Compliance
- Training
- Working Time
- Schedule & Availability
- Time Off
- Policies
- Offline & Sync
- App Diagnostics
- Settings
- Help
- Lost Property
- Incident Reports
