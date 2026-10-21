'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '100kb' }));

/* ---------- Simple spam protection for routes that save data ---------- */
const hits = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_WRITES = 40;

function writeLimiter(req, res, next) {
    if (req.method !== 'POST') return next();
    const now = Date.now();
    const record = hits.get(req.ip);
    if (!record || now > record.reset) {
        hits.set(req.ip, { count: 1, reset: now + WINDOW_MS });
        return next();
    }
    record.count += 1;
    if (record.count > MAX_WRITES) {
        return res.status(429).json({ error: 'Too many requests. Please try again in a few minutes.' });
    }
    next();
}

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of hits) if (now > value.reset) hits.delete(key);
}, 10 * 60 * 1000).unref();

app.use(['/api/contact', '/api/designs', '/api/pricing/lock'], writeLimiter);

/* ---------- API routes ---------- */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', brand: 'Evelyn Jewels', time: new Date().toISOString() });
});

app.use('/api/products', require('./routes/products'));
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api/designs', require('./routes/designs'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/contact', require('./routes/contact'));

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
});

/* ---------- Serve the built React app (only after `npm run build`) ---------- */
const distDir = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.use((req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

/* ---------- Error handler ---------- */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({
        error: status >= 500 ? 'Something went wrong on the server' : err.message,
    });
});

app.listen(PORT, () => {
    console.log(`\n  Evelyn Jewels API running on http://localhost:${PORT}\n`);
});