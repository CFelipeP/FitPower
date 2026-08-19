#!/bin/bash
set -e

: "${PI_IP:=192.168.0.14}"
: "${PI_USER:=pi}"
: "${PI_PASS:=}"

echo "================================================"
echo " FitPower - Raspberry Pi Deployment"
echo "================================================"

# --- Step 1: Check / Install LAMP ---
echo ""
echo "[1/7] Checking installed packages..."

# Check PHP
if command -v php8.1 &>/dev/null || php -v 2>/dev/null | grep -q "PHP 8.1"; then
    echo "  PHP 8.1: OK"
    PHP=php8.1
elif command -v php8.2 &>/dev/null || php -v 2>/dev/null | grep -q "PHP 8"; then
    echo "  PHP 8.x: OK"
    PHP=$(php -v | head -1 | grep -oP 'PHP \K[0-9]+\.[0-9]+')
elif command -v php &>/dev/null; then
    echo "  WARNING: PHP $(php -v | head -1 | grep -oP 'PHP \K[0-9]+\.[0-9]+') found, but 8.1+ recommended"
    PHP=php
else
    echo "  PHP not found, installing..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq php8.1 php8.1-cli php8.1-common php8.1-mysql php8.1-xml php8.1-mbstring php8.1-curl php8.1-gd php8.1-zip libapache2-mod-php8.1
    PHP=php8.1
fi

# Tune PHP for FitPower (uploads up to 50 MB: videos, progress photos, certs)
PHP_INI=$(find /etc/php -name php.ini -path '*apache2*' 2>/dev/null | head -1)
if [ -n "$PHP_INI" ]; then
    sudo sed -i 's/^upload_max_filesize = .*/upload_max_filesize = 50M/' "$PHP_INI"
    sudo sed -i 's/^post_max_size = .*/post_max_size = 55M/' "$PHP_INI"
    sudo sed -i 's/^max_execution_time = .*/max_execution_time = 300/' "$PHP_INI"
    sudo sed -i 's/^memory_limit = .*/memory_limit = 256M/' "$PHP_INI"
    echo "  PHP upload limits tuned."
fi

# Check Apache
if systemctl is-active --quiet apache2 2>/dev/null; then
    echo "  Apache: OK"
else
    echo "  Apache not found, installing..."
    sudo apt-get install -y -qq apache2 libapache2-mod-php8.1
    sudo systemctl enable apache2
    sudo systemctl start apache2
fi

# Check MySQL / MariaDB
if systemctl is-active --quiet mariadb 2>/dev/null || systemctl is-active --quiet mysql 2>/dev/null; then
    echo "  MySQL/MariaDB: OK"
else
    echo "  MySQL/MariaDB not found, installing..."
    sudo apt-get install -y -qq mariadb-server mariadb-client
    sudo systemctl enable mariadb
    sudo systemctl start mariadb
fi

# Enable required Apache modules
sudo a2enmod rewrite headers alias proxy proxy_http proxy_wstunnel

# --- Step 2: Create directories ---
echo ""
echo "[2/7] Creating directory structure..."
sudo mkdir -p /var/www/fitpower/public
sudo mkdir -p /var/www/fitpower/api
sudo mkdir -p /var/www/fitpower/api/uploads/progress_photos

# --- Step 3: Copy files ---
# Files are expected in /home/sotomayorpi/fitpower-deploy/
DEPLOY_DIR="/home/$PI_USER/fitpower-deploy"

if [ ! -d "$DEPLOY_DIR" ]; then
    echo "ERROR: Deployment directory $DEPLOY_DIR not found."
    echo "Please SCP the deploy package first:"
    echo "  scp -r deploy/* $PI_USER@$PI_IP:$DEPLOY_DIR/"
    exit 1
fi

echo ""
echo "[3/7] Copying application files..."
sudo cp -r "$DEPLOY_DIR/public/"* /var/www/fitpower/public/
sudo cp -r "$DEPLOY_DIR/api/"* /var/www/fitpower/api/

# Copy .env
if [ -f "$DEPLOY_DIR/.env" ]; then
    sudo cp "$DEPLOY_DIR/.env" /var/www/fitpower/api/.env
    # Replace placeholder secrets with real random values on first deploy so
    # the API does not fail closed or run with a forgeable JWT secret.
    ENV_FILE=/var/www/fitpower/api/.env
    if grep -q "JWT_SECRET=change_me" "$ENV_FILE" 2>/dev/null; then
        NEW_SECRET=$(openssl rand -hex 32)
        sudo sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${NEW_SECRET}|" "$ENV_FILE"
        echo "  Generated new JWT_SECRET for the API."
    fi
    if grep -q "DB_PASS=change_me" "$ENV_FILE" 2>/dev/null && [ -n "$DB_APP_PASS" ]; then
        sudo sed -i "s|^DB_PASS=.*|DB_PASS=${DB_APP_PASS}|" "$ENV_FILE"
        echo "  Set DB_PASS from DB_APP_PASS."
    fi
fi

# Copy Node service files (chat, mediasoup, push, PM2 ecosystem)
if [ -d "$DEPLOY_DIR/node" ]; then
    echo ""
    echo "[3b/7] Copying Node service files..."
    sudo cp "$DEPLOY_DIR/node/"* /var/www/fitpower/ 2>/dev/null || true
    echo "  Node service files copied."
fi

# --- Step 4: Set up Database ---
echo ""
echo "[4/7] Setting up database..."

# DB app password must come from env (never hardcoded). Fails closed without it.
DB_APP_PASS="${DB_APP_PASS:-}"
if [ -z "$DB_APP_PASS" ]; then
    echo "  [ERROR] DB_APP_PASS is not set. Export DB_APP_PASS before running this script."
    exit 1
fi

# Check if DB already exists
DB_EXISTS=$(sudo mysql -u root -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='fitpower'" 2>/dev/null)

if [ -z "$DB_EXISTS" ]; then
    if [ -f "$DEPLOY_DIR/fitpower_dump.sql" ]; then
        echo "  Importing database dump..."
        sudo mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS fitpower CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'fitpower'@'localhost' IDENTIFIED BY '${DB_APP_PASS}';
GRANT ALL PRIVILEGES ON fitpower.* TO 'fitpower'@'localhost';
FLUSH PRIVILEGES;
SQL
        sudo mysql -u fitpower -p"$DB_APP_PASS" fitpower < "$DEPLOY_DIR/fitpower_dump.sql"
        echo "  Database imported."
    else
        echo "  No database dump found. Creating empty database from schema..."
        sudo mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS fitpower CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'fitpower'@'localhost' IDENTIFIED BY '${DB_APP_PASS}';
GRANT ALL PRIVILEGES ON fitpower.* TO 'fitpower'@'localhost';
FLUSH PRIVILEGES;
SQL
        # Run schema
        if [ -f "$DEPLOY_DIR/schema.sql" ]; then
            sudo mysql -u fitpower -p"$DB_APP_PASS" fitpower < "$DEPLOY_DIR/schema.sql"
        fi
        echo "  Database created."
    fi
else
    echo "  Database 'fitpower' already exists, skipping import."
fi

# --- Step 4b: Run migrations (idempotent) ---
echo ""
echo "[4b/7] Running database migrations..."
if [ -d "/var/www/fitpower/api/database/migrations" ]; then
    cd /var/www/fitpower/api
    sudo -u www-data $PHP migrate.php || $PHP migrate.php
else
    echo "  No migrations directory found, skipping."
fi

# --- Step 4c: Composer dependencies ---
echo ""
echo "[4c/7] Installing API dependencies (composer)..."
if command -v composer &>/dev/null; then
    cd /var/www/fitpower/api
    if [ -f composer.json ]; then
        sudo composer install --no-dev --optimize-autoloader 2>/dev/null || composer install --no-dev --optimize-autoloader
        echo "  Composer dependencies installed."
    fi
else
    echo "  Composer not found. Install with: curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer"
    echo "  Then run: cd /var/www/fitpower/api && composer install --no-dev"
fi

# --- Step 5: Configure Apache ---
echo ""
echo "[5/7] Configuring Apache..."

# Copy vhost config
sudo bash -c "cat > /etc/apache2/sites-available/fitpower.conf" <<'VHOST'
<VirtualHost *:80>
    ServerName fitpower.local
    ServerAlias 192.168.0.14
    DocumentRoot /var/www/fitpower/public

    <Directory /var/www/fitpower/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        FallbackResource /index.html
    </Directory>

    Alias /api /var/www/fitpower/api

    <Directory /var/www/fitpower/api>
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>

    <Directory /var/www/fitpower/api/uploads>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    # WebSocket: chat + mediasoup signaling (frontend uses /ws/...)
    ProxyPass /ws/chat ws://127.0.0.1:5180
    ProxyPassReverse /ws/chat ws://127.0.0.1:5180
    ProxyPass /ws/mediasoup ws://127.0.0.1:5181
    ProxyPassReverse /ws/mediasoup ws://127.0.0.1:5181

    # The PHP API is served directly by Apache; the Node services call the
    # internal API through the PM2-managed PHP built-in server on 8088.

    ErrorLog ${APACHE_LOG_DIR}/fitpower-error.log
    CustomLog ${APACHE_LOG_DIR}/fitpower-access.log combined
</VirtualHost>
VHOST

sudo a2dissite 000-default 2>/dev/null || true
sudo a2ensite fitpower
sudo systemctl reload apache2

# --- Step 5b: Node deps + PM2 services ---
echo ""
echo "[5b/7] Installing Node dependencies and starting services..."
if [ -f /var/www/fitpower/package.json ]; then
    cd /var/www/fitpower
    sudo npm install --omit=dev --no-audit --no-fund 2>/dev/null || npm install --omit=dev --no-audit --no-fund
    if command -v pm2 &>/dev/null; then
        if [ -f /var/www/fitpower/ecosystem.config.cjs ]; then
            pm2 start /var/www/fitpower/ecosystem.config.cjs 2>/dev/null || pm2 restart all
            pm2 save
            sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u "$PI_USER" --hp "/home/$PI_USER" 2>/dev/null || true
            echo "  PM2 services started."
        fi
    else
        echo "  PM2 not installed. Install with: sudo npm install -g pm2"
    fi
else
    echo "  No package.json at /var/www/fitpower — Node services (chat/video) skipped."
fi

# --- Step 5c: Reminders cron ---
echo ""
echo "[5c/7] Installing reminders cron..."
if [ -n "${INTERNAL_API_SECRET:-}" ]; then
    sudo bash -c "cat > /etc/cron.d/fitpower-reminders" <<CRON
# FitPower check-in & session reminders (every 30 minutes)
*/30 * * * * root curl -s -m 30 -X POST http://127.0.0.1/api/system/reminders -H 'X-Internal-Secret: ${INTERNAL_API_SECRET}' -H 'Content-Type: application/json' >/dev/null 2>&1
CRON
    echo "  Reminders cron installed (every 30 min)."
else
    echo "  INTERNAL_API_SECRET not set — reminders cron skipped."
fi

# --- Step 6: Set permissions ---
echo ""
echo "[6/7] Setting permissions..."
sudo chown -R www-data:www-data /var/www/fitpower/api/uploads
sudo chmod -R 755 /var/www/fitpower
sudo chmod -R 775 /var/www/fitpower/api/uploads

# --- Step 7: Test ---
echo ""
echo "[7/7] Testing deployment..."
echo ""
echo "  Apache config:"
sudo apache2ctl configtest 2>&1 | grep -q "Syntax OK" && echo "    ✓ Syntax OK" || echo "    ✗ Syntax error"

echo ""
echo "================================================"
echo " FitPower deployment complete!"
echo "================================================"
echo ""
echo "  Open http://192.168.0.14 in your browser"
echo ""
echo "If you need to modify the DB:"
echo "  mysql -u fitpower -p\$DB_APP_PASS fitpower"
echo ""
echo "Logs:"
echo "  sudo tail -f /var/log/apache2/fitpower-error.log"
