#!/bin/bash
# ============================================
# FITPOWER - SETUP COMPLETO
# coturn + ngrok + mediasoup + chat + PHP + DB
# SIN COSTO, SIN INSTALAR NADA EL USUARIO
# ============================================
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "========================================"
echo "  FITPOWER DEPLOY - Setup Completo"
echo "========================================"
echo ""

# ---------- 1. COTURN ----------
echo "[1/8] Instalando coturn..."
sudo apt update
sudo apt install -y coturn jq

sudo tee /etc/turnserver.conf > /dev/null <<TURNEOF
listening-port=3478
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=fitpower_secret_2024
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
echo "  coturn listo (puerto 3478 TCP)"

# ---------- 2. DEPENDENCIAS ----------
echo "[2/8] Verificando Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo apt install -y nodejs
fi

echo "[3/8] Verificando PHP..."
if ! command -v php &> /dev/null; then
    sudo apt install -y php php-mysql php-curl php-mbstring php-xml
fi

# ---------- 3. NGROK ----------
echo "[4/8] Instalando ngrok..."
if ! command -v ngrok &> /dev/null; then
    curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc > /dev/null
    echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list > /dev/null
    sudo apt update && sudo apt install -y ngrok
fi

# ---------- 4. BASE DE DATOS ----------
echo "[5/8] Configurando base de datos..."
if command -v mysql &> /dev/null; then
    echo "  Creando base de datos fitpower (si no existe)..."
    mysql -u root -pInfo2026/*- -e "CREATE DATABASE IF NOT EXISTS fitpower CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || \
    mysql -u root -pInfo2026/*- -h localhost -e "CREATE DATABASE IF NOT EXISTS fitpower CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || \
    echo "  [AVISO] No pude conectar a MySQL. Crea la DB manualmente: 'CREATE DATABASE fitpower;'"

    echo "  Ejecutando schema.sql..."
    mysql -u root -pInfo2026/*- fitpower < database/schema.sql 2>/dev/null || echo "  [AVISO] schema.sql ya aplicado o error menor"

    echo "  Ejecutando migraciones..."
    php migrate.php 2>/dev/null || echo "  [AVISO] Migraciones ya aplicadas"
else
    echo "  [AVISO] MySQL no instalado. Instálalo: sudo apt install mysql-server"
fi

# ---------- 5. PROYECTO ----------
echo "[6/8] Instalando dependencias del proyecto..."
npm install
sudo npm install -g pm2

# ---------- 6. CONFIGURAR PM2 ----------
echo "[7/8] Configurando servicios..."

cat > start.sh <<STARTEOF
#!/bin/bash
PROJECT_DIR="\$(cd "\$(dirname "\$0")" && pwd)"
cd "\$PROJECT_DIR"

echo "[FitPower] Iniciando servicios..."

export TURN_USERNAME="fitpower"
export TURN_CREDENTIAL="fitpower_secret_2024"

# 1. PHP API
pm2 start "php -S 0.0.0.0:8088 -t api api/index.php" --name fitpower-api 2>/dev/null || pm2 restart fitpower-api

# 2. Proxy (frontend + WS + API)
pm2 start proxy-server.js --name fitpower-proxy 2>/dev/null || pm2 restart fitpower-proxy

# 3. Ngrok
pm2 start "ngrok start --all --config ngrok.yml" --name fitpower-ngrok 2>/dev/null || pm2 restart fitpower-ngrok

# 4. Esperar ngrok
echo "[FitPower] Esperando ngrok..."
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
echo "  FITPOWER LISTO!"
echo "  Web: \$WEB_URL"
echo "  TURN: \$TURN_URL"
echo "========================================"
echo ""
echo "  Los usuarios abren: \$WEB_URL"
echo "  No necesitan instalar nada."
echo ""
STARTEOF

chmod +x start.sh

# ---------- 7. RESUMEN ----------
echo "[8/8] Setup completado."
echo ""
echo "========================================"
echo "  PASOS FINALES"
echo "========================================"
echo ""
echo "  1. Edita ngrok.yml con tu authtoken:"
echo "     nano ngrok.yml"
echo "     (Sácalo gratis en https://dashboard.ngrok.com)"
echo ""
echo "  2. Ejecuta:"
echo "     bash start.sh"
echo ""
echo "  3. Comparte la URL Web que aparece"
echo "     Los usuarios solo abren ese link"
echo ""
echo "  4. Para que arranque solo al reiniciar:"
echo "     pm2 startup"
echo "     pm2 save"
echo ""
