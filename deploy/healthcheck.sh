#!/bin/bash
# FitPowerPro - health check (services, endpoints, resources)
# Usage: bash deploy/healthcheck.sh   (safe, read-only)
APP_DIR="/home/perezpi/fitpower"
FAIL=0
ok(){ echo "OK   $1"; }
bad(){ echo "FAIL $1"; FAIL=1; }

echo "== Services =="
for svc in fitpower-api fitpower-chat fitpower-push nginx mariadb; do
  systemctl is-active --quiet "$svc" && ok "$svc" || bad "$svc"
done

echo "== Endpoints =="
curl -sf http://127.0.0.1/api/health >/dev/null && ok "/api/health" || bad "/api/health"
curl -sf -o /dev/null http://127.0.0.1/ && ok "frontend /" || bad "frontend /"

echo "== Resources =="
MEM=$(free -m | awk 'NR==2{printf "%.0f", $7*100/$2}')
echo "mem available: ${MEM}%"
DISK=$(df -h / | awk 'NR==2{print $5}')
echo "disk used: $DISK"
TEMP=$(vcgencmd measure_temp 2>/dev/null || echo "n/a")
echo "temp: $TEMP"

[ $FAIL -eq 0 ] && echo "HEALTH: OK" || echo "HEALTH: PROBLEMS FOUND"
