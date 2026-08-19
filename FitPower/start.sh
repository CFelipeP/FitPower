#!/bin/bash
# ============================================
# FitPower - Automatic startup
# (Run after setup.sh)
# ============================================
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "[FitPower] Starting services..."

# 1. PHP API
pm2 start "php -S 0.0.0.0:8088 -t api api/index.php" --name fitpower-api 2>/dev/null || \
  pm2 restart fitpower-api
echo "  PHP API: port 8088"

# 2. Proxy
pm2 start proxy-server.js --name fitpower-proxy 2>/dev/null || \
  pm2 restart fitpower-proxy
echo "  Proxy: port 8080"

# 3. Ngrok
pm2 start "ngrok start --all --config ngrok.yml" --name fitpower-ngrok 2>/dev/null || \
  pm2 restart fitpower-ngrok
echo "  Ngrok starting..."

# 4. Esperar ngrok y detectar TURN URL
echo "  Waiting for ngrok..."
sleep 5
for i in $(seq 1 30); do
  if curl -s http://127.0.0.1:4040/api/tunnels > /dev/null 2>&1; then
    echo "  Ngrok ready!"
    break
  fi
  sleep 1
done

TURN_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[] | select(.proto == "tcp") | .public_url' | sed 's/tcp:/turn:/')
WEB_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[] | select(.proto == "https") | .public_url')

echo ""
echo "  Web URL: $WEB_URL"
echo "  TURN URL: $TURN_URL"
echo ""

# 5. Iniciar mediasoup + chat con TURN
export TURN_URL="$TURN_URL"
export TURN_USERNAME="${TURN_USERNAME:-fitpower}"
export TURN_CREDENTIAL="${TURN_CREDENTIAL:-}"

pm2 start mediasoup-server.js --name fitpower-mediasoup 2>/dev/null || \
  pm2 restart fitpower-mediasoup --update-env
pm2 start chat-server.js --name fitpower-chat 2>/dev/null || \
  pm2 restart fitpower-chat

pm2 save

echo ""
echo "========================================"
echo "  FITPOWER READY!"
echo "  Web: $WEB_URL"
echo "========================================"
echo ""
echo "  Users open the link above."
echo "  They do not need to install anything."
echo "  The TURN relay works automatically."
echo ""
