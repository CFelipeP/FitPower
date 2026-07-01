# Run reminders every 30 minutes
while ($true) {
    try {
        Invoke-RestMethod -Uri "http://127.0.0.1:8088/api/system/reminders" -Method Post
    } catch {}
    Start-Sleep -Seconds 1800
}
