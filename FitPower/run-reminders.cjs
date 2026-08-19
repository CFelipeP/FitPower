// Cron helper: trigger /system/reminders with the INTERNAL_API_SECRET header.
// Reads api/.env for INTERNAL_API_SECRET. Exits non-zero on failure.
const fs = require('fs');
const path = require('path');

const envCandidates = [
    path.join(__dirname, '..', 'api', '.env'),
    path.join(__dirname, 'api', '.env'),
    '/var/www/fitpower/api/.env',
];

let secret = '';
for (const envFile of envCandidates) {
    if (!fs.existsSync(envFile)) continue;
    const content = fs.readFileSync(envFile, 'utf8');
    const m = content.match(/^\s*INTERNAL_API_SECRET\s*=\s*(.+?)\s*$/m);
    if (m) {
        secret = m[1].replace(/^["']|["']$/g, '');
        break;
    }
}

if (!secret) {
    console.error('INTERNAL_API_SECRET not found in api/.env');
    process.exit(1);
}

const apiUrl = process.env.API_URL || 'http://127.0.0.1:8088/api/system/reminders';

fetch(apiUrl, {
    method: 'POST',
    headers: { 'X-Internal-Secret': secret },
})
    .then(async (res) => {
        if (!res.ok) {
            console.error('Reminders failed:', res.status, await res.text());
            process.exit(1);
        }
        console.log('Reminders processed:', await res.text());
        process.exit(0);
    })
    .catch((e) => {
        console.error('Reminders failed:', e.message);
        process.exit(1);
    });
