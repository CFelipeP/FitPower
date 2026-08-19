#!/bin/bash
# ============================================
# FULL SETUP: FitPower + Tailscale + PM2
# Run on the Raspberry Pi:
#   chmod +x setup-tailscale.sh && ./setup-tailscale.sh
# ============================================
set -e

echo "========================================"
echo "  FitPower - Full installation"
echo "========================================"

# ---------- 1. TAILSCALE ----------
echo "[1/6] Installing Tailscale..."
curl -fsSL https://tailscale.com/install.sh | sh
echo "  Done. Sign in with:"
echo "    sudo tailscale up"
echo "  Then note the IP (100.x.x.x) with:"
echo "    tailscale ip -4"
echo ""

read -p "Have you signed in to Tailscale yet? (y/n): " ok
if [ "$ok" != "y" ]; then
    echo "Run: sudo tailscale up"
    echo "Run this script again afterwards"
    exit 1
fi

TS_IP=$(tailscale ip -4)
echo "  Tailscale IP: $TS_IP"

# ---------- 2. INSTALL NODE + PHP (if missing) ----------
echo "[2/6] Checking dependencies..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo apt install -y nodejs
fi
if ! command -v php &> /dev/null; then
    sudo apt install -y php php-mysql php-curl php-mbstring php-xml
fi

# ---------- 3. PREPARAR CARPETA ----------
echo "[3/6] Preparing project..."
cd ~/fitpower

# ---------- 4. INSTALL DEPENDENCIES ----------
echo "[4/6] Installing npm packages..."
npm install
sudo npm install -g pm2

# Rebuild frontend with the correct Tailscale IP
echo "  Rebuilding frontend with IP: $TS_IP..."
VITE_MEDIASOUP_WS_URL="ws://$TS_IP:5181" VITE_WS_URL="ws://$TS_IP:5180" npx vite build

# ---------- 5. CREAR SERVICIOS PM2 ----------
echo "[5/6] Creating PM2 services..."
pm2 delete all 2>/dev/null || true

# Mediasoup (con Tailscale IP)
MEDIASOUP_ANNOUNCED_IP=$TS_IP pm2 start mediasoup-server.js --name mediasoup

# Chat
pm2 start chat-server.js --name chat

# API PHP
pm2 start "php -S 0.0.0.0:8088 -t api api/index.php" --name php-api

# Frontend
pm2 serve dist/ 5177 --name frontend --spa

# Save and auto-start
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u sotomayorpi --hp /home/sotomayorpi

# ---------- 6. MOSTRAR INSTRUCCIONES ----------
echo ""
echo "========================================"
echo "  INSTALLATION COMPLETE"
echo "========================================"
echo ""
echo "  Frontend: http://$TS_IP:5177"
echo "  API:      http://$TS_IP:8088"
echo "  Chat WS:  ws://$TS_IP:5180"
echo "  Mediasoup: ws://$TS_IP:5181"
echo ""
echo "  === FOR YOUR TEAMMATES ==="
echo "  1. Install Tailscale on their PC/Mobile"
echo "     https://tailscale.com/download"
echo "  2. Sign in with their Google account"
echo "  3. Open: http://$TS_IP:5177"
echo ""
echo "  === YOU (ADMIN) ==="
echo "  Your PC with Tailscale can also"
echo "  access the same IP."
echo ""
echo "  === ADMINISTRATION ==="
echo "  View logs:   pm2 logs"
echo "  Restart:     pm2 restart all"
echo "  Stop:        pm2 stop all"
echo "========================================"
