# BCT Main Depot — on-site coordinate validation

Use this walk-through at **BCT Main Depot (Wembley)** to confirm the digital map matches the physical layout. One person walks the yard; another marks discrepancies in Admin or updates `shared/veyvio-yard/bct-main-depot.ts` and re-seeds.

## Before you start

- Yard app open on **Brent Community Transport → BCT Main Depot → Yard map**
- Map layers: bays + labels on
- Clipboard: bay number, vehicle reg (if any), GPS optional

## Validation checklist (26 bays)

| Step | Bay | Check |
|------|-----|--------|
| 1 | 1–4 | North column bays align with portacabin fence; vehicle nose points north |
| 2 | 5–7 | Second column; spacing matches minibus length |
| 3 | 8–10 | Third column; **Bay 10 LIFO** — confirm blocked exit until front bays clear |
| 4 | 11–12 | Short row; tap each bay on map — drawer shows correct number |
| 5 | 13–15 | East-facing row; **Bay 15 LIFO** |
| 6 | 16 | Isolated bay near circulation — not confused with 17–20 |
| 7 | 17–20 | West row; east-facing parking |
| 8 | 21 | Single bay south of row 17–20 |
| 9 | 22–24 | South row |
| 10 | 25–26 | Near main gate; confirm gate overlay matches real entrance |

## Zones & circulation

- [ ] Pedestrian routes (green) do not overlap bay footprints
- [ ] Yellow circulation matches one-way flow around LIFO columns
- [ ] Main gate (bottom centre) matches vehicle entrance/exit
- [ ] Top entrance marker matches staff/secondary access if used

## Live data

- [ ] Park a vehicle in Bay 2 — map shows occupied within Realtime refresh
- [ ] Driver end-of-shift parking updates bay on map
- [ ] Move vehicle in Yard — `vehicle_locations` updates on map

## Recording adjustments

For each mismatch record:

```
Bay: __
Issue: position | rotation | size | wrong label
Suggested: position_x, position_y, width, height
Photo: (optional)
```

Update sources (in order):

1. `shared/veyvio-yard/bct-main-depot.ts` (app geometry)
2. `Veyvio admin /supabase/migrations/` seed or `parking_bays` update for production DB
3. Re-publish layout version in Admin when layout editor ships

## Sign-off

| Role | Name | Date | Map version |
|------|------|------|-------------|
| Yard manager | | | |
| Transport manager | | | |
