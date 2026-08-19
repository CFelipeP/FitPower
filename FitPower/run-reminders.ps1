# Run reminders every 30 minutes
# Requires INTERNAL_API_SECRET from api/.env (X-Internal-Secret header)
$envFile = Join-Path $PSScriptRoot 'api\.env'
if (-not (Test-Path $envFile)) {
    $envFile = Join-Path $PSScriptRoot '..\api\.env'
}
$secret = ''
if (Test-Path $envFile) {
    foreach ($line in [System.IO.File]::ReadAllLines($envFile)) {
        if ($line -match '^\s*INTERNAL_API_SECRET\s*=\s*(.+)\s*$') {
            $secret = $Matches[1].Trim().Trim('"').Trim("'")
            break
        }
    }
}
if ($secret -eq '') {
    Write-Error "INTERNAL_API_SECRET not found in $envFile"
    exit 1
}

while ($true) {
    try {
        Invoke-RestMethod -Uri "http://127.0.0.1:8088/api/system/reminders" -Method Post -Headers @{ 'X-Internal-Secret' = $secret }
    } catch {
        Write-Warning "Reminders failed: $($_.Exception.Message)"
    }
    Start-Sleep -Seconds 1800
}
