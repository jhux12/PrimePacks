#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# All values below are fixtures for the isolated demo project, never live credentials.
fixture=functions/.env.demo-primepacks
secret_fixture=functions/.secret.local
if [[ -e "$fixture" || -e "$secret_fixture" ]]; then
  echo 'Existing emulator configuration found; move it aside before running this isolated test suite.' >&2
  exit 1
fi
trap 'rm -f "$fixture" "$secret_fixture"' EXIT
cat > "$fixture" <<'VARS'
FIRESTORE_DATABASE_ID=(default)
COMMERCE_ENABLED=true
SITE_URL=https://primepacks.example
STORE_TERMS_URL=https://primepacks.example/terms
VARS
cat > "$secret_fixture" <<'VARS'
STRIPE_SECRET_KEY=sk_test_local_fixture_only
STRIPE_WEBHOOK_SECRET=whsec_local_fixture_only
VARS
export FIREBASE_CLI_DISABLE_TELEMETRY=1
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-/tmp/primepacks-cache}"
export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-/tmp/primepacks-config}"
export FIREBASE_EMULATORS_PATH="${FIREBASE_EMULATORS_PATH:-/tmp/primepacks-emulators}"
emulators=auth,firestore,functions
# An already-running official emulator may be used in restricted-network environments.
if [[ "${PRIMEPACKS_EXTERNAL_FIRESTORE:-0}" == 1 ]]; then
  export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
  emulators=auth,functions
fi
command='node --import tsx --test tests/firestore.test.ts && node --test functions/test/integration.test.js && node_modules/.bin/playwright test --config playwright.integration.config.ts'
if [[ "${1:-}" == --browser-only ]]; then
  command='node_modules/.bin/playwright test --config playwright.integration.config.ts'
fi
node_modules/.bin/firebase emulators:exec --config firebase.test.json --project demo-primepacks --only "$emulators" "$command"
