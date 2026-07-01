# FitPower Development Server
# Looks for PHP in common paths, then falls back to PATH

$phpCandidates = @(
    "C:\laragon\bin\php\php-8.1.10-Win32-vs16-x64\php.exe",
    "C:\laragon\bin\php\php-8.2.*-Win32-vs16-x64\php.exe",
    "C:\tools\php\php.exe",
    "C:\php\php.exe",
    (Get-Command "php" -ErrorAction SilentlyContinue).Source
)

$php = $null
foreach ($candidate in $phpCandidates) {
    if ($candidate -and (Test-Path $candidate)) {
        $php = $candidate
        break
    }
    # Support wildcard paths
    if ($candidate -like '*\php-8.2.*\php.exe') {
        $dirs = Get-ChildItem "C:\laragon\bin\php" -Filter "php-8.2*" -Directory | Select-Object -First 1
        if ($dirs) {
            $exe = Join-Path $dirs.FullName "php.exe"
            if (Test-Path $exe) { $php = $exe; break }
        }
    }
}

if (-not $php) {
    Write-Host "PHP not found. Install Laragon or add php to PATH." -ForegroundColor Red
    exit 1
}

$apiDir = Join-Path $PSScriptRoot "api"
$frontDir = Join-Path $PSScriptRoot "FitPower"

Write-Host "=== FitPower Development Server ===" -ForegroundColor Cyan
Write-Host "PHP: $php" -ForegroundColor Gray
Write-Host ""

# Start PHP API server
Write-Host "[1/2] Starting PHP API on http://127.0.0.1:8088 ..." -ForegroundColor Yellow
$phpProc = Start-Process -FilePath $php -ArgumentList "-S 0.0.0.0:8088 -t `"$apiDir`" `"$apiDir\index.php`"" -NoNewWindow -PassThru
Start-Sleep -Seconds 1

# Verify PHP started
try {
    $test = Invoke-RestMethod -Uri "http://127.0.0.1:8088/plans" -ErrorAction Stop -TimeoutSec 2
    Write-Host "   PHP API running on http://127.0.0.1:8088" -ForegroundColor Green
} catch {
    Write-Host "   PHP API started (check http://127.0.0.1:8088)" -ForegroundColor Yellow
}

# Start Vite dev server
Write-Host "[2/2] Starting Vite frontend on http://localhost:5177 ..." -ForegroundColor Yellow
Set-Location -Path $frontDir
$viteProc = Start-Process -FilePath "npm" -ArgumentList "run dev" -NoNewWindow -PassThru

Write-Host ""
Write-Host "=== Frontend: http://localhost:5177 ===" -ForegroundColor Cyan
Write-Host "=== API:      http://127.0.0.1:8088 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to stop all servers..." -ForegroundColor Magenta
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "Stopping servers..." -ForegroundColor Yellow
try { Stop-Process -Id $phpProc.Id -Force -ErrorAction SilentlyContinue } catch {}
try { Stop-Process -Id $viteProc.Id -Force -ErrorAction SilentlyContinue } catch {}
Write-Host "Done." -ForegroundColor Green
