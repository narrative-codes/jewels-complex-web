'use strict';

const express = require('express');
const db = require('../utils/db');
const { getRates, presentProduct } = require('../utils/pricingEngine');

const router = express.Router();

const QUESTIONS = [
    {
        id: 'category',
        title: 'What would you like to gift?',
        options: [
            { id: 'rings', label: 'A ring' },
            { id: 'earrings', label: 'Earrings' },
            { id: 'bracelets', label: 'A bracelet' },
            { id: 'necklaces', label: 'A necklace' },
            { id: 'any', label: 'Surprise me' },
        ],
    },
    {
        id: 'recipient',
        title: 'Who is it for?',
        options: [
            { id: 'partner', label: 'My partner' },
            { id: 'mother', label: 'My mother' },
            { id: 'sister', label: 'Sister or friend' },
            { id: 'self', label: 'Myself' },
        ],
    },
    {
        id: 'occasion',
        title: "What's the occasion?",
        options: [
            { id: 'wedding', label: 'Wedding' },
            { id: 'anniversary', label: 'Anniversary' },
            { id: 'birthday', label: 'Birthday' },
            { id: 'eid', label: 'Eid' },
            { id: 'everyday', label: 'Just because' },
        ],
    },
    {
        id: 'style',
        title: 'Which style feels like her?',
        options: [
            { id: 'classic', label: 'Classic and timeless' },
            { id: 'minimal', label: 'Minimal and delicate' },
            { id: 'bold', label: 'Bold and statement' },
            { id: 'glamorous', label: 'Glamorous and sparkling' },
        ],
    },
    {
        id: 'metal',
        title: 'Which metal does she wear?',
        options: [
            { id: 'yellow-gold', label: 'Yellow gold' },
            { id: 'white-gold', label: 'White gold' },
            { id: 'rose-gold', label: 'Rose gold' },
            { id: 'any', label: 'No preference' },
        ],
    },
    {
        id: 'budget',
        title: "What's your budget?",
        options: [
            { id: 'low', label: 'Under PKR 200,000' },
            { id: 'mid', label: 'PKR 200,000 - 500,000' },
            { id: 'high', label: 'PKR 500,000 - 1,000,000' },
            { id: 'luxe', label: 'Above PKR 1,000,000' },
        ],
    },
];

const BUDGETS = {
    low: { min: 0, max: 200000 },
    mid: { min: 200000, max: 500000 },
    high: { min: 500000, max: 1000000 },
    luxe: { min: 1000000, max: Infinity },
};

const WEIGHTS = { recipient: 2, occasion: 3, style: 3, metal: 2, budget: 4 };

function cleanAnswers(raw) {
    const answers = {};
    if (!raw || typeof raw !== 'object') return answers;
    for (const q of QUESTIONS) {
        const value = String(raw[q.id] ?? '');
        if (q.options.some((o) => o.id === value)) answers[q.id] = value;
    }
    return answers;
}

function scoreProduct(product, answers) {
    let score = 0;
    let max = 0;
    const reasons = [];

    if (answers.recipient) {
        max += WEIGHTS.recipient;
        if (product.tags.recipient.includes(answers.recipient)) {
            score += WEIGHTS.recipient;
            reasons.push('A lovely choice for them');
        }
    }
    if (answers.occasion) {
        max += WEIGHTS.occasion;
        if (product.tags.occasion.includes(answers.occasion)) {
            score += WEIGHTS.occasion;
            reasons.push('Perfect for this occasion');
        }
    }
    if (answers.style) {
        max += WEIGHTS.style;
        if (product.tags.style.includes(answers.style)) {
            score += WEIGHTS.style;
            reasons.push(`Matches a ${answers.style} style`);
        }
    }
    if (answers.metal && answers.metal !== 'any') {
        max += WEIGHTS.metal;
        if (product.metal === answers.metal) {
            score += WEIGHTS.metal;
            reasons.push('In the metal they love');
        }
    }
    if (answers.budget) {
        max += WEIGHTS.budget;
        const { min, max: top } = BUDGETS[answers.budget];
        if (product.price >= min && product.price <= top) {
            score += WEIGHTS.budget;
            reasons.push('Within your budget');
        } else {
            const gap = product.price < min ? (min - product.price) / min : (product.price - top) / top;
            if (gap <= 0.25) {
                score += 1;
                reasons.push('Very close to your budget');
            } else {
                score -= 2;
            }
        }
    }

    const matchPercent = max === 0 ? 0 : Math.min(100, Math.max(0, Math.round((score / max) * 100)));
    return { score, matchPercent, reasons };
}

// GET /api/quiz/questions
router.get('/questions', (req, res) => {
    res.json({ questions: QUESTIONS });
});

// POST /api/quiz/recommend  { answers: { category, recipient, occasion, style, metal, budget } }
router.post('/recommend', (req, res) => {
    const answers = cleanAnswers(req.body && req.body.answers);
    const rates = getRates();

    let products = db.read('products').map((p) => presentProduct(p, rates));
    if (answers.category && answers.category !== 'any') {
        products = products.filter((p) => p.category === answers.category);
    }

    const matches = products
        .map((product) => ({ product, ...scoreProduct(product, answers) }))
        .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
        .slice(0, 6);

    res.json({ answers, matches });
});

module.exports = router;