#!/usr/bin/env bash
# Deploy Command API (driver training, requirements, notifications) to Supabase.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  if [[ -f "../veyvio-driver-App/.env.local" ]]; then
    # shellcheck disable=SC1091
    set -a && source "../veyvio-driver-App/.env.local" && set +a
    SUPABASE_PROJECT_REF="$(echo "${VITE_SUPABASE_URL:-}" | sed -n 's|https://\([^.]*\)\.supabase\.co.*|\1|p')"
  fi
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "Set SUPABASE_PROJECT_REF or VITE_SUPABASE_URL in veyvio-driver-App/.env.local"
  exit 1
fi

echo "Deploying command-api to project ${SUPABASE_PROJECT_REF}…"
npx supabase functions deploy command-api --project-ref "$SUPABASE_PROJECT_REF"
echo "Done. Open Driver app → More → Offline & sync to verify Training centre course count."
