# Navigation and location services — external research vs. what's built

Compares an external research brief on enterprise fleet navigation architecture (Samsara, Geotab, Verizon Connect, Fleetio, Motive) against the actual `veyvio-driver-App/src/lib/navigation/` implementation, plus fresh research (Jul 2026) on the specific gaps. Written so a future reader doesn't have to re-derive what's already built before proposing "new" navigation work.

**Headline: the hard part is already built.** GPS sensor fusion, map-matching, off-route detection, and in-car display are implemented and — per the code's own comments — were already built against a version of this research brief (`offRouteDetector.js` and `useNavigationLocationEngine.js` both quote it directly). The real gaps are on the fleet-management side (geofences as first-class objects, multi-stop optimization, vehicle-restriction-aware routing, offline fallback), not the navigation-engine side.

## 1. What's already built

| Capability | Status | File(s) |
|---|---|---|
| GPS spike rejection | Done | [`smoothGps.js`](../../veyvio-driver-App/src/lib/smoothGps.js) — `isGpsReadingStable` rejects jumps >120m or accuracy >80m |
| Kalman filtering | Done | [`locationEngine/kalmanLatLng.js`](../../veyvio-driver-App/src/lib/navigation/locationEngine/kalmanLatLng.js) — 1D filter, tunable process noise (walking/city/highway presets) |
| Map-matching (snap to route) | Done | [`locationEngine/snapToRoute.js`](../../veyvio-driver-App/src/lib/navigation/locationEngine/snapToRoute.js) — Turf `nearestPointOnLine`, deliberately snaps to the *planned route* only, not the general road network (avoids parallel-road misassignment) |
| Off-route detection + reroute gating | Done | [`locationEngine/offRouteDetector.js`](../../veyvio-driver-App/src/lib/navigation/locationEngine/offRouteDetector.js) — 3-strike hysteresis, 15s reroute cooldown |
| Dead reckoning between fixes | Done | [`deadReckoning.js`](../../veyvio-driver-App/src/lib/navigation/deadReckoning.js) — speed/heading projection capped at 3s, eased display position |
| Location engine orchestration | Done | [`locationEngine/useNavigationLocationEngine.js`](../../veyvio-driver-App/src/lib/navigation/locationEngine/useNavigationLocationEngine.js) — wires all of the above into one pipeline at ~8Hz publish rate |
| Forward geocoding | Done | [`geocodeAddress.js`](../../veyvio-driver-App/src/lib/geocodeAddress.js) — OSM Nominatim, UK-scoped, autocomplete-suggestion pattern (not blind auto-fill) |
| External nav handoff (Google/Waze/Apple Maps) | Done | [`googleNavLauncher.js`](../../veyvio-driver-App/src/lib/googleNavLauncher.js), [`openExternalNavigation.js`](../../veyvio-driver-App/src/lib/navigation/openExternalNavigation.js) — platform-correct intent URLs, fallback chains |
| CarPlay | Done | `driverCarPlay.js` + native `CarPlaySceneDelegate.swift` / `CarPlayTripStore.swift` / `DriverCarPlayPlugin.swift` |
| Android Auto | Done | `driverAndroidAuto.js` + native `DriverAndroidAutoPlugin`/`Service`/`AndroidAutoTripStore` |
| "Return to app" overlay (Android) | Done | `floatingBubble.js` + native `DriverFloatingBubblePlugin`/`Service`, `returnToDriverApp.js` + `DriverNavReturnPlugin` |
| "Return to app" overlay (iOS) | **Not possible** | Apple does not permit persistent overlays over other apps — platform restriction, not a missing feature. See §3. |
| Navigation confirmation before external handoff | Done (added 2026-07-27) | `externalNavConfirm.js` + `NavigationConfirmDialog.jsx` |
| Depot-internal zone/bay layout | Done, narrow scope | `depot_zones` table (`202607240002_bct_yard_layout_seed.sql`) — Yard app's polygon bay editor, not general customer-site geofencing |
| Multi-tenant isolation | Done, strong | `private.user_has_company()`, JWT `active_company_id`, RLS — audited separately in this repo's tenant-isolation work |

## 2. Real gaps

| Gap | Why it matters | Fix scope |
|---|---|---|
| No general-purpose geofence/saved-place model | Every "arrived at stop" today is driver-confirmed, not GPS-triggered. Customer sites, depots-as-route-stops, and no-go zones have no DB representation outside the Yard-internal `depot_zones`. | New `places` / `geofences` tables (see §3.1) |
| No multi-stop route optimization | Stop order is whatever dispatch entered, not solver-optimized. A multi-drop duty with 8+ stops has no "best order" computation. | Server-side call to Google Route Optimization API or OR-Tools (see §3.2) |
| No vehicle-restriction-aware routing | External handoff to Google Maps/Waze doesn't know the vehicle's height/weight/length. A PSV or box van can be routed under a low bridge. | Needs HERE Routing API (or Google's truck-mode) with vehicle profile (see §3.3) |
| No offline map/route fallback | If the driver loses connectivity mid-route, the Leaflet preview has whatever tiles are already in memory — no deliberate offline pack. | Mapbox predictive/ambient caching, or pre-fetch today's route corridor (see §3.4) |
| In-app preview doesn't use live traffic | `googleNavLauncher.js` comment is explicit: preview stays on OSRM geometry, deliberately not Google's traffic-aware routes, until handoff. | Acceptable for now — traffic-aware ETA only matters pre-handoff if stop-order/ETA decisions are made before the driver taps Navigate |
| No reverse geocoding | No lat/lng → street name lookup found; only forward address search. | Low priority — mostly a display nicety |
| iOS has no floating-bubble equivalent | Platform restriction, not a code gap | Live Activity is the realistic substitute (see §3.5) |

## 3. Research on the gaps (July 2026)

### 3.1 Geofences as first-class objects

PostGIS is the standard approach: `ST_Contains`/`ST_Within` for polygon geofences, `ST_DWithin` for circular radius checks, both GiST-index-accelerated so bounding-box pre-filtering discards impossible candidates before the exact containment check runs. A trigger-based pattern (compare current geofence membership to previous, emit enter/leave events, log to a history table) is the common implementation — see Crunchy Data's write-up for the reference design. Veyvio's Supabase Postgres already supports the `postgis` extension (not currently enabled per the migration scan); enabling it is additive, not a rewrite.

Practical sizing guidance from current fleet-geofencing practice: a geofence must be large enough to catch a real arrival/departure but small enough that a vehicle merely driving past on an adjacent road doesn't trigger it — this is exactly the same false-positive concern Veyvio's `offRouteDetector.js` already solved for route deviation, just applied to a different signal.

### 3.2 Multi-stop route optimization

Google's **Route Optimization API** (formerly Cloud Fleet Routing; Cloud Fleet Routing was deprecated 16 Jan 2025) is now GA and is the direct successor product. It accepts shipment/vehicle details — locations, time windows, capacity — and returns a stop-sequence plan with configurable objectives (travel efficiency, on-time arrival, load balancing) and constraints (driver hours, vehicle capacity). This is a large step up from the Directions API's 25-stop single-vehicle cap. For a self-hosted alternative, OR-Tools (Google's open-source solver) is the standard choice fleet platforms build on when they don't want a per-call API cost.

### 3.3 Vehicle-restriction-aware routing

HERE's Routing API v8 truck routing takes a vehicle profile (`vehicle[height]`, `vehicle[weight]`, `vehicle[weightPerAxle]`, etc.) and routes around physical restrictions (height-restricted tunnels/bridges), legal restrictions (no-trucks zones), and hazmat restrictions. This is the correct tool if Veyvio ever runs restricted vehicles (PSVs with height limits, HGVs) — Google Maps' external handoff has no equivalent for this app today, and Waze's truck mode is consumer-grade at best.

### 3.4 Offline fallback

Mapbox's Navigation SDK offers **predictive/ambient caching** — it pre-fetches map and routing data for the road ahead so navigation continues through weak-signal areas without an explicit "download this region" step from the user. Mapbox's Offline Maps API (Android/iOS) is the fallback for a fully deliberate offline pack. Either is a meaningfully better fit for Veyvio's actual failure mode (patchy 4G mid-route) than requiring drivers to pre-download regions.

### 3.5 iOS "return to app" parity

Live Activities (ActivityKit, iOS 16.1+) are the standard 2026 answer for exactly this pattern — a Lock Screen/Dynamic Island card that stays pinned for the duration of an ongoing event and updates via the app or APNs, dismissed when the event ends. Ride-hail apps use this pattern today for ETA/pickup/trip-state, which is functionally identical to what Veyvio needs for "driver is mid-navigation in Google Maps, show trip status, tap to return." This requires a new WidgetKit extension target — a real, scoped build, not a config change, and distinct from the CarPlay work already done.

## 4. Recommended sequencing

Ordered by dependency and blast radius, not by the original brief's generic phases — grounded in what's actually missing here:

1. **Geofences/places schema** (§3.1) — foundational; multi-stop optimization and "auto-arrived" detection both depend on knowing where stops actually are as DB objects, not just addresses on a job row.
2. **Vehicle-restriction routing** (§3.3) — safety-relevant (a PSV under a low bridge is a real incident, not a UX nicety); independent of the other items, can ship any time.
3. **Multi-stop optimization** (§3.2) — highest product value for multi-drop duties, but depends on §1's places existing as clean stop objects to feed the solver.
4. **Offline fallback** (§3.4) — improves resilience of what already exists; doesn't block or get blocked by anything else.
5. **iOS Live Activity** (§3.5) — parity nicety, not a safety or tenant-isolation item; lowest priority of the five.

## 5. Implementation checklist

Check items off as they land. Items marked **needs key** are blocked on the user obtaining a paid API credential before the live call can be wired — the schema/scaffolding around them can still be built now.

### Phase 1 — Geofences / places schema (no external dependency) — **done 2026-07-28**

- [x] `places` table migration — `202607280002_places_geofencing.sql` (`company_id`, `kind`, `name`, `address`, `lat`, `lng`, `radius_m`, `metadata jsonb`); applied and verified against a real local Postgres via `supabase db reset`
- [x] RLS select policy on `places` — `places_select_company`, matches the `private.user_has_company(company_id)` pattern; verified in `pg_policies`
- [x] `_shared/geofencing.mapping.ts` — pure `isWithinGeofence`/`nearestPlaceWithinRadius` haversine/circle-radius check, zero imports (no PostGIS dependency), same "pure module both Deno and Node can import" pattern as `incident-workflow.mapping.ts`
- [x] Linked `journey_stops.place_id` (nullable FK, backward compatible with address-only stops)
- [x] Wired into `driverPostLocation` (`command-api/index.ts`) via `findNearbyUnvisitedStop` — **design decision: suggestion only, never auto-mutates stop status.** Arrival/departure is a safety-relevant, audited lifecycle transition (`writeImmutableAudit` + `actorUserId`); silently auto-completing it from a GPS ping would create an audit-trail gap with no human actor behind the transition. The endpoint returns `nearbyStop` in its response; the driver still confirms via the existing `arriveDriverJourneyStop`/`completeDriverJourneyStop` endpoints, which already emit `journey.stop_arrived`/`journey.stop_completed` — so a separate `place.arrived` event type turned out to be unnecessary, not skipped.
- [x] Admin UI — `features/places/PlacesPage.tsx`, list + create form, registered at `/places` (route in `App.tsx`, nav entry in `navigation.ts`)
- [x] Unit tests — `scripts/geofencing.unit.mjs`, imports the real module (not a copy), sanity-checked against a known real-world distance (London Bridge ↔ Tower Bridge ≈ 892m)

Verification: `npx tsc --noEmit` clean, full Admin suite (62 files / 215 tests + all unit scripts) passes.

### Phase 2 — Vehicle-restriction-aware routing (**needs key**: HERE Routing API)

- [ ] Add `height_m` / `weight_kg` / `length_m` profile fields to `vehicles` if not already present
- [ ] Backend proxy endpoint in `command-api` that calls HERE Routing API v8 truck routing server-side (never expose the key to the client)
- [ ] Driver app passes the assigned vehicle's profile when requesting a restricted route
- [ ] Falls back to today's plain external-maps handoff when no restriction profile is set on the vehicle

### Phase 3 — Multi-stop optimization (**needs key**: Google Route Optimization API, or self-hosted OR-Tools as a no-key alternative)

- [ ] Decide provider: Google Route Optimization API (paid, managed) vs. OR-Tools (self-hosted, no per-call cost)
- [ ] Backend endpoint that submits stops + constraints (time windows, driver hours) and returns an optimized sequence
- [ ] "Optimize stop order" action in the dispatch/duty planning UI
- [ ] Depends on Phase 1 — stops need to be clean `place_id`-backed objects, not free-text addresses, before they're worth feeding to a solver

### Phase 4 — Offline fallback (no external dependency beyond current map provider)

- [ ] Evaluate Mapbox predictive/ambient caching vs. manual pre-fetch of today's route corridor
- [ ] Cache route geometry + next-stop data locally for offline read
- [ ] Explicit "offline — showing cached route" UI state (matches this codebase's truthful-sync principle — never show a synced/live state that isn't backed by a fresh source)

### Phase 5 — iOS Live Activity (return-to-app parity)

- [ ] New WidgetKit extension target in the Xcode project
- [ ] ActivityKit attributes model (destination, ETA, trip status)
- [ ] Start/update/end the Live Activity from a new native bridge (sibling to `DriverCarPlayPlugin.swift`, not a reuse of it)
- [ ] Verify Dynamic Island + Lock Screen rendering in Simulator

## Sources

- [Route Optimization API overview — Google for Developers](https://developers.google.com/maps/documentation/route-optimization/overview)
- [Plan efficient routes for your fleet: Route Optimization API GA — Google Maps Platform](https://mapsplatform.google.com/resources/blog/plan-efficient-routes-for-your-fleet-route-optimization-api-is-now-generally/)
- [Truck routing — HERE Routing API v8](https://docs.here.com/routing/docs/routing-v8-truck-routing)
- [Filtering truck routing requests — HERE Developer Guide](https://developer.here.com/documentation/routing/dev_guide/topics/filtering-truck-routing-requests.html)
- [Moving Objects and Geofencing with Postgres & PostGIS — Crunchy Data](https://www.crunchydata.com/blog/moving-objects-and-geofencing-with-postgres-postgis)
- [11. Spatial Relationships — Introduction to PostGIS](http://postgis.net/workshops/postgis-intro/spatial_relationships.html)
- [Geofencing Transforms Fleet Management — CXTMS (2026)](https://cxtms.com/blog/geofencing-fleet-management-location-based-automation-logistics-workflows-2026)
- [Offline | Navigation SDK | Mapbox Android Docs](https://docs.mapbox.com/android/navigation/guides/advanced/offline/)
- [Offline maps — Mapbox Help](https://docs.mapbox.com/help/dive-deeper/mobile-offline/)
- [Mapbox Fleet](https://www.mapbox.com/fleet)
- [Live Activities iOS 26: Complete Guide 2026 — Swift Crafted](https://swiftcrafted.dev/article/live-activities-dynamic-island-ios-26-swiftui-activitykit-guide)
- [iOS Live Activities: ActivityKit, Dynamic Island & Lock Screen Guide (2026) — Newly](https://newly.app/guides/ios-live-activities)
