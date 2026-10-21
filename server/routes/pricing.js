'use strict';

const express = require('express');
const crypto = require('crypto');
const db = require('../utils/db');
const {
    LOCK_HOURS,
    getRates,
    calculatePrice,
    resolveConfig,
    specFromProduct,
    getOptions,
} = require('../utils/pricingEngine');

const router = express.Router();
const HOUR_MS = 60 * 60 * 1000;
const KEEP_EXPIRED_MS = 7 * 24 * HOUR_MS;

// GET /api/pricing/rate  -> current gold and silver rates
router.get('/rate', (req, res) => {
    res.json(getRates());
});

// GET /api/pricing/options  -> everything the Design Studio needs to draw its controls
router.get('/options', (req, res) => {
    res.json(getOptions());
});

// POST /api/pricing/calculate  { config } -> live price for a custom design
router.post('/calculate', (req, res) => {
    const { config, spec } = resolveConfig(req.body && req.body.config);
    res.json({ config, price: calculatePrice(spec) });
});

/* ------------------------------ price lock ------------------------------ */

function formatLock(lock) {
    const remainingMs = Math.max(0, new Date(lock.expiresAt).getTime() - Date.now());
    const currentPrice = calculatePrice(lock.spec, getRates()).total;
    return {
        id: lock.id,
        itemName: lock.itemName,
        source: lock.source,
        status: remainingMs > 0 ? 'active' : 'expired',
        createdAt: lock.createdAt,
        expiresAt: lock.expiresAt,
        remainingMs,
        lockedPrice: lock.price.total,
        breakdown: lock.price,
        currentPrice,
        // positive = the lock is saving you money compared to today's rate
        savings: currentPrice - lock.price.total,
        rateAtLock: lock.rateAtLock,
    };
}

// POST /api/pricing/lock  { productId } or { config }  -> freezes the price for 24 hours
router.post('/lock', (req, res) => {
    const { productId, config } = req.body || {};
    let spec;
    let itemName;
    let source;

    if (productId) {
        const product = db.read('products').find((p) => p.id === String(productId));
        if (!product) return res.status(404).json({ error: 'Product not found' });
        spec = specFromProduct(product);
        itemName = product.name;
        source = { type: 'product', id: product.id };
    } else if (config) {
        const resolved = resolveConfig(config);
        spec = resolved.spec;
        itemName = 'Custom Design';
        source = { type: 'design', config: resolved.config };
    } else {
        return res.status(400).json({ error: 'Send either productId or config' });
    }

    const now = new Date();
    const rates = getRates(now);
    const lock = {
        id: `LK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        source,
        itemName,
        spec,
        price: calculatePrice(spec, rates),
        rateAtLock: { perTola24k: rates.perTola24k, perGram24k: rates.perGram24k },
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + LOCK_HOURS * HOUR_MS).toISOString(),
    };

    db.update('locks', (locks) => {
        const cutoff = Date.now() - KEEP_EXPIRED_MS;
        const kept = locks.filter((l) => new Date(l.expiresAt).getTime() > cutoff);
        kept.push(lock);
        return kept;
    });

    res.status(201).json(formatLock(lock));
});

// GET /api/pricing/lock/:id  -> status, time remaining and savings
router.get('/lock/:id', (req, res) => {
    const id = String(req.params.id).toUpperCase();
    if (!/^LK-[0-9A-F]{8}$/.test(id)) return res.status(400).json({ error: 'Invalid lock id' });
    const lock = db.read('locks').find((l) => l.id === id);
    if (!lock) return res.status(404).json({ error: 'Price lock not found' });
    res.json(formatLock(lock));
});

module.exports = router;