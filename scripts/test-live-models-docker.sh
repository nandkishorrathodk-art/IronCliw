#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${IRONCLIW_IMAGE:-${IRONCLIW_IMAGE:-Ironcliw:local}}"
CONFIG_DIR="${IRONCLIW_CONFIG_DIR:-${IRONCLIW_CONFIG_DIR:-$HOME/.Ironcliw}}"
WORKSPACE_DIR="${IRONCLIW_WORKSPACE_DIR:-${IRONCLIW_WORKSPACE_DIR:-$HOME/.Ironcliw/workspace}}"
PROFILE_FILE="${IRONCLIW_PROFILE_FILE:-${IRONCLIW_PROFILE_FILE:-$HOME/.profile}}"

PROFILE_MOUNT=()
if [[ -f "$PROFILE_FILE" ]]; then
  PROFILE_MOUNT=(-v "$PROFILE_FILE":/home/node/.profile:ro)
fi

echo "==> Build image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" -f "$ROOT_DIR/Dockerfile" "$ROOT_DIR"

echo "==> Run live model tests (profile keys)"
docker run --rm -t \
  --entrypoint bash \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -e HOME=/home/node \
  -e NODE_OPTIONS=--disable-warning=ExperimentalWarning \
  -e IRONCLIW_LIVE_TEST=1 \
  -e IRONCLIW_LIVE_MODELS="${IRONCLIW_LIVE_MODELS:-${IRONCLIW_LIVE_MODELS:-modern}}" \
  -e IRONCLIW_LIVE_PROVIDERS="${IRONCLIW_LIVE_PROVIDERS:-${IRONCLIW_LIVE_PROVIDERS:-}}" \
  -e IRONCLIW_LIVE_MAX_MODELS="${IRONCLIW_LIVE_MAX_MODELS:-${IRONCLIW_LIVE_MAX_MODELS:-48}}" \
  -e IRONCLIW_LIVE_MODEL_TIMEOUT_MS="${IRONCLIW_LIVE_MODEL_TIMEOUT_MS:-${IRONCLIW_LIVE_MODEL_TIMEOUT_MS:-}}" \
  -e IRONCLIW_LIVE_REQUIRE_PROFILE_KEYS="${IRONCLIW_LIVE_REQUIRE_PROFILE_KEYS:-${IRONCLIW_LIVE_REQUIRE_PROFILE_KEYS:-}}" \
  -v "$CONFIG_DIR":/home/node/.Ironcliw \
  -v "$WORKSPACE_DIR":/home/node/.Ironcliw/workspace \
  "${PROFILE_MOUNT[@]}" \
  "$IMAGE_NAME" \
  -lc "set -euo pipefail; [ -f \"$HOME/.profile\" ] && source \"$HOME/.profile\" || true; cd /app && pnpm test:live"

