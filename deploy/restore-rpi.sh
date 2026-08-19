#!/usr/bin/env bash
# FitPower restore: restores the latest (or given) database backup and uploads.
# Usage:
#   sudo bash deploy/restore-rpi.sh                 # latest backup
#   sudo bash deploy/restore-rpi.sh db_2026-08-14_030000.sql.gz  # specific dump
#
# Safety: the current database is dumped first to a .pre-restore file.
set -euo pipefail

BACKUP_DIR="/var/backups/fitpower"
DB_NAME="${DB_NAME:-fitpower}"
DB_USER="${DB_USER:-fitpower}"
TARGET="${1:-}"

if [ -n "$TARGET" ]; then
    DB_FILE="$BACKUP_DIR/$TARGET"
    if [[ "$TARGET" == *.age ]]; then
        DB_AGE="$DB_FILE"
        DB_FILE="${DB_FILE%.age}"
        if ! command -v age >/dev/null 2>&1; then
            echo "ERROR: backup is encrypted but 'age' is not installed"
            exit 1
        fi
        age -d -i /etc/fitpower/age.key -o "$DB_FILE" "$DB_AGE"
    fi
else
    DB_FILE="$(ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | head -n 1 || true)"
    if [ -z "$DB_FILE" ]; then
        echo "ERROR: no database backups found in $BACKUP_DIR"
        exit 1
    fi
fi

[ -f "$DB_FILE" ] || { echo "ERROR: backup file not found: $DB_FILE"; exit 1; }

echo "[restore] Safety dump of the current database..."
mysqldump --single-transaction -u "$DB_USER" -p"${DB_PASS}" "$DB_NAME" 2>/dev/null \
    | gzip > "$BACKUP_DIR/pre-restore_$(date +%F_%H%M%S).sql.gz" || echo "[restore] WARN: safety dump failed"

echo "[restore] Restoring database from $DB_FILE ..."
gunzip -c "$DB_FILE" | mysql -u "$DB_USER" -p"${DB_PASS}" "$DB_NAME"

echo "[restore] Database restored."

UPLOADS_FILE="$(ls -t "$BACKUP_DIR"/uploads_*.tar.gz 2>/dev/null | head -n 1 || true)"
if [ -n "$UPLOADS_FILE" ] && [ -f "$UPLOADS_FILE" ]; then
    echo "[restore] Restoring uploads from $UPLOADS_FILE ..."
    tar -xzf "$UPLOADS_FILE" -C /var/www/fitpower
fi

echo "[restore] Done. Run: php /var/www/fitpower/api/migrate.php  to apply migrations."
echo "[restore] VERIFY the site, then delete the pre-restore dump if everything looks good."
