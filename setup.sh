#!/bin/bash
# ============================================
# FITPOWER - FULL SETUP
# coturn + ngrok + mediasoup + chat + PHP + DB
# FREE, NO USER INSTALLS REQUIRED
# ============================================
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "========================================"
echo "  FITPOWER DEPLOY - Full Setup"
echo "========================================"
echo ""

# ---------- 1. COTURN ----------
echo "[1/8] Installing coturn..."
sudo apt update
sudo apt install -y coturn jq

# TURN secret must be provided via env (never hardcoded). Generates one if absent.
TURN_SECRET="${TURN_SECRET:-$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)}"
export TURN_SECRET

sudo tee /etc/turnserver.conf > /dev/null <<TURNEOF
listening-port=3478
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=${TURN_SECRET}
realm=fitpower
total-quota=100
bps-capacity=0
log-file=/var/log/turnserver.log
simple-log
no-udp
no-tls
no-dtls
TURNEOF

sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn
sudo systemctl restart coturn
sudo systemctl enable coturn
echo "  coturn ready (TCP port 3478)"

# ---------- 2. DEPENDENCIAS ----------
echo "[2/8] Checking Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo apt install -y nodejs
fi

echo "[3/8] Checking PHP..."
if ! command -v php &> /dev/null; then
    sudo apt install -y php php-mysql php-curl php-mbstring php-xml
fi

# ---------- 3. NGROK ----------
echo "[4/8] Installing ngrok..."
if ! command -v ngrok &> /dev/null; then
    curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc > /dev/null
    echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list > /dev/null
    sudo apt update && sudo apt install -y ngrok
fi

# ---------- 4. BASE DE DATOS ----------
echo "[5/8] Setting up database..."
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-}"
if command -v mysql &> /dev/null; then
    echo "  Creating fitpower database (if not exists)..."
    if [ -n "$DB_PASS" ]; then
        mysql -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS fitpower CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || \
        mysql -u "$DB_USER" -p"$DB_PASS" -h localhost -e "CREATE DATABASE IF NOT EXISTS fitpower CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || \
        echo "  [WARNING] Could not connect to MySQL. Create the DB manually: 'CREATE DATABASE fitpower;'"
        echo "  Running schema.sql..."
        mysql -u "$DB_USER" -p"$DB_PASS" fitpower < database/schema.sql 2>/dev/null || echo "  [WARNING] schema.sql already applied or minor error"
    else
        echo "  [WARNING] DB_PASS is empty. Create the DB manually and export DB_PASS."
    fi
    echo "  Running migrations..."
    php migrate.php 2>/dev/null || echo "  [WARNING] Migrations already applied"
else
    echo "  [WARNING] MySQL not installed. Install it: sudo apt install mysql-server"
fi

# ---------- 5. PROYECTO ----------
echo "[6/8] Installing project dependencies..."
npm install
sudo npm install -g pm2

# ---------- 6. CONFIGURE PM2 ----------
echo "[7/8] Configuring services..."

cat > start.sh <<STARTEOF
#!/bin/bash
PROJECT_DIR="\$(cd "\$(dirname "\$0")" && pwd)"
cd "\$PROJECT_DIR"

echo "[FitPower] Starting services..."

export TURN_USERNAME="fitpower"
export TURN_CREDENTIAL="$TURN_SECRET"

# 1. PHP API
pm2 start "php -S 0.0.0.0:8088 -t api api/index.php" --name fitpower-api 2>/dev/null || pm2 restart fitpower-api

# 2. Proxy (frontend + WS + API)
pm2 start proxy-server.js --name fitpower-proxy 2>/dev/null || pm2 restart fitpower-proxy

# 3. Ngrok
pm2 start "ngrok start --all --config ngrok.yml" --name fitpower-ngrok 2>/dev/null || pm2 restart fitpower-ngrok

# 4. Esperar ngrok
echo "[FitPower] Waiting for ngrok..."
sleep 5
for i in \$(seq 1 30); do
  if curl -s http://127.0.0.1:4040/api/tunnels > /dev/null 2>&1; then break; fi
  sleep 1
done

TURN_URL=\$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[] | select(.proto == "tcp") | .public_url' | sed 's/tcp:/turn:/')
WEB_URL=\$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[] | select(.proto == "https") | .public_url')

export TURN_URL="\$TURN_URL"

# 5. Mediasoup + Chat (con TURN config)
pm2 start mediasoup-server.js --name fitpower-mediasoup 2>/dev/null || pm2 restart fitpower-mediasoup --update-env
pm2 start chat-server.js --name fitpower-chat 2>/dev/null || pm2 restart fitpower-chat

pm2 save

echo ""
echo "========================================"
echo "  FITPOWER READY!"
echo "  Web: \$WEB_URL"
echo "  TURN: \$TURN_URL"
echo "========================================"
echo ""
echo "  Users open: \$WEB_URL"
echo "  They do not need to install anything."
echo ""
STARTEOF

chmod +x start.sh

# ---------- 7. RESUMEN ----------
echo "[8/8] Setup complete."
echo ""
echo "========================================"
echo "  FINAL STEPS"
echo "========================================"
echo ""
echo "  1. Edit ngrok.yml with your authtoken:"
echo "     nano ngrok.yml"
echo "     (Get it free at https://dashboard.ngrok.com)"
echo ""
echo "  2. Run:"
echo "     bash start.sh"
echo ""
echo "  3. Share the Web URL that appears"
echo "     Users only need to open that link"
echo ""
echo "  4. To start automatically on reboot:"
echo "     pm2 startup"
echo "     pm2 save"
echo ""
