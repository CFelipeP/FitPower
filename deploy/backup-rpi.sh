#!/usr/bin/env bash
# FitPower backup: MySQL dump + uploads + env, verified, encrypted when
# possible, with local rotation and optional offsite copy via rclone.
# Usage: sudo bash deploy/backup-rpi.sh
set -euo pipefail

BACKUP_DIR="/var/backups/fitpower"
DATE="$(date +%F_%H%M%S)"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"
OFFSITE_KEEP_DAYS="${BACKUP_OFFSITE_KEEP_DAYS:-30}"
DB_NAME="${DB_NAME:-fitpower}"
DB_USER="${DB_USER:-fitpower}"
LOGFILE="/var/log/fitpower-backup.log"
# Optional: rclone remote for offsite copies (e.g. B2/S3). Leave empty to skip.
RCLONE_REMOTE="${BACKUP_RCLONE_REMOTE:-}"
# Optional: age public key to encrypt archives (e.g. age1...). Leave empty to skip.
AGE_PUBLIC_KEY="${BACKUP_AGE_PUBLIC_KEY:-}"

mkdir -p "$BACKUP_DIR"
log() { echo "[$(date '+%F %T')] $*" | tee -a "$LOGFILE"; }

log "Backup starting"

# 1. Database dump (single transaction for consistency) + verification
log "Dumping database..."
mysqldump --single-transaction --routines --triggers -u "$DB_USER" -p"${DB_PASS}" "$DB_NAME" > "$BACKUP_DIR/db_${DATE}.sql"
gzip -f "$BACKUP_DIR/db_${DATE}.sql"
if ! gzip -t "$BACKUP_DIR/db_${DATE}.sql.gz"; then
    log "ERROR: database dump failed verification"
    exit 1
fi

# 2. Uploads (photos, videos, certificates) — failures here are non-fatal
log "Archiving uploads..."
tar -czf "$BACKUP_DIR/uploads_${DATE}.tar.gz" -C /var/www/fitpower api/uploads 2>/dev/null || log "WARN: uploads archive failed (continuing)"

# 3. Environment file (contains secrets — never leave it in the clear)
cp /var/www/fitpower/api/.env "$BACKUP_DIR/env_${DATE}" 2>/dev/null || log "WARN: .env copy failed"

# 4. Encrypt everything when an age public key is available
if [ -n "$AGE_PUBLIC_KEY" ] && command -v age >/dev/null 2>&1; then
    log "Encrypting backups with age..."
    age -r "$AGE_PUBLIC_KEY" -o "$BACKUP_DIR/db_${DATE}.sql.gz.age" "$BACKUP_DIR/db_${DATE}.sql.gz"
    rm -f "$BACKUP_DIR/db_${DATE}.sql.gz"
    age -r "$AGE_PUBLIC_KEY" -o "$BACKUP_DIR/uploads_${DATE}.tar.gz.age" "$BACKUP_DIR/uploads_${DATE}.tar.gz" 2>/dev/null && rm -f "$BACKUP_DIR/uploads_${DATE}.tar.gz"
    age -r "$AGE_PUBLIC_KEY" -o "$BACKUP_DIR/env_${DATE}.age" "$BACKUP_DIR/env_${DATE}" 2>/dev/null && rm -f "$BACKUP_DIR/env_${DATE}"
elif [ -z "$AGE_PUBLIC_KEY" ]; then
    log "WARN: no age public key configured — backups stored UNENCRYPTED"
fi

# 5. Offsite copy via rclone (optional)
if [ -n "$RCLONE_REMOTE" ] && command -v rclone >/dev/null 2>&1; then
    log "Copying backups offsite to $RCLONE_REMOTE..."
    rclone copy "$BACKUP_DIR" "$RCLONE_REMOTE" --include "db_${DATE}*" --include "uploads_${DATE}*" --include "env_${DATE}*" 2>>"$LOGFILE" \
        && rclone delete "$RCLONE_REMOTE" --min-age "${OFFSITE_KEEP_DAYS}d" 2>>"$LOGFILE" \
        || log "WARN: offsite copy failed (backups remain local only)"
elif [ -n "$RCLONE_REMOTE" ]; then
    log "WARN: rclone not installed — offsite copy skipped"
fi

# 6. Local rotation
log "Rotating local backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -type f -mtime +"$KEEP_DAYS" -delete

log "Backup complete:"
ls -lh "$BACKUP_DIR" | tail -n +2 | tee -a "$LOGFILE"
