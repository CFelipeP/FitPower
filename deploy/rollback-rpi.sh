#!/usr/bin/env bash
# FitPower rollback: switches the live directory back to the previous release.
# Usage: sudo bash deploy/rollback-rpi.sh [release-dir]
set -euo pipefail

LIVE_DIR="/var/www/fitpower"
RELEASES_DIR="/var/www/fitpower-releases"

TARGET="${1:-}"

if [ -z "$TARGET" ]; then
    CURRENT="$(readlink -f "$LIVE_DIR" 2>/dev/null || true)"
    TARGET="$(ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null | head -n 1 | tr -d ' ')"
    if [ "$CURRENT" = "$TARGET" ]; then
        TARGET="$(ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null | sed -n '2p')"
    fi
fi

if [ -z "$TARGET" ] || [ ! -d "$TARGET" ]; then
    echo "No previous release found to roll back to."
    echo "Current live: $(readlink -f "$LIVE_DIR" 2>/dev/null || echo "$LIVE_DIR")"
    exit 1
fi

echo "[rollback] Switching to $TARGET"
ln -sfn "$TARGET" "$LIVE_DIR"

HEALTH="$(curl -s -m 5 http://127.0.0.1/api/health || true)"
if echo "$HEALTH" | grep -q '"database":"ok"'; then
    echo "[rollback] OK — live release is now $TARGET"
else
    echo "[rollback] WARN: health check failed after rollback. Check Apache and the database."
fi
