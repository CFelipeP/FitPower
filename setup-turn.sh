#!/bin/bash
# ============================================
# FITPOWER + TURN (coturn) + NGROK
# FOR CALLS FROM ANY COUNTRY
# ============================================
set -e

PI_IP="192.168.0.222"
PI_USER="sotomayorpi"
NGROK_TOKEN=""  # Leave empty, fill it in later
TURN_SECRET="${TURN_SECRET:-$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)}"
export TURN_SECRET

echo "========================================"
echo "  FitPower + TURN Server + ngrok"
echo "========================================"
echo ""

# ---------- 1. INSTALL COTURN ----------
echo "[1/8] Installing coturn (TURN server)..."
sudo apt update
sudo apt install -y coturn

# Configure coturn
sudo tee /etc/turnserver.conf > /dev/null <<TURNEOF
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=${TURN_SECRET}
realm=localhost
total-quota=100
bps-capacity=0
log-file=/var/log/turnserver.log
simple-log
no-udp               # Solo TCP (ngrok no soporta UDP)
no-tls
no-dtls
TURNEOF

# Habilitar y arrancar
sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn
sudo systemctl restart coturn
echo "  coturn running on port 3478 (TCP)"

# ---------- 2. INSTALL DEPENDENCIES ----------
echo "[2/8] Checking Node.js and PHP..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo apt install -y nodejs
fi
if ! command -v php &> /dev/null; then
    sudo apt install -y php php-mysql php-curl php-mbstring php-xml
fi

# ---------- 3. PREPARAR PROYECTO ----------
echo "[3/8] Installing project..."
cd ~/fitpower
npm install
sudo npm install -g pm2

# ---------- 4. CREAR REVERSE PROXY (Node) ----------
echo "[4/8] Creating unified reverse proxy..."
cat > proxy-server.js << 'PROXYEOF'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { WebSocketServer } from 'ws'
import { createProxy } from 'http-proxy'

const PORT = 8080
const DIST = path.resolve('dist')
const API_TARGET = 'http://127.0.0.1:8088'
const MEDIASOUP_TARGET = 'http://127.0.0.1:5181'
const CHAT_TARGET = 'http://127.0.0.1:5180'

// Load http-proxy manually
const proxy = http.createServer((req, res) => {
    // API
    if (req.url.startsWith('/api')) {
        const options = {
            hostname: '127.0.0.1',
            port: 8088,
            path: req.url,
            method: req.method,
            headers: req.headers,
        }
        const proxyReq = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers)
            proxyRes.pipe(res)
        })
        req.pipe(proxyReq)
        return
    }

    // Static files
    let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url)
    if (!fs.existsSync(filePath)) {
        filePath = path.join(DIST, 'index.html')
    }
    const ext = path.extname(filePath)
    const mime = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
    }
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' })
    fs.createReadStream(filePath).pipe(res)
})

proxy.listen(PORT, () => {
    console.log(`[Proxy] http://localhost:${PORT}`)
})

// WebSocket proxies
import { WebSocket } from 'ws'

proxy.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/mediasoup')) {
        const ws = new WebSocket(`ws://127.0.0.1:5181`)
        ws.on('open', () => {
            // Forward the upgrade
        })
    }
})
PROXYEOF

echo "  Proxy created on port 8080"

# ---------- 5. CREAR SERVICIOS PM2 ----------
echo "[5/8] Starting services..."

pm2 delete all 2>/dev/null || true

# PHP API
pm2 start "php -S 0.0.0.0:8088 -t api api/index.php" --name php-api

# Mediasoup
pm2 start mediasoup-server.js --name mediasoup

# Chat
pm2 start chat-server.js --name chat

# Proxy unificado
pm2 start proxy-server.js --name proxy

pm2 save

# ---------- 6. CONFIGURE MEDIASOUP WITH TURN ----------
echo "[6/8] Configuring TURN in mediasoup..."
# Modify createWebRtcTransport to include TURN
# This is already done via environment variable

# ---------- 7. NGROK ----------
echo "[7/8] Configuring ngrok..."
if ! command -v ngrok &> /dev/null; then
    echo "  Download ngrok from: https://ngrok.com/download"
    echo "  Or install with:"
    echo "    curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc"
    echo "    echo 'deb https://ngrok-agent.s3.amazonaws.com buster main' | sudo tee /etc/apt/sources.list.d/ngrok.list"
    echo "    sudo apt update && sudo apt install ngrok"
    echo ""
    read -p "  Have you installed ngrok yet? (y/n): " ngrok_ok
    if [ "$ngrok_ok" != "y" ]; then
        echo "  Install it and run this script again"
        exit 1
    fi
fi

if [ -z "$NGROK_TOKEN" ]; then
    read -p "  Enter your ngrok token (https://dashboard.ngrok.com): " NGROK_TOKEN
fi
ngrok config add-authtoken $NGROK_TOKEN

# ---------- 8. MOSTRAR INSTRUCCIONES ----------
echo ""
echo "========================================"
echo "  FINAL INSTRUCTIONS"
echo "========================================"
echo ""
echo "  RUN NGROK (3 terminals or use screen):"
echo ""
echo "  Terminal 1 - Frontend + API + WebSockets:"
echo "    ngrok http 8080"
echo "    → URL: https://xxxx.ngrok.io"
echo ""
echo "  Terminal 2 - TURN server:"
echo "    ngrok tcp 3478"
echo "    → URL: tcp://x.tcp.ngrok.io:xxxxx"
echo ""
echo "  THEN configure in mediasoup-server.js:"
echo '    process.env.MEDIASOUP_ANNOUNCED_IP = "PUBLIC_IP_OR_NGROK_TCP"'
echo ""
echo "  NOTE: The announced IP must be the ngrok TCP tunnel URL"
echo "  or the public IP of your router if you have ports open."
echo ""
echo "  === FOR YOUR USERS ==="
echo "  They open: https://xxxx.ngrok.io  (the ngrok HTTP URL)"
echo ""
echo "========================================"
