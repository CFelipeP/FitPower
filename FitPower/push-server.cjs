const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Load shared credentials from the API .env (dev layout: <repo>/FitPower + <repo>/api;
// flattened layout: <root>/push-server.cjs + <root>/api).
const dotenvCandidates = [
  path.join(__dirname, '..', 'api', '.env'),
  path.join(__dirname, 'api', '.env'),
];
for (const candidate of dotenvCandidates) {
  if (fs.existsSync(candidate)) {
    require('dotenv').config({ path: candidate });
    break;
  }
}

const express = require('express');
const admin = require('firebase-admin');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

const PORT = 5182;

// Service-to-service authentication. Requests to /send-push and /send-push-multi
// must carry a matching X-Internal-Secret header. Fail closed: without a
// configured secret the push endpoints refuse to run.
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || '';

function requireInternalSecret(req, res, next) {
  if (!INTERNAL_SECRET) {
    return res.status(503).json({ error: 'INTERNAL_API_SECRET not configured' });
  }
  const provided = req.get('X-Internal-Secret') || '';
  const expected = Buffer.from(INTERNAL_SECRET);
  const received = Buffer.from(provided);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Firebase Admin SDK - lazy init with env vars
let firebaseInitialized = false;
function initFirebase() {
  if (firebaseInitialized) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[PushServer] Firebase not configured — push disabled');
    return;
  }
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
  firebaseInitialized = true;
  console.log('[PushServer] Firebase Admin initialized');
}

// DB connection (same config as PHP)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'fitpower',
};

async function getFcmToken(userId) {
  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute('SELECT fcm_token FROM users WHERE id = ?', [userId]);
  await conn.end();
  return rows.length > 0 ? rows[0].fcm_token : null;
}

// POST /send-push
app.post('/send-push', requireInternalSecret, async (req, res) => {
  const { userId, title, body, data } = req.body;
  if (!userId || !title) return res.status(400).json({ error: 'userId and title required' });

  initFirebase();
  if (!firebaseInitialized) return res.status(503).json({ error: 'Firebase not configured' });

  try {
    const fcmToken = await getFcmToken(userId);
    if (!fcmToken) return res.status(404).json({ error: 'No FCM token for user' });

    const message = {
      token: fcmToken,
      notification: { title, body: body || '' },
      data: data || {},
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, messageId: response });
  } catch (err) {
    console.error('[PushServer] Send error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /send-push-multi - broadcast to multiple users
app.post('/send-push-multi', requireInternalSecret, async (req, res) => {
  const { userIds, title, body, data } = req.body;
  if (!userIds || !userIds.length) return res.status(400).json({ error: 'userIds required' });

  initFirebase();
  if (!firebaseInitialized) return res.status(503).json({ error: 'Firebase not configured' });

  const conn = await mysql.createConnection(dbConfig);
  const placeholders = userIds.map(() => '?').join(',');
  const [rows] = await conn.execute(`SELECT id, fcm_token FROM users WHERE id IN (${placeholders}) AND fcm_token IS NOT NULL`, userIds);
  await conn.end();

  const results = [];
  for (const row of rows) {
    if (!row.fcm_token) continue;
    try {
      const response = await admin.messaging().send({
        token: row.fcm_token,
        notification: { title, body: body || '' },
        data: data || {},
      });
      results.push({ userId: row.id, success: true, messageId: response });
    } catch (err) {
      results.push({ userId: row.id, success: false, error: err.message });
    }
  }
  res.json({ results });
});

// Health check (no sensitive data, left open for load-balancer probes)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[PushServer] Running on http://127.0.0.1:${PORT}`);
  initFirebase();
});
