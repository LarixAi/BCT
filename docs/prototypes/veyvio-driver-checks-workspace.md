# Veyvio Driver — Checks Workspace

Interactive HTML reference adopted as the Checks tab (`/checks`).

Source: `docs/prototypes/veyvio-driver-checks-workspace/`

Implementation:
- `ChecksWorkspaceScreen.tsx` — vehicle canvas + floating chrome + history overlay
- `VehicleCheckCanvas.tsx` — minibus SVG with front / side / rear / wheels zones
- `checks-workspace-view.ts` — gate / session → stage, copy, zones, progress
- Reuses `useDutiesSheetDrag` for the adaptive bottom sheet

## Sheet = check lifecycle hub

| Stage | Meaning |
|-------|---------|
| Verify | Confirm assigned vehicle before walkaround |
| Walkaround | Guided section progress |
| Defect | Capture evidence and safety assessment |
| Bodywork | Compare existing damage |
| Review | Submit declaration |
| Waiting / Cleared / VOR | Outcome after Operations decision |

Deep flows (`/checks/verify`, walkaround, defect, review, result) stay as destinations. Home FAB replaces bottom nav on `/checks` only.
