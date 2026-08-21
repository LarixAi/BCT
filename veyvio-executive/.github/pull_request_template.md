## Summary

<!-- What changed and why (operational meaning for Executive). -->

## Security checklist (SEC-1104)

- [ ] Touches auth, MFA, sessions, cookies, CSP/CSRF, RLS, permissions, crypto, or secrets? If **yes**, Security Owner / code-owner review is required.
- [ ] No service-role, session secrets, or recovery codes added to client bundles or docs.
- [ ] Tenant scope (`company_id` / JWT) preserved on every new read/write.
- [ ] Negative test added or existing suite still covers the change.
- [ ] Threat model / ASVS mapping updated if a trust boundary changed.

## Test plan

- [ ] `npm test` (Executive) and/or Admin targeted security scripts
- [ ] Manual path (if any):

## Residual risk

<!-- None / link to risk acceptance ID -->
