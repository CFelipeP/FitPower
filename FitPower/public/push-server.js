const admin = require('firebase-admin');
const mysql = require('mysql2/promise');
require('dotenv').config();

const POLL_INTERVAL = 5000;
const PUSH_PORT = 5182;

async function main() {
  // Init Firebase
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  let firebaseReady = false;
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    firebaseReady = true;
    console.log('[PushServer] Firebase Admin initialized');
  } else {
    console.warn('[PushServer] Firebase not configured — running in poll-only mode');
  }

  // DB connection
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'fitpower',
  });

  // Poll for unsent notifications
  async function pollNotifications() {
    try {
      if (!firebaseReady) return;
      const [rows] = await db.execute(
        "SELECT n.*, u.fcm_token FROM notifications n JOIN users u ON u.id = n.user_id WHERE n.is_push_sent = 0 AND u.fcm_token IS NOT NULL LIMIT 50"
      );
      for (const row of rows) {
        try {
          await admin.messaging().send({
            token: row.fcm_token,
            notification: { title: row.title, body: row.message || '' },
            data: { type: row.type || 'general', link: row.link || '', notification_id: String(row.id) },
          });
          await db.execute("UPDATE notifications SET is_push_sent = 1 WHERE id = ?", [row.id]);
        } catch (e) {
          if (e.code === 'messaging/registration-token-not-registered') {
            await db.execute("UPDATE users SET fcm_token = NULL WHERE id = ?", [row.user_id]);
          }
          console.error('[PushServer] Send error:', e.message);
        }
      }
    } catch (e) {
      console.error('[PushServer] Poll error:', e.message);
    }
  }

  setInterval(pollNotifications, POLL_INTERVAL);

  // HTTP server for on-demand push
  const express = require('express');
  const app = express();
  app.use(express.json());

  app.post('/send-push', async (req, res) => {
    const { userId, title, body, data } = req.body;
    if (!userId || !title) return res.status(400).json({ error: 'userId and title required' });
    if (!firebaseReady) return res.status(503).json({ error: 'Firebase not configured' });
    try {
      const [rows] = await db.execute('SELECT fcm_token FROM users WHERE id = ?', [userId]);
      if (!rows.length || !rows[0].fcm_token) return res.status(404).json({ error: 'No FCM token' });
      const response = await admin.messaging().send({
        token: rows[0].fcm_token,
        notification: { title, body: body || '' },
        data: data || {},
      });
      res.json({ success: true, messageId: response });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/send-push-multi', async (req, res) => {
    const { userIds, title, body, data } = req.body;
    if (!userIds?.length) return res.status(400).json({ error: 'userIds required' });
    if (!firebaseReady) return res.status(503).json({ error: 'Firebase not configured' });
    const placeholders = userIds.map(() => '?').join(',');
    const [rows] = await db.execute(`SELECT id, fcm_token FROM users WHERE id IN (${placeholders}) AND fcm_token IS NOT NULL`, userIds);
    const results = [];
    for (const row of rows) {
      try {
        const response = await admin.messaging().send({
          token: row.fcm_token,
          notification: { title, body: body || '' },
          data: data || {},
        });
        results.push({ userId: row.id, success: true, messageId: response });
      } catch (e) {
        results.push({ userId: row.id, success: false, error: e.message });
      }
    }
    res.json({ results });
  });

  app.get('/health', (req, res) => res.json({ status: 'ok', firebaseReady, pendingInterval: POLL_INTERVAL }));

  app.listen(PUSH_PORT, '127.0.0.1', () => {
    console.log(`[PushServer] HTTP on :${PUSH_PORT}, polling every ${POLL_INTERVAL}ms`);
  });
}

main().catch(e => { console.error('[PushServer] Fatal:', e); process.exit(1); });
