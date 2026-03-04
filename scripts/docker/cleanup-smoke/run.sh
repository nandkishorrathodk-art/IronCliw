#!/usr/bin/env bash
set -euo pipefail

cd /repo

export IronCliw_STATE_DIR="/tmp/IronCliw-test"
export IronCliw_CONFIG_PATH="${IronCliw_STATE_DIR}/IronCliw.json"

echo "==> Build"
pnpm build

echo "==> Seed state"
mkdir -p "${IronCliw_STATE_DIR}/credentials"
mkdir -p "${IronCliw_STATE_DIR}/agents/main/sessions"
echo '{}' >"${IronCliw_CONFIG_PATH}"
echo 'creds' >"${IronCliw_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${IronCliw_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
pnpm IronCliw reset --scope config+creds+sessions --yes --non-interactive

test ! -f "${IronCliw_CONFIG_PATH}"
test ! -d "${IronCliw_STATE_DIR}/credentials"
test ! -d "${IronCliw_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${IronCliw_STATE_DIR}/credentials"
echo '{}' >"${IronCliw_CONFIG_PATH}"

echo "==> Uninstall (state only)"
pnpm IronCliw uninstall --state --yes --non-interactive

test ! -d "${IronCliw_STATE_DIR}"

echo "OK"

