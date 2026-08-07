# Veyvio Executive — formal risk acceptance (Phase 11 / SEC-1109)

**Purpose:** Record known residuals that are **accepted** pending pen-test or platform work.  
**Rule:** Critical/high from an **independent** pen-test are **not** pre-accepted here.

| ID | Risk | Severity | Acceptance | Owner | Review by |
|---|---|---|---|---|---|
| RA-1109-01 | npm audit high on `next` / transitive `postcss` / `sharp` (16.2.12 allowlist) | High (dependency) | Accepted temporarily until stable Next outside advisory range; CI fails on new highs | Technical Owner | Next stable release or 30 Sep 2026 |
| RA-1109-02 | Independent pen-test report not yet delivered | High (assurance) | **Not accepted for highly restricted data** — launch gate remains closed | Security Owner | After report |
| RA-1109-03 | Sites publish of hardened Worker / BFF may lag repo | Attention | Accepted for non-highly-restricted pilot only | Technical Owner | Next Sites publish |
| RA-1109-04 | Durable Cloudflare WAF / bot rules not confirmed in dashboard | Attention | Accepted with Worker rate limits as interim | Technical Owner | 31 Aug 2026 |
| RA-1109-05 | No malware SaaS (structural scan only) | Attention | Accepted until AV SaaS integrated; highly restricted stays fail-closed pending | Security Owner | Gate for highly restricted packs |
| RA-1109-06 | PDF binary watermark engine not integrated | Low | Accepted; text artefacts stamped | Technical Owner | Backlog |
| RA-1109-07 | Unusual geo/device alerting not shipped | Attention | Accepted; threshold alerts cover volume abuse | Security Owner | Phase 9 residual backlog |
| RA-1109-08 | SEC-0311 two-person MFA reset unfinished | Attention | Accepted only if MFA reset remains admin-manual & audited | Security Owner | Before CEO-only recovery at scale |
| RA-1109-09 | PITR dashboard confirmation outstanding | Attention | Accepted for continuity drills; confirm before board data | Technical Owner | Phase 10 residual |
| RA-1109-10 | Emergency contact names placeholders | Attention | Template published offline; names must be filled | Security Owner | Immediate operational |

**Sign-off (Phase 11 documentation):** Technical Owner — 31 July 2026.  
Security Owner countersignature required before production highly restricted data.
