# Gate 3 — CI upload keystore secrets (Android)

**Purpose:** Load the local Driver upload keystore into GitHub Actions so [`.github/workflows/driver-android-aab.yml`](../../.github/workflows/driver-android-aab.yml) can produce a signed AAB for Play internal testing.

**Local keystore (gitignored):** `veyvio-driver-App/.secrets/veyvio-driver-upload.jks`  
**Passwords file (gitignored):** `veyvio-driver-App/.secrets/veyvio-driver-upload.passwords.txt`  
**Generator (if missing):** `cd veyvio-driver-App && node scripts/generate-driver-upload-keystore.mjs`

Never commit `.secrets/` or paste keystore material into issues/PRs.

---

## Secrets to set (GitHub → Settings → Secrets and variables → Actions)

| Secret | Value |
|--------|--------|
| `VEYVIO_UPLOAD_KEY_ALIAS` | `veyvio-driver-upload` |
| `VEYVIO_UPLOAD_STORE_PASSWORD` | From passwords file / generator output |
| `VEYVIO_UPLOAD_KEY_PASSWORD` | Same as store password unless you set a distinct key password |
| `VEYVIO_UPLOAD_KEYSTORE_BASE64` | Base64 of the `.jks` file (one line) |

### Encode keystore (macOS)

```bash
cd veyvio-driver-App
base64 -i .secrets/veyvio-driver-upload.jks | tr -d '\n' | pbcopy
# Paste clipboard into VEYVIO_UPLOAD_KEYSTORE_BASE64
```

Or re-print from generator output if you still have the terminal log (prefer reading the file + `base64` above).

---

## Run signed AAB

1. Confirm the four secrets exist on the repo.  
2. GitHub → **Actions** → **Driver Android AAB** → **Run workflow**.  
3. Download the AAB artifact → upload to Play Console **internal testing** track.  
4. Tick the CI keystore row in [gate3-store-readiness.md](./gate3-store-readiness.md).

Workflow fails clearly if any secret is missing (by design).

---

## Related

- Store checklist: [gate3-store-readiness.md](./gate3-store-readiness.md)  
- Version bump: [driver-version-bump.md](./driver-version-bump.md)  
- App Store / TestFlight: blocked until Gate 1 iOS — [gate3-testflight-archive.md](./gate3-testflight-archive.md)
