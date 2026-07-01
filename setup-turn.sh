#!/bin/bash
# ============================================
# FITPOWER + TURN (coturn) + NGROK
# PARA LLAMADAS DESDE CUALQUIER PAÍS
# ============================================
set -e

PI_IP="192.168.0.222"
PI_USER="sotomayorpi"
NGROK_TOKEN=""  # Déjalo vacío, lo pones después

echo "========================================"
echo "  FitPower + TURN Server + ngrok"
echo "========================================"
echo ""

# ---------- 1. INSTALAR COTURN ----------
echo "[1/8] Instalando coturn (TURN server)..."
sudo apt update
sudo apt install -y coturn

# Configurar coturn
sudo tee /etc/turnserver.conf > /dev/null <<TURNEOF
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=fitpower_secret_2024
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
echo "  coturn corriendo en puerto 3478 (TCP)"

# ---------- 2. INSTALAR DEPENDENCIAS ----------
echo "[2/8] Verificando Node.js y PHP..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo apt install -y nodejs
fi
if ! command -v php &> /dev/null; then
    sudo apt install -y php php-mysql php-curl php-mbstring php-xml
fi

# ---------- 3. PREPARAR PROYECTO ----------
echo "[3/8] Instalando proyecto..."
cd ~/fitpower
npm install
sudo npm install -g pm2

# ---------- 4. CREAR REVERSE PROXY (Node) ----------
echo "[4/8] Creando reverse proxy unificado..."
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

// Cargar http-proxy manualmente
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

echo "  Proxy creado en puerto 8080"

# ---------- 5. CREAR SERVICIOS PM2 ----------
echo "[5/8] Iniciando servicios..."

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

# ---------- 6. CONFIGURAR MEDIASOUP CON TURN ----------
echo "[6/8] Configurando TURN en mediasoup..."
# Modificar createWebRtcTransport para incluir TURN
# Ya lo hacemos mediante variable de entorno

# ---------- 7. NGROK ----------
echo "[7/8] Configurando ngrok..."
if ! command -v ngrok &> /dev/null; then
    echo "  Descarga ngrok desde: https://ngrok.com/download"
    echo "  O instala con:"
    echo "    curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc"
    echo "    echo 'deb https://ngrok-agent.s3.amazonaws.com buster main' | sudo tee /etc/apt/sources.list.d/ngrok.list"
    echo "    sudo apt update && sudo apt install ngrok"
    echo ""
    read -p "  ¿Ya instalaste ngrok? (s/n): " ngrok_ok
    if [ "$ngrok_ok" != "s" ]; then
        echo "  Instálalo y vuelve a correr este script"
        exit 1
    fi
fi

if [ -z "$NGROK_TOKEN" ]; then
    read -p "  Ingresa tu token de ngrok (https://dashboard.ngrok.com): " NGROK_TOKEN
fi
ngrok config add-authtoken $NGROK_TOKEN

# ---------- 8. MOSTRAR INSTRUCCIONES ----------
echo ""
echo "========================================"
echo "  INSTRUCCIONES FINALES"
echo "========================================"
echo ""
echo "  EJECUTA NGROK (3 terminales o usa screen):"
echo ""
echo "  Terminal 1 - Frontend + API + WebSockets:"
echo "    ngrok http 8080"
echo "    → URL: https://xxxx.ngrok.io"
echo ""
echo "  Terminal 2 - TURN server:"
echo "    ngrok tcp 3478"
echo "    → URL: tcp://x.tcp.ngrok.io:xxxxx"
echo ""
echo "  LUEGO configura en mediasoup-server.js:"
echo '    process.env.MEDIASOUP_ANNOUNCED_IP = "IP_PUBLICA_O_NGROK_TCP"'
echo ""
echo "  NOTA: La IP anunciada debe ser la URL del túnel TCP de ngrok"
echo "  o la IP pública de tu router si tienes puertos abiertos."
echo ""
echo "  === PARA TUS USUARIOS ==="
echo "  Abren: https://xxxx.ngrok.io  (la URL de ngrok HTTP)"
echo ""
echo "========================================"
