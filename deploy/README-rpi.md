# FitPower - Raspberry Pi 5 Deployment Guide

## Hardware

- Raspberry Pi 5 (8GB recommended)
- 64-bit Raspberry Pi OS (Bookworm)
- SSD via USB3 (recommended over microSD)
- At least 32GB storage

## Quick Deploy

```bash
# 1. Copy files to Pi
scp -r deploy/ pi@192.168.0.14:~/
scp -r api/ pi@192.168.0.14:~/
scp -r FitPower/ pi@192.168.0.14:~/

# 2. SSH and run setup
ssh pi@192.168.0.14
cd ~/deploy
sudo bash setup-rpi.sh

# 3. Configure environment
cp deploy/.env.rpi ~/api/.env
nano ~/api/.env   # Edit with your real keys

# 4. Build and deploy
cd ~/FitPower
npm install
npm run build

# 5. Copy to production
sudo mkdir -p /var/www/fitpower
sudo cp -r dist/* /var/www/fitpower/public/
sudo cp -r ~/api/* /var/www/fitpower/api/
sudo cp ecosystem.config.cjs /var/www/fitpower/

# 6. Install API deps
cd /var/www/fitpower/api
sudo composer install --no-dev --optimize-autoloader

# 7. Setup DB
sudo mysql -u root < api/database/schema.sql
mysql -u fitpower -p fitpower < api/database/seed_programs.sql

# 8. Install Node deps
cd /var/www/fitpower
npm install --omit=dev

# 9. Start all services
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

# 10. Access at http://<your-pi-ip>
```

## Port Map

| Port | Service | External? |
|------|---------|-----------|
| 80 | Nginx (HTTP) | YES |
| 5180 | Chat WebSocket | Internal (Nginx proxies) |
| 5181 | Mediasoup Signal | Internal (Nginx proxies) |
| 5182 | Push Server | Internal |
| 8088 | PHP API | Internal (Nginx proxies) |
| 3306 | MariaDB | NO |
| 40000-49999 | RTP (Mediasoup) | External if video calls |

## Video Calls (Mediasoup)

For video calls to work outside your LAN, you need one of:

### Option A: TURN Server (recommended)
```bash
sudo apt install coturn
# Edit /etc/turnserver.conf
# Set MEDIASOUP_ANNOUNCED_IP in ecosystem.config.cjs
```

### Option B: Cloudflare Tunnel
```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared
./cloudflared tunnel create fitpower
```

## PM2 Management

```bash
pm2 status           # List all services
pm2 logs             # All logs
pm2 logs fitpower-api  # Specific service
pm2 restart all      # Restart everything
pm2 stop all         # Stop everything
```

## Troubleshooting

1. **Mediasoup fails to start**: Check `pm2 logs fitpower-mediasoup`. May need `sudo apt install libsrtp2-1`
2. **PHP errors**: Check `sudo tail -f /var/log/nginx/error.log`
3. **DB connection**: Verify credentials in `/var/www/fitpower/api/.env`
4. **Port conflicts**: `sudo netstat -tlnp | grep -E '80|5180|5181|8088'`
