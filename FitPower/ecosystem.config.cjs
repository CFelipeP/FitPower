// PM2 process manager config for FitPower
// Usage: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    // ---- PHP API (built-in server) ----
    {
      name: 'fitpower-api',
      script: 'php',
      args: '-S 127.0.0.1:8088 -t api api/index.php',
      cwd: '/var/www/fitpower',
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: '150M',
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },

    // ---- Chat WebSocket ----
    {
      name: 'fitpower-chat',
      script: 'chat-server.js',
      cwd: '/var/www/fitpower',
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: '100M',
      env: {
        NODE_ENV: 'production',
        API_BASE_URL: 'http://127.0.0.1:8088',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },

    // ---- Mediasoup Video SFU ----
    {
      name: 'fitpower-mediasoup',
      script: 'mediasoup-server.js',
      cwd: '/var/www/fitpower',
      autorestart: true,
      max_restarts: 5,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        API_BASE_URL: 'http://127.0.0.1:8088',
        MEDIASOUP_ANNOUNCED_IP: process.env.MEDIASOUP_ANNOUNCED_IP || '192.168.0.14',
        TURN_URL: process.env.TURN_URL || '',
        TURN_USERNAME: process.env.TURN_USERNAME || '',
        TURN_CREDENTIAL: process.env.TURN_CREDENTIAL || '',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },

    // ---- Push Notification Server (optional - won't crash if Firebase missing) ----
    {
      name: 'fitpower-push',
      script: 'public/push-server.cjs',
      cwd: '/var/www/fitpower',
      autorestart: true,
      max_restarts: 5,
      max_memory_restart: '100M',
      env: {
        NODE_ENV: 'production',
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || '3306',
        DB_USER: process.env.DB_USER || 'fitpower',
        DB_PASS: process.env.DB_PASS || '',
        DB_NAME: process.env.DB_NAME || 'fitpower',
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
        FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
        FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
