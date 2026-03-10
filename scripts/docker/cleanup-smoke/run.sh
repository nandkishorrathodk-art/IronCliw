#!/usr/bin/env bash
set -euo pipefail

cd /repo

export IRONCLIW_STATE_DIR="/tmp/ironcliw-test"
export IRONCLIW_CONFIG_PATH="${IRONCLIW_STATE_DIR}/ironcliw.json"

echo "==> Build"
pnpm build

echo "==> Seed state"
mkdir -p "${IRONCLIW_STATE_DIR}/credentials"
mkdir -p "${IRONCLIW_STATE_DIR}/agents/main/sessions"
echo '{}' >"${IRONCLIW_CONFIG_PATH}"
echo 'creds' >"${IRONCLIW_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${IRONCLIW_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
pnpm ironcliw reset --scope config+creds+sessions --yes --non-interactive

test ! -f "${IRONCLIW_CONFIG_PATH}"
test ! -d "${IRONCLIW_STATE_DIR}/credentials"
test ! -d "${IRONCLIW_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${IRONCLIW_STATE_DIR}/credentials"
echo '{}' >"${IRONCLIW_CONFIG_PATH}"

echo "==> Uninstall (state only)"
pnpm ironcliw uninstall --state --yes --non-interactive

test ! -d "${IRONCLIW_STATE_DIR}"

echo "OK"
