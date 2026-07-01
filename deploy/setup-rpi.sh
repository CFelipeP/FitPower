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
log "[1/9] Installing system packages..."

sudo apt-get update -qq
sudo apt-get install -y -qq \
    curl git unzip build-essential \
    python3 python3-pip \
    libssl-dev

# ---- 2. MariaDB ----
log "[2/9] Installing MariaDB..."
if systemctl is-active --quiet mariadb 2>/dev/null || systemctl is-active --quiet mysql 2>/dev/null; then
    ok "MariaDB already running"
else
    sudo apt-get install -y -qq mariadb-server mariadb-client
    sudo systemctl enable mariadb
    sudo systemctl start mariadb
    ok "MariaDB installed and started"
fi

# ---- 3. PHP 8.2+ ----
log "[3/9] Installing PHP..."
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

# ---- 4. Node.js 20 LTS ----
log "[4/9] Installing Node.js 20 LTS..."
if command -v node &>/dev/null && node -v | grep -q "v20"; then
    ok "Node.js $(node -v) already installed"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo apt-get install -y -qq nodejs
    ok "Node.js $(node -v) installed"
fi

# ---- 5. Nginx ----
log "[5/9] Installing Nginx..."
if systemctl is-active --quiet nginx 2>/dev/null; then
    ok "Nginx already running"
else
    sudo apt-get install -y -qq nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    ok "Nginx installed"
fi

# ---- 6. PM2 ----
log "[6/9] Installing PM2..."
if command -v pm2 &>/dev/null; then
    ok "PM2 already installed"
else
    sudo npm install -g pm2
    ok "PM2 installed"
fi

# ---- 7. Create directory structure ----
log "[7/9] Creating directory structure..."
sudo mkdir -p "$FITPOWER_DIR/api/uploads/progress_photos"
sudo mkdir -p "$FITPOWER_DIR/api/uploads/videos"
sudo mkdir -p "$FITPOWER_DIR/api/uploads/video-feedback"
sudo mkdir -p "$FITPOWER_DIR/public"

# ---- 8. Nginx config ----
log "[8/9] Configuring Nginx..."

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

    # Security
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

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

    # WebSocket: Chat
    location /chat {
        proxy_pass http://127.0.0.1:5180;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 86400;
    }

    # WebSocket: Mediasoup signaling
    location /mediasoup {
        proxy_pass http://127.0.0.1:5181;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 86400;
    }

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
        expires 7d;
        add_header Cache-Control "public, must-revalidate";
    }

    # Service workers & manifest - no cache
    location ~ ^/(service-worker\.js|firebase-messaging-sw\.js|manifest\.json)$ {
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

# ---- 9. Instructions ----
echo ""
log "================================================"
log "  SETUP COMPLETE"
log "================================================"
echo ""
log "Now you need to:"
echo ""
echo "  1. Copy your application files:"
echo "       cd ~"
echo "       git clone <your-repo> fitpower-source"
echo "       cd fitpower-source"
echo ""
echo "  2. Build the frontend:"
echo "       cd FitPower"
echo "       npm install"
echo "       npm run build"
echo ""
echo "  3. Deploy files:"
echo "       sudo cp -r dist/* $FITPOWER_DIR/public/"
echo "       sudo cp -r ../api/* $FITPOWER_DIR/api/"
echo "       sudo cp ecosystem.config.cjs $FITPOWER_DIR/"
echo "       cp .env $FITPOWER_DIR/api/.env"
echo ""
echo "  4. Install API dependencies:"
echo "       cd $FITPOWER_DIR/api"
echo "       sudo composer install --no-dev --optimize-autoloader"
echo ""
echo "  5. Set up database:"
echo "       sudo mysql -u root < $FITPOWER_DIR/api/database/schema.sql"
echo ""
echo "  6. Install Node dependencies (production only):"
echo "       cd $FITPOWER_DIR"
echo "       npm install --omit=dev"
echo ""
echo "  7. Start services with PM2:"
echo "       pm2 start ecosystem.config.cjs"
echo "       pm2 save"
echo "       pm2 startup   # auto-start on boot"
echo ""
echo "  8. Open http://<rpi-ip> in your browser"
echo ""
echo "  See deploy/README-rpi.md for detailed instructions."
echo ""
echo "================================================"
