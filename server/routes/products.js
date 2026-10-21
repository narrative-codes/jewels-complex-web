'use strict';

const express = require('express');
const db = require('../utils/db');
const { getRates, presentProduct, calculatePrice, specFromProduct } = require('../utils/pricingEngine');

const router = express.Router();

const CATEGORIES = [
    { key: 'rings', label: 'Rings', blurb: 'Sapphires, diamonds and sculpted gold for your hand.' },
    { key: 'earrings', label: 'Earrings', blurb: 'Drops, studs and statements that frame the face.' },
    { key: 'bracelets', label: 'Bracelets', blurb: 'Tennis lines, bangles and cuffs for the wrist.' },
    { key: 'necklaces', label: 'Necklaces', blurb: 'Pendants, chokers and chains for the neckline.' },
];

// GET /api/products/categories
router.get('/categories', (req, res) => {
    const products = db.read('products');
    const categories = CATEGORIES.map((c) => {
        const inCategory = products.filter((p) => p.category === c.key);
        return { ...c, count: inCategory.length, cover: inCategory[0] ? inCategory[0].image : null };
    });
    res.json({ categories });
});

// GET /api/products?category=rings&q=gold&sort=price-asc&minPrice=100000&maxPrice=500000&featured=true
router.get('/', (req, res) => {
    const { category, q, metal, sort, featured } = req.query;
    const rates = getRates();
    let list = db.read('products');

    if (category) {
        const key = String(category).toLowerCase();
        if (!CATEGORIES.some((c) => c.key === key)) {
            return res.status(400).json({ error: 'Unknown category' });
        }
        list = list.filter((p) => p.category === key);
    }
    if (metal) list = list.filter((p) => p.metal === String(metal));
    if (featured === 'true') list = list.filter((p) => p.featured);
    if (q) {
        const term = String(q).toLowerCase().trim();
        list = list.filter((p) => `${p.name} ${p.tagline}`.toLowerCase().includes(term));
    }

    let products = list.map((p) => presentProduct(p, rates));

    const min = Number(req.query.minPrice);
    const max = Number(req.query.maxPrice);
    if (Number.isFinite(min) && req.query.minPrice !== undefined && req.query.minPrice !== '') {
        products = products.filter((p) => p.price >= min);
    }
    if (Number.isFinite(max) && req.query.maxPrice !== undefined && req.query.maxPrice !== '') {
        products = products.filter((p) => p.price <= max);
    }

    if (sort === 'price-asc') products.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') products.sort((a, b) => b.price - a.price);
    else if (sort === 'name') products.sort((a, b) => a.name.localeCompare(b.name));

    res.json({ count: products.length, products });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
    const rates = getRates();
    const all = db.read('products');
    const product = all.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const breakdown = calculatePrice(specFromProduct(product), rates);
    const related = all
        .filter((p) => p.category === product.category && p.id !== product.id)
        .slice(0, 3)
        .map((p) => presentProduct(p, rates));

    res.json({
        product: { ...product, price: breakdown.total, currency: 'PKR', breakdown },
        related,
    });
});

module.exports = router;