#!/usr/bin/env bash
# FitPower health monitor: checks disk space, API health and service status.
# Alerts via email when something is wrong (only when SMTP is configured).
# Usage: sudo bash deploy/check-health.sh
set -uo pipefail

HEALTH_URL="http://127.0.0.1/api/health"
ALERT_EMAIL="${ALERT_EMAIL:-}"
LOG="/var/log/fitpower-health.log"
PROBLEMS=0

log() { echo "[$(date '+%F %T')] $*" >> "$LOG"; }

# 1. Disk space (warn under 20%, critical under 10%)
DISK_PCT=$(df / | awk 'NR==2 {gsub("%","",$5); print $5}')
if [ "$DISK_PCT" -ge 90 ]; then
    log "CRITICAL: disk usage at ${DISK_PCT}%"
    PROBLEMS=$((PROBLEMS + 1))
elif [ "$DISK_PCT" -ge 80 ]; then
    log "WARN: disk usage at ${DISK_PCT}%"
fi

# 2. API health
HEALTH=$(curl -s -m 5 "$HEALTH_URL" || true)
if echo "$HEALTH" | grep -q '"database":"ok"'; then
    log "OK: API + DB healthy (disk ${DISK_PCT}%)"
else
    log "CRITICAL: API health check failed: ${HEALTH:-no response}"
    PROBLEMS=$((PROBLEMS + 1))
fi

# 3. Web server + MariaDB services (Apache or Nginx depending on setup)
for svc in apache2 nginx mariadb; do
    if systemctl list-unit-files "$svc.service" 2>/dev/null | grep -q "$svc"; then
        if ! systemctl is-active --quiet "$svc"; then
            log "CRITICAL: service $svc is not running"
            PROBLEMS=$((PROBLEMS + 1))
        fi
    fi
done

# 4. Node services under PM2 (chat + mediasoup), when PM2 is present
if command -v pm2 >/dev/null 2>&1; then
    for app in fitpower-chat fitpower-mediasoup; do
        if ! pm2 jlist 2>/dev/null | grep -q "\"name\":\"$app\""; then
            log "CRITICAL: PM2 app $app is not registered"
            PROBLEMS=$((PROBLEMS + 1))
        fi
    done
fi

# 5. Alert by email when problems were found
if [ "$PROBLEMS" -gt 0 ] && [ -n "$ALERT_EMAIL" ]; then
    tail -n 10 "$LOG" | mail -s "FitPower health alert: $PROBLEMS problem(s)" "$ALERT_EMAIL" 2>/dev/null || true
fi

exit 0
