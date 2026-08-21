#!/bin/bash
# FitPowerPro - production backup (DB + config + uploads + nginx)
# Usage: sudo bash deploy/backup.sh   (run on the server; stores under /home/perezpi/backups)
set -e

APP_DIR="/home/perezpi/fitpower"
BK_ROOT="/home/perezpi/backups"
STAMP=$(date +%Y%m%d_%H%M%S)
BK="$BK_ROOT/backup_$STAMP"
mkdir -p "$BK"

# DB (fitpower user, non-root)
cat > /home/perezpi/.my.cnf <<CNF
[client]
user=fitpower
password=FitPowerPi2026!
host=127.0.0.1
CNF
chmod 600 /home/perezpi/.my.cnf
mysqldump --defaults-file=/home/perezpi/.my.cnf --single-transaction fitpower > "$BK/fitpower_db.sql"

# Config + web + uploads
cp "$APP_DIR/api/.env" "$BK/fitpower.env"
cp /etc/nginx/sites-available/fitpower "$BK/nginx_fitpower.conf" 2>/dev/null || true
tar -czf "$BK/uploads.tar.gz" -C "$APP_DIR/api" uploads 2>/dev/null || true

rm -f /home/perezpi/.my.cnf

# Keep the 14 most recent backups
ls -1dt "$BK_ROOT"/backup_* 2>/dev/null | tail -n +15 | xargs -r rm -rf

echo "Backup created: $BK"
ls -la "$BK"
echo "Restore: see deploy/restore.md"
