// ═══════════════════════════════════════════════════════════════════
//  CTE 2018 — site server
//  • Serves the static website
//  • Provides the content API used by the admin panel + public pages
//  • Stores the content in MongoDB when MONGODB_URI is set (online,
//    persistent), otherwise in content.json (local development).
//
//  Local run:      node server.js
//  Render:         set MONGODB_URI and ADMIN_PASSWORD in the dashboard
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cte2026';
const CONTENT_FILE = path.join(__dirname, 'content.json');
const MONGO_URI = process.env.MONGODB_URI || '';

// ── Optional MongoDB driver (only required when MONGODB_URI is set) ──
let MongoClient = null;
try { ({ MongoClient } = require('mongodb')); } catch (e) { MongoClient = null; }

let contentCollection = null; // set once MongoDB is connected
let storageMode = 'file';     // 'file' | 'mongo'

// ── Helpers ──────────────────────────────────────────────────────────
function readFileContent() {
  try { return JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf-8')); }
  catch (e) { return null; }
}

async function getContent() {
  if (contentCollection) {
    try {
      const doc = await contentCollection.findOne({ _id: 'main' });
      if (doc && doc.data) return doc.data;
    } catch (e) {
      console.error('[db] read failed:', e.message);
    }
  }
  return readFileContent() || {};
}

async function saveContent(obj) {
  if (contentCollection) {
    await contentCollection.replaceOne(
      { _id: 'main' },
      { _id: 'main', data: obj, updatedAt: new Date() },
      { upsert: true }
    );
    return 'mongo';
  }
  fs.writeFileSync(CONTENT_FILE, JSON.stringify(obj, null, 2));
  return 'file';
}

async function initDb() {
  if (!MONGO_URI) {
    console.log('[db] MONGODB_URI not set → storing in content.json (local mode)');
    return;
  }
  if (!MongoClient) {
    console.warn('[db] MONGODB_URI is set but the "mongodb" package is missing → using content.json');
    return;
  }
  try {
    const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    contentCollection = client.db().collection('site');
    storageMode = 'mongo';
    console.log('[db] Connected to MongoDB ✓');

    // First run: seed the database from content.json
    const existing = await contentCollection.findOne({ _id: 'main' });
    if (!existing) {
      const seed = readFileContent();
      if (seed) {
        await contentCollection.replaceOne({ _id: 'main' }, { _id: 'main', data: seed, updatedAt: new Date() }, { upsert: true });
        console.log('[db] Seeded MongoDB from content.json');
      }
    }
  } catch (e) {
    console.error('[db] MongoDB connection failed:', e.message, '→ using content.json');
    contentCollection = null;
    storageMode = 'file';
  }
}

// ── Middleware ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));

function requireAdmin(req, res, next) {
  const pass = req.get('x-admin-password') || (req.body && req.body.__password) || req.query.password;
  if (pass !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

// ── Content API ──────────────────────────────────────────────────────
// /content.json is served dynamically so public pages always get fresh
// data (from MongoDB when configured). /load is kept for the admin panel.
app.get(['/content.json', '/load'], async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
  try {
    res.json(await getContent());
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/save', requireAdmin, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ ok: false, error: 'Invalid body' });
    }
    const body = Object.assign({}, req.body);
    delete body.__password;
    const where = await saveContent(body);
    res.json({ ok: true, storedIn: where });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true, storage: storageMode, dbConnected: !!contentCollection });
});

// Lightweight password check used by the admin login screen.
app.post('/verify', requireAdmin, (req, res) => {
  res.json({ ok: true, storage: storageMode });
});

// ── Static site ──────────────────────────────────────────────────────
// (content.json is handled by the route above, so static never serves it)
app.use(express.static(__dirname, {
  index: 'index.html',
  setHeaders: function (res, filePath) {
    if (filePath.endsWith('content.json')) {
      res.set('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
    }
  }
}));

// ── Start ────────────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => {
    console.log('CTE server running on port ' + PORT + ' (storage: ' + storageMode + ')');
  });
});
