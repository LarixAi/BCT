# Veyvio Executive — classification & retention register (Launch gate LG-13)

**Date:** 31 July 2026  
**Status:** Draft for Security Owner / DP approval — **not yet approved for live production data**.

## Classifications (runtime)

| Classification | Code / label | Treatment |
|---|---|---|
| Internal | `executive_internal` | Executive grant + role; AAL2 for app session |
| Restricted | `executive_restricted` | Named roles; download purpose; access events |
| Highly restricted | `executive_highly_restricted` | Privileged roles; step-up; reason; fail-closed malware; dual control for export |

Mapped from blueprint §5 Public / Internal / Restricted / Highly restricted. Public publication remains a separate Command/website workflow (not Executive private storage).

## Data types → classification

| Data type | Classification | Retention category (seed) | Notes |
|---|---|---|---|
| Board packs | Highly restricted | `executive_board_packs` / documents | Dual control for bulk export |
| Bank mandates | Highly restricted | `executive_documents` | Sensitive action for changes |
| Safeguarding escalation | Highly restricted | `executive_documents` | DPIA required |
| Security / audit reports | Highly restricted | `executive_documents` | Append-only security_events |
| Annual budgets / proposals | Restricted | `executive_documents` | Two-person approval |
| Policies (draft→approved) | Restricted / Internal | `executive_documents` | Publication sensitive action |
| Restricted exports | Highly restricted | `executive_exports` | Soft-delete via approved purge only |
| Branch performance summaries | Restricted / Internal | `executive_documents` | Role-gated reads |
| Demo fixtures | N/A (non-production) | — | Phase 0 banner until launch cleared |

## API surfaces that return classified material

| Surface | Classifications | Control |
|---|---|---|
| `GET/POST /executive/documents*` | All Executive classes | Role × classification matrix; AAL2 |
| `POST .../download` | As stored | Short-lived URL; reason for highly restricted |
| `POST /executive/exports/:id/fulfil` | Highly restricted | Sensitive action + step-up |
| Executive BFF `/api/executive/files*` | Proxied | No storage secrets to browser |
| Notifications | Titles/reasons only | Must not embed highly restricted bodies (Phase 9 redaction on security logs) |

## Retention & holds

- Dry-run: `GET /executive/retention/dry-run`
- Destructive soft-delete: `retention_purge` sensitive action → `executive_retention_purge_jobs`
- Legal holds block purge/delete
- **Residual:** hard storage wipe not automated; owner confirms category day counts in `data_retention_policies`

## Approval

| Role | Decision | Date |
|---|---|---|
| Security Owner | _pending approve / amend_ | |
| Data Protection lead | _pending_ | |
| Technical Owner | Draft issued 31 July 2026 | 31 Jul 2026 |
