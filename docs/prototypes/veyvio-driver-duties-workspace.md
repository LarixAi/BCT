# Veyvio Driver — Duties Workspace

Interactive HTML reference adopted as the Duties tab (`/trips`).

Implementation:
- `DutiesWorkspaceScreen.tsx` — full-bleed map + floating chrome + list overlay
- `DutiesWorkspaceDutyPanel.tsx` — focused duty hub in the adaptive sheet
- `duties-workspace-view.ts` — stage / copy / primary mapping
- `use-duty-prep-actions.ts` — shared acknowledge / verify / clock-in with the Duty hub route

## Sheet = focused duty hub

| Size | Content |
|------|---------|
| Collapsed | Stage + sticky primary CTA |
| Medium | Tone · **What must you do next?** · meta · prep bars · live primary |
| Expanded | + Before this journey checklist · passenger needs · duty/journey rows |

Deep flows (full hub, passengers, checks, nav) stay as destinations. Settings gear opens `/duties/$dutyId`. Home **Open duty** uses `/trips?dutyId=…`.
