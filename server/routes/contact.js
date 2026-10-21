'use strict';

const express = require('express');
const crypto = require('crypto');
const db = require('../utils/db');
const { getRates, calculatePrice, resolveConfig, specFromProduct } = require('../utils/pricingEngine');

const router = express.Router();

const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Removes control characters and angle brackets, keeps line breaks.
const clean = (value, max) =>
    String(value ?? '')
        .replace(/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
        .trim()
        .slice(0, max);

function readPerson(body) {
    const name = clean(body.name, 60);
    const phone = clean(body.phone, 20);
    const email = clean(body.email, 100);

    if (name.length < 2) return { error: 'Please enter your name' };
    if (!PHONE_RE.test(phone)) return { error: 'Please enter a valid phone number' };
    if (email && !EMAIL_RE.test(email)) return { error: 'Please enter a valid email address' };
    return { name, phone, email };
}

function saveEnquiry(record) {
    const enquiry = {
        id: `EV-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        status: 'new',
        createdAt: new Date().toISOString(),
        ...record,
    };
    db.update('enquiries', (list) => {
        list.push(enquiry);
        return list;
    });
    return enquiry;
}

// POST /api/contact  { name, phone, email?, message }
router.post('/', (req, res) => {
    const body = req.body || {};
    const person = readPerson(body);
    if (person.error) return res.status(400).json({ error: person.error });

    const message = clean(body.message, 1000);
    if (message.length < 5) return res.status(400).json({ error: 'Please write a short message' });

    const enquiry = saveEnquiry({ type: 'contact', ...person, message });
    res.status(201).json({ ok: true, reference: enquiry.id });
});

// POST /api/contact/reserve  { name, phone, email?, note?, productId | designId | lockId }
router.post('/reserve', (req, res) => {
    const body = req.body || {};
    const person = readPerson(body);
    if (person.error) return res.status(400).json({ error: person.error });

    const note = clean(body.note, 500);
    let item;

    if (body.lockId) {
        const lockId = String(body.lockId).toUpperCase();
        const lock = db.read('locks').find((l) => l.id === lockId);
        if (!lock) return res.status(404).json({ error: 'Price lock not found' });
        item = {
            type: 'lock',
            lockId: lock.id,
            name: lock.itemName,
            price: lock.price.total,
            lockExpiresAt: lock.expiresAt,
        };
    } else if (body.productId) {
        const product = db.read('products').find((p) => p.id === String(body.productId));
        if (!product) return res.status(404).json({ error: 'Product not found' });
        item = {
            type: 'product',
            productId: product.id,
            name: product.name,
            price: calculatePrice(specFromProduct(product), getRates()).total,
        };
    } else if (body.designId) {
        const design = db.read('designs').find((d) => d.id === String(body.designId));
        if (!design) return res.status(404).json({ error: 'Design not found' });
        const { spec } = resolveConfig(design.config);
        item = {
            type: 'design',
            designId: design.id,
            name: design.name,
            price: calculatePrice(spec, getRates()).total,
            config: design.config,
        };
    } else {
        return res.status(400).json({ error: 'Send a productId, designId or lockId' });
    }

    const enquiry = saveEnquiry({ type: 'reserve', ...person, note, item });
    res.status(201).json({ ok: true, reference: enquiry.id, item });
});

module.exports = router;