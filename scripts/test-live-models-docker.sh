#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${IRONCLIW_IMAGE:-${CLAWDBOT_IMAGE:-ironcliw:local}}"
CONFIG_DIR="${IRONCLIW_CONFIG_DIR:-${CLAWDBOT_CONFIG_DIR:-$HOME/.ironcliw}}"
WORKSPACE_DIR="${IRONCLIW_WORKSPACE_DIR:-${CLAWDBOT_WORKSPACE_DIR:-$HOME/.ironcliw/workspace}}"
PROFILE_FILE="${IRONCLIW_PROFILE_FILE:-${CLAWDBOT_PROFILE_FILE:-$HOME/.profile}}"

PROFILE_MOUNT=()
if [[ -f "$PROFILE_FILE" ]]; then
  PROFILE_MOUNT=(-v "$PROFILE_FILE":/home/node/.profile:ro)
fi

read -r -d '' LIVE_TEST_CMD <<'EOF' || true
set -euo pipefail
[ -f "$HOME/.profile" ] && source "$HOME/.profile" || true
tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT
tar -C /src \
  --exclude=.git \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=ui/dist \
  --exclude=ui/node_modules \
  -cf - . | tar -C "$tmp_dir" -xf -
ln -s /app/node_modules "$tmp_dir/node_modules"
ln -s /app/dist "$tmp_dir/dist"
cd "$tmp_dir"
pnpm test:live
EOF

echo "==> Build image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" -f "$ROOT_DIR/Dockerfile" "$ROOT_DIR"

echo "==> Run live model tests (profile keys)"
docker run --rm -t \
  --entrypoint bash \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -e HOME=/home/node \
  -e NODE_OPTIONS=--disable-warning=ExperimentalWarning \
  -e IRONCLIW_LIVE_TEST=1 \
  -e IRONCLIW_LIVE_MODELS="${IRONCLIW_LIVE_MODELS:-${CLAWDBOT_LIVE_MODELS:-modern}}" \
  -e IRONCLIW_LIVE_PROVIDERS="${IRONCLIW_LIVE_PROVIDERS:-${CLAWDBOT_LIVE_PROVIDERS:-}}" \
  -e IRONCLIW_LIVE_MAX_MODELS="${IRONCLIW_LIVE_MAX_MODELS:-${CLAWDBOT_LIVE_MAX_MODELS:-48}}" \
  -e IRONCLIW_LIVE_MODEL_TIMEOUT_MS="${IRONCLIW_LIVE_MODEL_TIMEOUT_MS:-${CLAWDBOT_LIVE_MODEL_TIMEOUT_MS:-}}" \
  -e IRONCLIW_LIVE_REQUIRE_PROFILE_KEYS="${IRONCLIW_LIVE_REQUIRE_PROFILE_KEYS:-${CLAWDBOT_LIVE_REQUIRE_PROFILE_KEYS:-}}" \
  -v "$ROOT_DIR":/src:ro \
  -v "$CONFIG_DIR":/home/node/.ironcliw \
  -v "$WORKSPACE_DIR":/home/node/.ironcliw/workspace \
  "${PROFILE_MOUNT[@]}" \
  "$IMAGE_NAME" \
  -lc "$LIVE_TEST_CMD"
