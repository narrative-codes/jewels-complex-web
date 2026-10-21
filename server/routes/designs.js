'use strict';

const express = require('express');
const crypto = require('crypto');
const db = require('../utils/db');
const { calculatePrice, resolveConfig } = require('../utils/pricingEngine');

const router = express.Router();
const MAX_SAVED = 5000;

// POST /api/designs  { name, config } -> saves a design and returns a shareable path
router.post('/', (req, res) => {
    const { name, config } = req.body || {};
    const { config: clean, spec } = resolveConfig(config);

    const title =
        String(name ?? '')
            .replace(/[\u0000-\u001f\u007f<>]/g, '')
            .trim()
            .slice(0, 40) || 'My Design';

    const design = {
        id: crypto.randomBytes(6).toString('base64url'), // 8 URL-safe characters
        name: title,
        config: clean,
        createdAt: new Date().toISOString(),
    };

    db.update('designs', (list) => {
        list.push(design);
        if (list.length > MAX_SAVED) list.splice(0, list.length - MAX_SAVED);
        return list;
    });

    res.status(201).json({
        design,
        price: calculatePrice(spec),
        sharePath: `/studio?design=${design.id}`,
    });
});

// GET /api/designs/:id  -> open a shared design with today's price
router.get('/:id', (req, res) => {
    const { id } = req.params;
    if (!/^[A-Za-z0-9_-]{6,12}$/.test(id)) return res.status(400).json({ error: 'Invalid design id' });

    const design = db.read('designs').find((d) => d.id === id);
    if (!design) return res.status(404).json({ error: 'Design not found' });

    const { spec } = resolveConfig(design.config);
    res.json({ design, price: calculatePrice(spec) });
});

module.exports = router;