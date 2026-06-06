$php = "C:\laragon\bin\php\php-8.1.10-Win32-vs16-x64\php.exe"
$apiDir = "C:\laragon\www\FitPower\api"
$frontDir = "C:\laragon\www\FitPower\FitPower"

Write-Host "=== FitPower Development Server ===" -ForegroundColor Cyan
Write-Host ""

# Start PHP API server
Write-Host "[1/2] Starting PHP API on http://127.0.0.1:8088 ..." -ForegroundColor Yellow
$phpProc = Start-Process -FilePath $php -ArgumentList "-S 0.0.0.0:8088 -t `"$apiDir`" `"$apiDir\index.php`"" -NoNewWindow -PassThru
Start-Sleep -Seconds 1

# Verify PHP started
$test = try { Invoke-RestMethod -Uri "http://127.0.0.1:8088/plans" -ErrorAction Stop } catch { $null }
if ($test) {
    Write-Host "   PHP API running on http://127.0.0.1:8088" -ForegroundColor Green
} else {
    Write-Host "   PHP API might not have started properly" -ForegroundColor Red
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
Stop-Process -Id $phpProc.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $viteProc.Id -Force -ErrorAction SilentlyContinue
Write-Host "Done." -ForegroundColor Green
