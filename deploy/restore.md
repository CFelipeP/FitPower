# FitPowerPro — Restore / Recovery

## From a backup directory (`/home/perezpi/backups/backup_YYYYMMDD_HHMMSS/`)

1. **Database**
   ```bash
   mysql -u fitpower -pFitPowerPi2026! -h 127.0.0.1 fitpower < backup_.../fitpower_db.sql
   ```
   > If the schema must be recreated first (fresh DB): `mysql -u root -p -e "DROP DATABASE IF EXISTS fitpower; CREATE DATABASE fitpower CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"` then import as above.

2. **Configuration**
   ```bash
   sudo cp backup_.../fitpower.env /home/perezpi/fitpower/api/.env
   sudo chmod 600 /home/perezpi/fitpower/api/.env
   ```

3. **Nginx**
   ```bash
   sudo cp backup_.../nginx_fitpower.conf /etc/nginx/sites-available/fitpower
   sudo nginx -t && sudo systemctl reload nginx
   ```

4. **Uploads**
   ```bash
   sudo tar -xzf backup_.../uploads.tar.gz -C /home/perezpi/fitpower/api
   sudo chown -R perezpi:perezpi /home/perezpi/fitpower/api/uploads
   ```

5. **Services**
   ```bash
   sudo systemctl restart fitpower-api fitpower-chat fitpower-push
   ```

## Code rollback
Git tag `pre-prod-backup` points to the state before production hardening.
```bash
cd /home/perezpi/fitpower && git reset --hard pre-prod-backup   # then rebuild frontend
```

## Verification after restore
```bash
bash deploy/healthcheck.sh
```
