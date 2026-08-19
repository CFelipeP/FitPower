# FitPower - Deploy to Raspberry Pi
# Usage: .\deploy-pi.ps1
# Requirements: Windows 10+ with built-in SSH client
# The Pi must already have run deploy/setup-rpi.sh (or setup-pi.sh) once.

$PI_USER = "sotomayorpi"
$PI_HOST = "192.168.0.14"
# Never hardcode credentials. Prompt at runtime instead.
$PI_PASS = $env:PI_PASS
$DEPLOY_DIR = "/home/$PI_USER/fitpower-deploy"

$ROOT = Split-Path -Parent $PSScriptRoot
$DIST = Join-Path $ROOT "FitPower\dist"
$API = Join-Path $ROOT "api"
$FRONT = Join-Path $ROOT "FitPower"
$DEPLOY = $PSScriptRoot

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " FitPower - Deploy to Raspberry Pi" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build frontend (if needed)
if (-not (Test-Path "$DIST\index.html")) {
    Write-Host "[1/7] Building frontend..." -ForegroundColor Yellow
    Push-Location $FRONT
    npm run build
    Pop-Location
} else {
    Write-Host "[1/7] Frontend already built at $DIST" -ForegroundColor Green
}

Write-Host ""

# Step 2: Create deployment package on Pi
Write-Host "[2/7] Creating remote directory..." -ForegroundColor Yellow
ssh "$PI_USER@$PI_HOST" "mkdir -p $DEPLOY_DIR/public $DEPLOY_DIR/api/database/migrations $DEPLOY_DIR/api/uploads $DEPLOY_DIR/node"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  SSH connection failed. Check credentials and try again." -ForegroundColor Red
    exit 1
}
Write-Host "  Connected to $PI_USER@$PI_HOST" -ForegroundColor Green

# Step 3: Copy frontend
Write-Host "[3/7] Copying frontend files..." -ForegroundColor Yellow
scp -r "$DIST\*" "$PI_USER@$PI_HOST`:$DEPLOY_DIR/public/"
Write-Host "  Frontend copied." -ForegroundColor Green

# Step 4: Copy API files (excluding vendor, uploads, logs, tests, .env)
Write-Host "[4/7] Copying API files (excluding vendor/upload/.env)..." -ForegroundColor Yellow
# Build a local staging copy without the heavy/local-only dirs, then SCP it.
$STAGE = Join-Path $env:TEMP "fitpower-api-stage"
if (Test-Path $STAGE) { Remove-Item -Recurse -Force $STAGE }
New-Item -ItemType Directory -Path $STAGE | Out-Null
Copy-Item -Path "$API\*" -Destination $STAGE -Recurse -Force
# Remove things that must NOT go to production
foreach ($junk in @("vendor", "uploads", "logs", "tests", ".env", ".git")) {
    $p = Join-Path $STAGE $junk
    if (Test-Path $p) { Remove-Item -Recurse -Force $p }
}
scp -r "$STAGE\*" "$PI_USER@$PI_HOST`:$DEPLOY_DIR/api/"
Remove-Item -Recurse -Force $STAGE
Write-Host "  API copied (vendor excluded - composer install runs on the Pi)." -ForegroundColor Green

# Step 5: Copy Node server files (chat, mediasoup, push, PM2 ecosystem)
Write-Host "[5/7] Copying Node service files..." -ForegroundColor Yellow
foreach ($f in @("package.json", "package-lock.json", "chat-server.js", "chat-auth.js", "mediasoup-server.js", "ecosystem.config.cjs")) {
    $src = Join-Path $FRONT $f
    if (Test-Path $src) { scp $src "$PI_USER@$PI_HOST`:$DEPLOY_DIR/node/" }
}
# push-server.cjs lives in public/ and is also emitted to dist/
$pushSrc = Join-Path $FRONT "public\push-server.cjs"
if (Test-Path $pushSrc) { scp $pushSrc "$PI_USER@$PI_HOST`:$DEPLOY_DIR/node/push-server.cjs" }
Write-Host "  Node service files copied." -ForegroundColor Green

# Step 6: Copy deploy config + scripts
Write-Host "[6/7] Copying config files..." -ForegroundColor Yellow
scp "$DEPLOY\setup-pi.sh" "$PI_USER@$PI_HOST`:$DEPLOY_DIR/"
scp "$DEPLOY\setup-rpi.sh" "$PI_USER@$PI_HOST`:$DEPLOY_DIR/"
scp "$DEPLOY\release-rpi.sh" "$PI_USER@$PI_HOST`:$DEPLOY_DIR/"
scp "$DEPLOY\rollback-rpi.sh" "$PI_USER@$PI_HOST`:$DEPLOY_DIR/"
scp "$DEPLOY\check-health.sh" "$PI_USER@$PI_HOST`:$DEPLOY_DIR/"
scp "$DEPLOY\fitpower.conf" "$PI_USER@$PI_HOST`:$DEPLOY_DIR/"
# Env template renamed to .env on the Pi (edit values before running setup).
scp "$DEPLOY\.env.production" "$PI_USER@$PI_HOST`:$DEPLOY_DIR/.env"
Write-Host "  Config files copied." -ForegroundColor Green

# Step 7: Run setup script on Pi
Write-Host ""
Write-Host "[7/7] Running setup on Raspberry Pi..." -ForegroundColor Yellow
Write-Host "  (You will be prompted for the Pi password)" -ForegroundColor Yellow
ssh "$PI_USER@$PI_HOST" "cd $DEPLOY_DIR && chmod +x setup-pi.sh setup-rpi.sh && echo 'Run: sudo bash setup-pi.sh   (Apache)  or  sudo DB_APP_PASS=<pass> INTERNAL_API_SECRET=<secret> bash setup-rpi.sh   (Nginx+PM2)'"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " Package uploaded!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next, SSH into the Pi and run one of the setup scripts:"
Write-Host "    sudo bash ~/fitpower-deploy/setup-pi.sh                        (Apache)"
Write-Host "    sudo DB_APP_PASS=<pass> INTERNAL_API_SECRET=<secret> bash ~/fitpower-deploy/setup-rpi.sh   (Nginx + PM2)"
Write-Host ""
Write-Host "  Then set real values in /var/www/fitpower/api/.env (JWT_SECRET, DB_PASS, APP_URL)."
Write-Host ""
