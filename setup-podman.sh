#!/usr/bin/env bash
# One-time host setup for rootless IronCliw in Podman: creates the ironcliw
# user, builds the image, loads it into that user's Podman store, and installs
# the launch script. Run from repo root with sudo capability.
#
# Usage: ./setup-podman.sh [--quadlet|--container]
#   --quadlet   Install systemd Quadlet so the container runs as a user service
#   --container Only install user + image + launch script; you start the container manually (default)
#   Or set IRONCLIW_PODMAN_QUADLET=1 (or 0) to choose without a flag.
#
# After this, start the gateway manually:
#   ./scripts/run-ironcliw-podman.sh launch
#   ./scripts/run-ironcliw-podman.sh launch setup   # onboarding wizard
# Or as the ironcliw user: sudo -u ironcliw /home/ironcliw/run-ironcliw-podman.sh
# If you used --quadlet, you can also: sudo systemctl --machine ironcliw@ --user start ironcliw.service
set -euo pipefail

IRONCLIW_USER="${IRONCLIW_PODMAN_USER:-ironcliw}"
REPO_PATH="${IRONCLIW_REPO_PATH:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
RUN_SCRIPT_SRC="$REPO_PATH/scripts/run-ironcliw-podman.sh"
QUADLET_TEMPLATE="$REPO_PATH/scripts/podman/ironcliw.container.in"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing dependency: $1" >&2
    exit 1
  fi
}

is_writable_dir() {
  local dir="$1"
  [[ -n "$dir" && -d "$dir" && ! -L "$dir" && -w "$dir" && -x "$dir" ]]
}

is_safe_tmp_base() {
  local dir="$1"
  local mode=""
  local owner=""
  is_writable_dir "$dir" || return 1
  mode="$(stat -Lc '%a' "$dir" 2>/dev/null || true)"
  if [[ -n "$mode" ]]; then
    local perm=$((8#$mode))
    if (( (perm & 0022) != 0 && (perm & 01000) == 0 )); then
      return 1
    fi
  fi
  if is_root; then
    owner="$(stat -Lc '%u' "$dir" 2>/dev/null || true)"
    if [[ -n "$owner" && "$owner" != "0" ]]; then
      return 1
    fi
  fi
  return 0
}

resolve_image_tmp_dir() {
  if ! is_root && is_safe_tmp_base "${TMPDIR:-}"; then
    printf '%s' "$TMPDIR"
    return 0
  fi
  if is_safe_tmp_base "/var/tmp"; then
    printf '%s' "/var/tmp"
    return 0
  fi
  if is_safe_tmp_base "/tmp"; then
    printf '%s' "/tmp"
    return 0
  fi
  printf '%s' "/tmp"
}

is_root() { [[ "$(id -u)" -eq 0 ]]; }

run_root() {
  if is_root; then
    "$@"
  else
    sudo "$@"
  fi
}

run_as_user() {
  # When switching users, the caller's cwd may be inaccessible to the target
  # user (e.g. a private home dir). Wrap in a subshell that cd's to a
  # world-traversable directory so sudo/runuser don't fail with "cannot chdir".
  # TODO: replace with fully rootless podman build to eliminate the need for
  # user-switching entirely.
  local user="$1"
  shift
  if command -v sudo >/dev/null 2>&1; then
    ( cd /tmp 2>/dev/null || cd /; sudo -u "$user" "$@" )
  elif is_root && command -v runuser >/dev/null 2>&1; then
    ( cd /tmp 2>/dev/null || cd /; runuser -u "$user" -- "$@" )
  else
    echo "Need sudo (or root+runuser) to run commands as $user." >&2
    exit 1
  fi
}

run_as_ironcliw() {
  # Avoid root writes into $IRONCLIW_HOME (symlink/hardlink/TOCTOU footguns).
  # Anything under the target user's home should be created/modified as that user.
  run_as_user "$IRONCLIW_USER" env HOME="$IRONCLIW_HOME" "$@"
}

escape_sed_replacement_pipe_delim() {
  # Escape replacement metacharacters for sed "s|...|...|g" replacement text.
  printf '%s' "$1" | sed -e 's/[\\&|]/\\&/g'
}

# Quadlet: opt-in via --quadlet or IRONCLIW_PODMAN_QUADLET=1
INSTALL_QUADLET=false
for arg in "$@"; do
  case "$arg" in
    --quadlet)   INSTALL_QUADLET=true ;;
    --container) INSTALL_QUADLET=false ;;
  esac
done
if [[ -n "${IRONCLIW_PODMAN_QUADLET:-}" ]]; then
  case "${IRONCLIW_PODMAN_QUADLET,,}" in
    1|yes|true)  INSTALL_QUADLET=true ;;
    0|no|false) INSTALL_QUADLET=false ;;
  esac
fi

require_cmd podman
if ! is_root; then
  require_cmd sudo
fi
if [[ ! -f "$REPO_PATH/Dockerfile" ]]; then
  echo "Dockerfile not found at $REPO_PATH. Set IRONCLIW_REPO_PATH to the repo root." >&2
  exit 1
fi
if [[ ! -f "$RUN_SCRIPT_SRC" ]]; then
  echo "Launch script not found at $RUN_SCRIPT_SRC." >&2
  exit 1
fi

generate_token_hex_32() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
    return 0
  fi
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
    return 0
  fi
  if command -v od >/dev/null 2>&1; then
    # 32 random bytes -> 64 lowercase hex chars
    od -An -N32 -tx1 /dev/urandom | tr -d " \n"
    return 0
  fi
  echo "Missing dependency: need openssl or python3 (or od) to generate IRONCLIW_GATEWAY_TOKEN." >&2
  exit 1
}

user_exists() {
  local user="$1"
  if command -v getent >/dev/null 2>&1; then
    getent passwd "$user" >/dev/null 2>&1 && return 0
  fi
  id -u "$user" >/dev/null 2>&1
}

resolve_user_home() {
  local user="$1"
  local home=""
  if command -v getent >/dev/null 2>&1; then
    home="$(getent passwd "$user" 2>/dev/null | cut -d: -f6 || true)"
  fi
  if [[ -z "$home" && -f /etc/passwd ]]; then
    home="$(awk -F: -v u="$user" '$1==u {print $6}' /etc/passwd 2>/dev/null || true)"
  fi
  if [[ -z "$home" ]]; then
    home="/home/$user"
  fi
  printf '%s' "$home"
}

resolve_nologin_shell() {
  for cand in /usr/sbin/nologin /sbin/nologin /usr/bin/nologin /bin/false; do
    if [[ -x "$cand" ]]; then
      printf '%s' "$cand"
      return 0
    fi
  done
  printf '%s' "/usr/sbin/nologin"
}

# Create ironcliw user (non-login, with home) if missing
if ! user_exists "$IRONCLIW_USER"; then
  NOLOGIN_SHELL="$(resolve_nologin_shell)"
  echo "Creating user $IRONCLIW_USER ($NOLOGIN_SHELL, with home)..."
  if command -v useradd >/dev/null 2>&1; then
    run_root useradd -m -s "$NOLOGIN_SHELL" "$IRONCLIW_USER"
  elif command -v adduser >/dev/null 2>&1; then
    # Debian/Ubuntu: adduser supports --disabled-password/--gecos. Busybox adduser differs.
    run_root adduser --disabled-password --gecos "" --shell "$NOLOGIN_SHELL" "$IRONCLIW_USER"
  else
    echo "Neither useradd nor adduser found, cannot create user $IRONCLIW_USER." >&2
    exit 1
  fi
else
  echo "User $IRONCLIW_USER already exists."
fi

IRONCLIW_HOME="$(resolve_user_home "$IRONCLIW_USER")"
IRONCLIW_UID="$(id -u "$IRONCLIW_USER" 2>/dev/null || true)"
IRONCLIW_CONFIG="$IRONCLIW_HOME/.ironcliw"
LAUNCH_SCRIPT_DST="$IRONCLIW_HOME/run-ironcliw-podman.sh"

# Prefer systemd user services (Quadlet) for production. Enable lingering early so rootless Podman can run
# without an interactive login.
if command -v loginctl &>/dev/null; then
  run_root loginctl enable-linger "$IRONCLIW_USER" 2>/dev/null || true
fi
if [[ -n "${IRONCLIW_UID:-}" && -d /run/user ]] && command -v systemctl &>/dev/null; then
  run_root systemctl start "user@${IRONCLIW_UID}.service" 2>/dev/null || true
fi

# Rootless Podman needs subuid/subgid for the run user
if ! grep -q "^${IRONCLIW_USER}:" /etc/subuid 2>/dev/null; then
  echo "Warning: $IRONCLIW_USER has no subuid range. Rootless Podman may fail." >&2
  echo "  Add a line to /etc/subuid and /etc/subgid, e.g.: $IRONCLIW_USER:100000:65536" >&2
fi

echo "Creating $IRONCLIW_CONFIG and workspace..."
run_as_ironcliw mkdir -p "$IRONCLIW_CONFIG/workspace"
run_as_ironcliw chmod 700 "$IRONCLIW_CONFIG" "$IRONCLIW_CONFIG/workspace" 2>/dev/null || true

ENV_FILE="$IRONCLIW_CONFIG/.env"
if run_as_ironcliw test -f "$ENV_FILE"; then
  if ! run_as_ironcliw grep -q '^IRONCLIW_GATEWAY_TOKEN=' "$ENV_FILE" 2>/dev/null; then
    TOKEN="$(generate_token_hex_32)"
    printf 'IRONCLIW_GATEWAY_TOKEN=%s\n' "$TOKEN" | run_as_ironcliw tee -a "$ENV_FILE" >/dev/null
    echo "Added IRONCLIW_GATEWAY_TOKEN to $ENV_FILE."
  fi
  run_as_ironcliw chmod 600 "$ENV_FILE" 2>/dev/null || true
else
  TOKEN="$(generate_token_hex_32)"
  printf 'IRONCLIW_GATEWAY_TOKEN=%s\n' "$TOKEN" | run_as_ironcliw tee "$ENV_FILE" >/dev/null
  run_as_ironcliw chmod 600 "$ENV_FILE" 2>/dev/null || true
  echo "Created $ENV_FILE with new token."
fi

# The gateway refuses to start unless gateway.mode=local is set in config.
# Make first-run non-interactive; users can run the wizard later to configure channels/providers.
IRONCLIW_JSON="$IRONCLIW_CONFIG/ironcliw.json"
if ! run_as_ironcliw test -f "$IRONCLIW_JSON"; then
  printf '%s\n' '{ gateway: { mode: "local" } }' | run_as_ironcliw tee "$IRONCLIW_JSON" >/dev/null
  run_as_ironcliw chmod 600 "$IRONCLIW_JSON" 2>/dev/null || true
  echo "Created $IRONCLIW_JSON (minimal gateway.mode=local)."
fi

echo "Building image from $REPO_PATH..."
BUILD_ARGS=()
[[ -n "${IRONCLIW_DOCKER_APT_PACKAGES:-}" ]] && BUILD_ARGS+=(--build-arg "IRONCLIW_DOCKER_APT_PACKAGES=${IRONCLIW_DOCKER_APT_PACKAGES}")
[[ -n "${IRONCLIW_EXTENSIONS:-}" ]] && BUILD_ARGS+=(--build-arg "IRONCLIW_EXTENSIONS=${IRONCLIW_EXTENSIONS}")
podman build ${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"} -t ironcliw:local -f "$REPO_PATH/Dockerfile" "$REPO_PATH"

echo "Loading image into $IRONCLIW_USER's Podman store..."
TMP_IMAGE_DIR="$(resolve_image_tmp_dir)"
echo "Using temporary image dir: $TMP_IMAGE_DIR"
TMP_STAGE_DIR="$(mktemp -d -p "$TMP_IMAGE_DIR" ironcliw-image.XXXXXX)"
TMP_IMAGE="$TMP_STAGE_DIR/image.tar"
chmod 700 "$TMP_STAGE_DIR"
trap 'rm -rf "$TMP_STAGE_DIR"' EXIT
podman save ironcliw:local -o "$TMP_IMAGE"
chmod 600 "$TMP_IMAGE"
# Stream the image into the target user's podman load so private temp directories
# do not need to be traversable by $IRONCLIW_USER.
cat "$TMP_IMAGE" | run_as_user "$IRONCLIW_USER" env HOME="$IRONCLIW_HOME" podman load
rm -rf "$TMP_STAGE_DIR"
trap - EXIT

echo "Copying launch script to $LAUNCH_SCRIPT_DST..."
run_root cat "$RUN_SCRIPT_SRC" | run_as_ironcliw tee "$LAUNCH_SCRIPT_DST" >/dev/null
run_as_ironcliw chmod 755 "$LAUNCH_SCRIPT_DST"

# Optionally install systemd quadlet for ironcliw user (rootless Podman + systemd)
QUADLET_DIR="$IRONCLIW_HOME/.config/containers/systemd"
if [[ "$INSTALL_QUADLET" == true && -f "$QUADLET_TEMPLATE" ]]; then
  echo "Installing systemd quadlet for $IRONCLIW_USER..."
  run_as_ironcliw mkdir -p "$QUADLET_DIR"
  IRONCLIW_HOME_SED="$(escape_sed_replacement_pipe_delim "$IRONCLIW_HOME")"
  sed "s|{{IRONCLIW_HOME}}|$IRONCLIW_HOME_SED|g" "$QUADLET_TEMPLATE" | run_as_ironcliw tee "$QUADLET_DIR/ironcliw.container" >/dev/null
  run_as_ironcliw chmod 700 "$IRONCLIW_HOME/.config" "$IRONCLIW_HOME/.config/containers" "$QUADLET_DIR" 2>/dev/null || true
  run_as_ironcliw chmod 600 "$QUADLET_DIR/ironcliw.container" 2>/dev/null || true
  if command -v systemctl &>/dev/null; then
    run_root systemctl --machine "${IRONCLIW_USER}@" --user daemon-reload 2>/dev/null || true
    run_root systemctl --machine "${IRONCLIW_USER}@" --user enable ironcliw.service 2>/dev/null || true
    run_root systemctl --machine "${IRONCLIW_USER}@" --user start ironcliw.service 2>/dev/null || true
  fi
fi

echo ""
echo "Setup complete. Start the gateway:"
echo "  $RUN_SCRIPT_SRC launch"
echo "  $RUN_SCRIPT_SRC launch setup   # onboarding wizard"
echo "Or as $IRONCLIW_USER (e.g. from cron):"
echo "  sudo -u $IRONCLIW_USER $LAUNCH_SCRIPT_DST"
echo "  sudo -u $IRONCLIW_USER $LAUNCH_SCRIPT_DST setup"
if [[ "$INSTALL_QUADLET" == true ]]; then
  echo "Or use systemd (quadlet):"
  echo "  sudo systemctl --machine ${IRONCLIW_USER}@ --user start ironcliw.service"
  echo "  sudo systemctl --machine ${IRONCLIW_USER}@ --user status ironcliw.service"
else
  echo "To install systemd quadlet later: $0 --quadlet"
fi
