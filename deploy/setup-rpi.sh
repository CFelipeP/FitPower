#!/bin/bash
set -e

# ============================================================
# FitPower - Raspberry Pi 5 Complete Setup
# ============================================================
# Requirements: Raspberry Pi 5 (8GB), Raspberry Pi OS (64-bit)
# Run as: sudo bash setup-rpi.sh
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}  OK${NC} $1"; }
warn() { echo -e "${YELLOW}  WARN${NC} $1"; }
err()  { echo -e "${RED}  ERROR: $1${NC}"; }

# ---- Config (change these) ----
FITPOWER_DIR="/var/www/fitpower"
APP_USER="${SUDO_USER:-pi}"

log "================================================"
log "  FitPower - Raspberry Pi 5 Setup"
log "================================================"
echo ""

# ---- 1. System Updates & Build Tools ----
log "[1/13] Installing system packages..."

sudo apt-get update -qq
sudo apt-get install -y -qq \
    curl git unzip build-essential \
    python3 python3-pip \
    libssl-dev

# ---- 2. MariaDB ----
log "[2/13] Installing MariaDB..."
if systemctl is-active --quiet mariadb 2>/dev/null || systemctl is-active --quiet mysql 2>/dev/null; then
    ok "MariaDB already running"
else
    sudo apt-get install -y -qq mariadb-server mariadb-client
    sudo systemctl enable mariadb
    sudo systemctl start mariadb
    ok "MariaDB installed and started"
fi

# ---- 3. PHP 8.2+ ----
log "[3/13] Installing PHP..."
PHP_VERSION=""
if command -v php8.3 &>/dev/null; then
    PHP_VERSION="8.3"
elif command -v php8.2 &>/dev/null; then
    PHP_VERSION="8.2"
elif command -v php8.1 &>/dev/null; then
    PHP_VERSION="8.1"
fi

if [ -z "$PHP_VERSION" ]; then
    sudo apt-get install -y -qq lsb-release ca-certificates apt-transport-https software-properties-common gnupg
    sudo sh -c 'echo "deb https://packages.sury.org/php/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/php.list'
    wget -qO - https://packages.sury.org/php/apt.gpg | sudo apt-key add - 2>/dev/null || \
    curl -sSL https://packages.sury.org/php/apt.gpg | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/php.gpg
    sudo apt-get update -qq
    PHP_VERSION="8.2"
fi

sudo apt-get install -y -qq \
    php${PHP_VERSION} php${PHP_VERSION}-cli php${PHP_VERSION}-fpm \
    php${PHP_VERSION}-mysql php${PHP_VERSION}-xml php${PHP_VERSION}-mbstring \
    php${PHP_VERSION}-curl php${PHP_VERSION}-gd php${PHP_VERSION}-zip \
    php${PHP_VERSION}-intl

ok "PHP $PHP_VERSION installed"

# Tune PHP for FitPower (uploads up to 50 MB: videos, progress photos, certs)
PHP_INI="/etc/php/${PHP_VERSION}/fpm/php.ini"
if [ -f "$PHP_INI" ]; then
    sudo sed -i 's/^upload_max_filesize = .*/upload_max_filesize = 50M/' "$PHP_INI"
    sudo sed -i 's/^post_max_size = .*/post_max_size = 55M/' "$PHP_INI"
    sudo sed -i 's/^max_execution_time = .*/max_execution_time = 300/' "$PHP_INI"
    sudo sed -i 's/^memory_limit = .*/memory_limit = 256M/' "$PHP_INI"
    # Enable opcache for production performance
    sudo sed -i 's/^;opcache.enable=1/opcache.enable=1/' "$PHP_INI"
    ok "PHP upload/opcache tuned"
fi

# ---- 4. Node.js 20 LTS ----
log "[4/13] Installing Node.js 20 LTS..."
if command -v node &>/dev/null && node -v | grep -q "v20"; then
    ok "Node.js $(node -v) already installed"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo apt-get install -y -qq nodejs
    ok "Node.js $(node -v) installed"
fi

# ---- 5. Nginx ----
log "[5/13] Installing Nginx..."
if systemctl is-active --quiet nginx 2>/dev/null; then
    ok "Nginx already running"
else
    sudo apt-get install -y -qq nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    ok "Nginx installed"
fi

# ---- 6. PM2 ----
log "[6/13] Installing PM2..."
if command -v pm2 &>/dev/null; then
    ok "PM2 already installed"
else
    sudo npm install -g pm2
    ok "PM2 installed"
fi

# ---- 6b. Composer ----
if command -v composer &>/dev/null; then
    ok "Composer already installed"
else
    curl -sS https://getcomposer.org/installer -o /tmp/composer-setup.php
    sudo php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer
    rm -f /tmp/composer-setup.php
    ok "Composer installed"
fi

# ---- 7. Create directory structure ----
log "[7/13] Creating directory structure..."
sudo mkdir -p "$FITPOWER_DIR/api/uploads/progress_photos"
sudo mkdir -p "$FITPOWER_DIR/api/uploads/videos"
sudo mkdir -p "$FITPOWER_DIR/api/uploads/video-feedback"
sudo mkdir -p "$FITPOWER_DIR/public"

# ---- 8. Nginx config ----
log "[8/13] Configuring Nginx..."

PHP_SOCK=$(find /run/php/ -name "php*-fpm.sock" 2>/dev/null | head -1)
if [ -z "$PHP_SOCK" ]; then
    PHP_SOCK="/run/php/php${PHP_VERSION}-fpm.sock"
fi

sudo tee /etc/nginx/sites-available/fitpower > /dev/null << NGINXEOF
server {
    listen 80;
    server_name _;
    root $FITPOWER_DIR/public;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;

    client_max_body_size 50m;

    # Security
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;

    # API -> PHP-FPM
    location /api/ {
        rewrite ^/api/(.*)$ /index.php?/\$1 break;
        fastcgi_pass unix:$PHP_SOCK;
        fastcgi_param SCRIPT_FILENAME $FITPOWER_DIR/api/index.php;
        fastcgi_param DOCUMENT_ROOT $FITPOWER_DIR/api;
        fastcgi_param SCRIPT_NAME /index.php;
        include fastcgi_params;
    }

    # Uploads -> direct serve
    location /api/uploads/ {
        alias $FITPOWER_DIR/api/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # WebSocket: Chat (the frontend uses /ws/chat)
    location /ws/chat {
        proxy_pass http://127.0.0.1:5180;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # WebSocket: Mediasoup signaling (the frontend uses /ws/mediasoup)
    location /ws/mediasoup {
        proxy_pass http://127.0.0.1:5181;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # Legacy paths without the /ws prefix (kept for older builds)
    location /chat {
        proxy_pass http://127.0.0.1:5180;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    location /mediasoup {
        proxy_pass http://127.0.0.1:5181;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
        expires 7d;
        add_header Cache-Control "public, must-revalidate";
    }

    # Service workers & manifest - no cache
    location ~ ^/(service-worker\.js|firebase-messaging-sw\.js|manifest\.json|offline\.html)$ {
        expires off;
        add_header Cache-Control "no-cache, must-revalidate";
    }
}
NGINXEOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/fitpower /etc/nginx/sites-enabled/fitpower

sudo nginx -t 2>&1 && ok "Nginx config OK" || err "Nginx config test failed"

sudo systemctl restart php${PHP_VERSION}-fpm
sudo systemctl reload nginx
ok "Nginx configured"

# ---- 9. Database user, schema and migrations ----
log "[9/13] Setting up database..."
DB_APP_PASS="${DB_APP_PASS:-}"
if [ -z "$DB_APP_PASS" ]; then
    err "DB_APP_PASS is not set. Export DB_APP_PASS before running this script."
    exit 1
fi

DB_EXISTS=$(sudo mysql -u root -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='fitpower'" 2>/dev/null || true)
if [ -z "$DB_EXISTS" ]; then
    sudo mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS fitpower CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'fitpower'@'localhost' IDENTIFIED BY '${DB_APP_PASS}';
GRANT ALL PRIVILEGES ON fitpower.* TO 'fitpower'@'localhost';
FLUSH PRIVILEGES;
SQL
    ok "Database 'fitpower' and user 'fitpower' created"
else
    ok "Database 'fitpower' already exists"
fi

if [ -f "$FITPOWER_DIR/api/database/schema.sql" ]; then
    sudo mysql -u fitpower -p"$DB_APP_PASS" fitpower < "$FITPOWER_DIR/api/database/schema.sql" 2>/dev/null || \
    warn "schema.sql already applied or had minor errors (migrations will fill the gaps)"
fi

if [ -d "$FITPOWER_DIR/api/database/migrations" ]; then
    log "Running migrations..."
    (cd "$FITPOWER_DIR/api" && php migrate.php)
    ok "Migrations applied"
fi

# ---- 10. Node services (chat, mediasoup, push) ----
log "[10/13] Installing Node service dependencies..."
if [ -f "$FITPOWER_DIR/package.json" ]; then
    (cd "$FITPOWER_DIR" && npm install --omit=dev --no-audit --no-fund)
    ok "Node dependencies installed"
else
    warn "package.json not found at $FITPOWER_DIR â€” copy the Node server files (chat-server.js, mediasoup-server.js, chat-auth.js, push-server.cjs, package.json) there first."
fi

if command -v pm2 &>/dev/null; then
    log "[11/13] Starting services with PM2..."
    if [ -f "$FITPOWER_DIR/ecosystem.config.cjs" ]; then
        pm2 start "$FITPOWER_DIR/ecosystem.config.cjs" || pm2 restart all
        pm2 save
        sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" 2>/dev/null || true
        ok "PM2 services started"
    else
        warn "ecosystem.config.cjs not found â€” start services manually."
    fi
fi

# ---- 12. Reminders cron ----
log "[12/13] Installing reminders cron..."
if [ -n "${INTERNAL_API_SECRET:-}" ]; then
    sudo bash -c "cat > /etc/cron.d/fitpower-reminders" <<CRON
# FitPower check-in & session reminders (every 30 minutes)
*/30 * * * * root curl -s -m 30 -X POST http://127.0.0.1/api/system/reminders -H 'X-Internal-Secret: ${INTERNAL_API_SECRET}' -H 'Content-Type: application/json' >/dev/null 2>&1
CRON
    ok "Reminders cron installed (every 30 min)"
else
    warn "INTERNAL_API_SECRET not set - reminders cron skipped. Export it and re-run this step."
fi

# ---- Instructions ----
echo ""
log "================================================"
log "  SETUP COMPLETE"
log "================================================"
echo ""
log "Now deploy the application files:"
echo ""
echo "  The application expects this layout:"
echo "    $FITPOWER_DIR/public/    -> frontend build (dist/*)"
echo "    $FITPOWER_DIR/api/       -> PHP API (api/*)"
echo "    $FITPOWER_DIR/           -> Node servers + package.json"
echo ""
echo "  1. Copy the files (example):"
echo "       sudo cp -r FitPower/dist/* $FITPOWER_DIR/public/"
echo "       sudo cp -r api/* $FITPOWER_DIR/api/"
echo "       sudo cp FitPower/{package.json,package-lock.json,chat-server.js,mediasoup-server.js,chat-auth.js,ecosystem.config.cjs} $FITPOWER_DIR/"
echo "       sudo cp FitPower/public/push-server.cjs $FITPOWER_DIR/push-server.cjs"
echo ""
echo "  2. Install API dependencies:"
echo "       cd $FITPOWER_DIR/api && sudo composer install --no-dev --optimize-autoloader"
echo "       cd $FITPOWER_DIR && sudo npm install --omit=dev"
echo ""
echo "  3. Create the environment file $FITPOWER_DIR/api/.env with"
echo "     DB_HOST=localhost, DB_NAME=fitpower, DB_USER=fitpower,"
echo "     DB_PASS=<your DB_APP_PASS>, JWT_SECRET=<random 64 chars>,"
echo "     INTERNAL_API_SECRET=<random>, APP_URL=http://<rpi-ip>"
echo ""
echo "  4. Start services:"
echo "       pm2 start $FITPOWER_DIR/ecosystem.config.cjs"
echo "       pm2 save"
echo ""
echo "  5. Health check:"
echo "       curl http://127.0.0.1/api/health"
echo ""
echo "  See deploy/README-rpi.md for detailed instructions."
echo ""
echo "================================================"
