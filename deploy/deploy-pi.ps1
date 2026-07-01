# FitPower - Deploy to Raspberry Pi
# Usage: .\deploy-pi.ps1
# Requirements: Windows 10+ with built-in SSH client

$PI_USER = "sotomayorpi"
$PI_HOST = "192.168.0.14"
$PI_PASS = "123456789"
$DEPLOY_DIR = "/home/$PI_USER/fitpower-deploy"

$ROOT = Split-Path -Parent $PSScriptRoot
$DIST = Join-Path $ROOT "FitPower\dist"
$API = Join-Path $ROOT "api"
$DEPLOY = $PSScriptRoot

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " FitPower - Deploy to Raspberry Pi" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build frontend (if needed)
if (-not (Test-Path "$DIST\index.html")) {
    Write-Host "[1/6] Building frontend..." -ForegroundColor Yellow
    Push-Location (Join-Path $ROOT "FitPower")
    npm run build
    Pop-Location
} else {
    Write-Host "[1/6] Frontend already built at $DIST" -ForegroundColor Green
}

Write-Host ""

# Step 2: Create deployment package on Pi
Write-Host "[2/6] Creating remote directory..." -ForegroundColor Yellow
ssh "$PI_USER@$PI_HOST" "mkdir -p $DEPLOY_DIR/public $DEPLOY_DIR/api/migrations $DEPLOY_DIR/api/uploads/progress_photos"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  SSH connection failed. Check credentials and try again." -ForegroundColor Red
    exit 1
}
Write-Host "  Connected to $PI_USER@$PI_HOST" -ForegroundColor Green

# Step 3: Copy files via SCP
Write-Host "[3/6] Copying frontend files..." -ForegroundColor Yellow
scp -r "$DIST\*" "$PI_USER@$PI_HOST`:$DEPLOY_DIR/public/"
Write-Host "  Frontend copied." -ForegroundColor Green

Write-Host "[4/6] Copying API files (excluding node_modules, .git)..." -ForegroundColor Yellow
# Create tar on Windows and pipe to SSH for faster transfer
@(
    # API PHP files
    @{src=$API; dest="$DEPLOY_DIR/api/"}
) | ForEach-Object {
    scp -r "$($_.src)\*" "$PI_USER@$PI_HOST`:$($_.dest)"
}
Write-Host "  API copied." -ForegroundColor Green

Write-Host "[5/6] Copying config files..." -ForegroundColor Yellow
# Copy the Apache config
scp "$DEPLOY\fitpower.conf" "$PI_USER@$PI_HOST`:$DEPLOY_DIR/"
# Copy the env file (rename to .env for prod)
scp "$DEPLOY\.env.production" "$PI_USER@$PI_HOST`:$DEPLOY_DIR/.env"
# Copy setup script
scp "$DEPLOY\setup-pi.sh" "$PI_USER@$PI_HOST`:$DEPLOY_DIR/"
# Copy DB dump if it exists
if (Test-Path "$DEPLOY\fitpower_dump.sql") {
    scp "$DEPLOY\fitpower_dump.sql" "$PI_USER@$PI_HOST`:$DEPLOY_DIR/"
}
# Copy schema if it exists
if (Test-Path "$API\database\schema.sql") {
    scp "$API\database\schema.sql" "$PI_USER@$PI_HOST`:$DEPLOY_DIR/"
}
# Copy migrations
if (Test-Path "$API\database\migrations") {
    scp -r "$API\database\migrations\*" "$PI_USER@$PI_HOST`:$DEPLOY_DIR/migrations/"
}
Write-Host "  Config files copied." -ForegroundColor Green

# Step 6: Run setup script on Pi
Write-Host ""
Write-Host "[6/6] Running setup on Raspberry Pi..." -ForegroundColor Yellow
Write-Host "  (You will be prompted for the Pi password one more time)" -ForegroundColor Yellow
ssh "$PI_USER@$PI_HOST" "cd $DEPLOY_DIR && chmod +x setup-pi.sh && sudo bash setup-pi.sh"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " Deployment complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Open http://$PI_HOST`:8080 or https://$PI_HOST`:8443 in your browser" -ForegroundColor White
Write-Host ""
