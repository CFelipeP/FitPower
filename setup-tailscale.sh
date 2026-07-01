#!/bin/bash
# ============================================
# SETUP COMPLETO: FitPower + Tailscale + PM2
# Ejecutar en la Raspberry Pi:
#   chmod +x setup-tailscale.sh && ./setup-tailscale.sh
# ============================================
set -e

echo "========================================"
echo "  FitPower - Instalación completa"
echo "========================================"

# ---------- 1. TAILSCALE ----------
echo "[1/6] Instalando Tailscale..."
curl -fsSL https://tailscale.com/install.sh | sh
echo "  Listo. Inicia sesión con:"
echo "    sudo tailscale up"
echo "  Luego anota la IP (100.x.x.x) con:"
echo "    tailscale ip -4"
echo ""

read -p "¿Ya iniciaste sesión en Tailscale? (s/n): " ok
if [ "$ok" != "s" ]; then
    echo "Ejecuta: sudo tailscale up"
    echo "Vuelve a correr este script después"
    exit 1
fi

TS_IP=$(tailscale ip -4)
echo "  Tailscale IP: $TS_IP"

# ---------- 2. INSTALAR NODE + PHP (si faltan) ----------
echo "[2/6] Verificando dependencias..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo apt install -y nodejs
fi
if ! command -v php &> /dev/null; then
    sudo apt install -y php php-mysql php-curl php-mbstring php-xml
fi

# ---------- 3. PREPARAR CARPETA ----------
echo "[3/6] Preparando proyecto..."
cd ~/fitpower

# ---------- 4. INSTALAR DEPENDENCIAS ----------
echo "[4/6] Instalando npm packages..."
npm install
sudo npm install -g pm2

# Reconstruir frontend con la IP correcta de Tailscale
echo "  Reconstruyendo frontend con IP: $TS_IP..."
VITE_MEDIASOUP_WS_URL="ws://$TS_IP:5181" VITE_WS_URL="ws://$TS_IP:5180" npx vite build

# ---------- 5. CREAR SERVICIOS PM2 ----------
echo "[5/6] Creando servicios PM2..."
pm2 delete all 2>/dev/null || true

# Mediasoup (con Tailscale IP)
MEDIASOUP_ANNOUNCED_IP=$TS_IP pm2 start mediasoup-server.js --name mediasoup

# Chat
pm2 start chat-server.js --name chat

# API PHP
pm2 start "php -S 0.0.0.0:8088 -t api api/index.php" --name php-api

# Frontend
pm2 serve dist/ 5177 --name frontend --spa

# Guardar y auto-inicio
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u sotomayorpi --hp /home/sotomayorpi

# ---------- 6. MOSTRAR INSTRUCCIONES ----------
echo ""
echo "========================================"
echo "  INSTALACIÓN COMPLETA"
echo "========================================"
echo ""
echo "  Frontend: http://$TS_IP:5177"
echo "  API:      http://$TS_IP:8088"
echo "  Chat WS:  ws://$TS_IP:5180"
echo "  Mediasoup: ws://$TS_IP:5181"
echo ""
echo "  === PARA TUS COMPAÑEROS ==="
echo "  1. Instalar Tailscale en su PC/Móvil"
echo "     https://tailscale.com/download"
echo "  2. Iniciar sesión con su cuenta Google"
echo "  3. Abrir: http://$TS_IP:5177"
echo ""
echo "  === TÚ (ADMIN) ==="
echo "  Tu PC con Tailscale también puede"
echo "  acceder a la misma IP."
echo ""
echo "  === ADMINISTRACIÓN ==="
echo "  Ver logs:    pm2 logs"
echo "  Reiniciar:   pm2 restart all"
echo "  Detener:     pm2 stop all"
echo "========================================"
