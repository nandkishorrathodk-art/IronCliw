#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="Ironcliw-sandbox-browser:bookworm-slim"

docker build -t "${IMAGE_NAME}" -f Dockerfile.sandbox-browser .
echo "Built ${IMAGE_NAME}"

