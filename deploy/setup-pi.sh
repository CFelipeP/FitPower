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
sudo a2enmod rewrite headers alias

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
fi

# --- Step 4: Set up Database ---
echo ""
echo "[4/7] Setting up database..."

# Check if DB already exists
DB_EXISTS=$(sudo mysql -u root -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='fitpower'" 2>/dev/null)

if [ -z "$DB_EXISTS" ]; then
    if [ -f "$DEPLOY_DIR/fitpower_dump.sql" ]; then
        echo "  Importing database dump..."
        sudo mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS fitpower CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'fitpower'@'localhost' IDENTIFIED BY 'fitpower_secret_2026';
GRANT ALL PRIVILEGES ON fitpower.* TO 'fitpower'@'localhost';
FLUSH PRIVILEGES;
SQL
        sudo mysql -u fitpower -pfitpower_secret_2026 fitpower < "$DEPLOY_DIR/fitpower_dump.sql"
        echo "  Database imported."
    else
        echo "  No database dump found. Creating empty database from schema..."
        sudo mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS fitpower CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'fitpower'@'localhost' IDENTIFIED BY 'fitpower_secret_2026';
GRANT ALL PRIVILEGES ON fitpower.* TO 'fitpower'@'localhost';
FLUSH PRIVILEGES;
SQL
        # Run schema
        if [ -f "$DEPLOY_DIR/schema.sql" ]; then
            sudo mysql -u fitpower -pfitpower_secret_2026 fitpower < "$DEPLOY_DIR/schema.sql"
        fi
        # Run migrations
        if [ -d "$DEPLOY_DIR/migrations" ]; then
            for f in $(ls "$DEPLOY_DIR/migrations/"*.sql 2>/dev/null | sort); do
                echo "  Running migration: $(basename $f)"
                sudo mysql -u fitpower -pfitpower_secret_2026 fitpower < "$f"
            done
        fi
        echo "  Database created."
    fi
else
    echo "  Database 'fitpower' already exists, skipping."
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

    ErrorLog ${APACHE_LOG_DIR}/fitpower-error.log
    CustomLog ${APACHE_LOG_DIR}/fitpower-access.log combined
</VirtualHost>
VHOST

sudo a2dissite 000-default 2>/dev/null || true
sudo a2ensite fitpower
sudo systemctl reload apache2

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
echo "  mysql -u fitpower -pfitpower_secret_2026 fitpower"
echo ""
echo "Logs:"
echo "  sudo tail -f /var/log/apache2/fitpower-error.log"
