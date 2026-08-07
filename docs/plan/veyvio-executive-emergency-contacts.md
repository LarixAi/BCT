# Veyvio Executive — emergency contacts (offline copy)

**SEC-1007:** Keep this sheet available **outside** the Executive app and outside the primary company email system (printed binder, encrypted offline store, or alternate domain).

| Role | Name | Primary contact | Alternate |
|---|---|---|---|
| Chief Executive | _fill in_ | phone / personal email | |
| Security Owner | _fill in_ | phone / personal email | |
| Technical Owner | _fill in_ | phone / personal email | |
| Data Protection lead | _fill in_ | phone / personal email | |
| Supabase project owner | _fill in_ | dashboard account | recovery codes location |
| Cloudflare account owner | _fill in_ | | |
| Hosting / domain registrar | _fill in_ | | |
| Legal / insurance (cyber) | _fill in_ | | |

## Systems outside the affected app

| Item | Location |
|---|---|
| This contact sheet | Printed + offline encrypted copy |
| Continuity runbooks | `docs/deploy/executive-backup-continuity.md`, `docs/plan/veyvio-executive-incident-response.md` (git clone on cold laptop) |
| Credential rotation | `docs/plan/credential-rotation-runbook.md` |
| Supabase project ref | `qeckgqjrfbdyxchuncdt` |
| Command API health | `https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api/health` |
| Executive production URL | _fill after Sites publish_ |

## First 15 minutes (any major outage)

1. Confirm blast radius (app vs DB vs auth vs DNS).
2. Contact Security Owner + Technical Owner using **offline** numbers above.
3. Do not use a compromised CEO mailbox for recovery codes.
4. Prefer platform_admin + Supabase owner for backup restore; Executive roles cannot administer backups.

Update this sheet whenever owners change. Last template update: **31 July 2026**.
