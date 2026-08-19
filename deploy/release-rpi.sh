#!/usr/bin/env bash
# FitPower release-based deployment: keeps the previous release for instant
# rollback. Expects a new release prepared in /var/www/fitpower-release-new
# (public/ + api/). Swaps the live directory atomically via symlink.
# Usage: sudo bash deploy/release-rpi.sh /path/to/new-release
set -euo pipefail

NEW_RELEASE="${1:-}"
LIVE_DIR="/var/www/fitpower"
RELEASES_DIR="/var/www/fitpower-releases"
HEALTH_URL="http://127.0.0.1/api/health"
MAX_RELEASES=5

if [ -z "$NEW_RELEASE" ] || [ ! -d "$NEW_RELEASE" ]; then
    echo "Usage: $0 <path-to-new-release-dir>"
    echo "The release dir must contain 'public/' and 'api/' subdirectories."
    exit 1
fi

STAMP="$(date +%Y%m%d%H%M%S)"
RELEASE_DIR="$RELEASES_DIR/$STAMP"

echo "[release] Preparing release $STAMP from $NEW_RELEASE"
mkdir -p "$RELEASES_DIR"
cp -r "$NEW_RELEASE" "$RELEASE_DIR"

# Migrations must run BEFORE the switch (they are forward-compatible) and
# must fail the release if broken.
if [ -d "$RELEASE_DIR/api/database/migrations" ]; then
    echo "[release] Running migrations..."
    (cd "$RELEASE_DIR/api" && php migrate.php)
fi

# Smoke test the new release BEFORE switching: serve is done by Apache from
# the live dir, so we switch first and health-check immediately, rolling back
# automatically on failure.
echo "[release] Switching live symlink..."
OLD_TARGET="$(readlink -f "$LIVE_DIR" || echo "$LIVE_DIR")"
ln -sfn "$RELEASE_DIR" "$LIVE_DIR"

sleep 1
HEALTH="$(curl -s -m 5 "$HEALTH_URL" || true)"
if echo "$HEALTH" | grep -q '"database":"ok"'; then
    echo "[release] Health check OK — release $STAMP is live."
    # Prune old releases (keep the last N, always keep the previous one).
    ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null | tail -n +$((MAX_RELEASES + 1)) | xargs -r rm -rf
    echo "[release] Rollback with: sudo ln -sfn \"$OLD_TARGET\" \"$LIVE_DIR\""
else
    echo "[release] Health check FAILED — rolling back to previous release."
    ln -sfn "$OLD_TARGET" "$LIVE_DIR"
    exit 1
fi
