'use strict';

/* =====================================================================
   PRICING ENGINE
   price = metal weight x gold rate (by karat)
         + making charges
         + stone (carat x price per carat)
         + engraving fee
   NOTE: gold/silver rates are SIMULATED around the base values below.
   To use a real live API later, only getRates() needs to change.
   ===================================================================== */

const TOLA_GRAMS = 11.664;
const BASE_RATES = {
    gold24kPerTola: 420000, // PKR, placeholder - change to the real market rate
    silverPerGram: 450, // PKR, placeholder
};
const SILVER_PURITY = 0.925;
const DAY_MS = 24 * 60 * 60 * 1000;
const LOCK_HOURS = 24;
const ENGRAVING_FEE = 1500;
const ENGRAVING_MAX = 20;

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.status = 400;
    }
}

const METALS = {
    'yellow-gold': { label: 'Yellow Gold', type: 'gold', karats: [18, 21, 22, 24], defaultKarat: 22, making: 0.12, swatch: '#D4AF37' },
    'rose-gold': { label: 'Rose Gold', type: 'gold', karats: [18, 21], defaultKarat: 18, making: 0.12, swatch: '#E3AE9A' },
    'white-gold': { label: 'White Gold', type: 'gold', karats: [18], defaultKarat: 18, making: 0.14, swatch: '#E5E4E2' },
    silver: { label: 'Sterling Silver', type: 'silver', karats: [], defaultKarat: null, making: 0.3, swatch: '#C0C0C0' },
};

const STONES = {
    none: { label: 'No stone', perCarat: 0, min: 0, max: 0, defaultCarat: 0, swatch: null },
    diamond: { label: 'Diamond', perCarat: 450000, min: 0.05, max: 5, defaultCarat: 0.5, swatch: '#E8F4FF' },
    sapphire: { label: 'Blue Sapphire', perCarat: 140000, min: 0.1, max: 6, defaultCarat: 1, swatch: '#1F3A93' },
    ruby: { label: 'Ruby', perCarat: 160000, min: 0.1, max: 6, defaultCarat: 1, swatch: '#9B111E' },
    emerald: { label: 'Emerald', perCarat: 130000, min: 0.1, max: 6, defaultCarat: 1, swatch: '#0B6E4F' },
};

const PIECE_TYPES = {
    ring: {
        label: 'Ring',
        baseWeight: 4.5,
        defaultSize: '7',
        sizes: [
            { value: '5', label: 'Size 5', factor: 0.88 },
            { value: '6', label: 'Size 6', factor: 0.94 },
            { value: '7', label: 'Size 7', factor: 1 },
            { value: '8', label: 'Size 8', factor: 1.08 },
            { value: '9', label: 'Size 9', factor: 1.16 },
        ],
    },
    earrings: {
        label: 'Earrings',
        baseWeight: 4,
        defaultSize: 'medium',
        sizes: [
            { value: 'small', label: 'Small (studs)', factor: 0.7 },
            { value: 'medium', label: 'Medium (drops)', factor: 1 },
            { value: 'large', label: 'Large (statement)', factor: 1.45 },
        ],
    },
    bracelet: {
        label: 'Bracelet',
        baseWeight: 12,
        defaultSize: '17',
        sizes: [
            { value: '16', label: '16 cm', factor: 0.92 },
            { value: '17', label: '17 cm', factor: 1 },
            { value: '18', label: '18 cm', factor: 1.08 },
            { value: '19', label: '19 cm', factor: 1.16 },
        ],
    },
    necklace: {
        label: 'Necklace',
        baseWeight: 14,
        defaultSize: '45',
        sizes: [
            { value: '40', label: '40 cm (choker)', factor: 0.9 },
            { value: '45', label: '45 cm (princess)', factor: 1 },
            { value: '50', label: '50 cm (matinee)', factor: 1.12 },
        ],
    },
};

/* ---------------------------- helpers ---------------------------- */

const roundTo = (n, step) => Math.round(n / step) * step;
const round2 = (n) => Math.round(n * 100) / 100;

function cleanEngraving(value) {
    return String(value ?? '')
        .replace(/[\u0000-\u001f\u007f<>]/g, '')
        .trim()
        .slice(0, ENGRAVING_MAX);
}

// Smooth, repeatable "market movement" so the rate looks live but never jumps randomly.
function wobble(timestamp) {
    const m = timestamp / 60000;
    return 1 + 0.01 * Math.sin(m / 37) + 0.005 * Math.sin(m / 11 + 1.3) + 0.002 * Math.sin(m / 3.1);
}

/* ----------------------------- rates ----------------------------- */

function getRates(date = new Date()) {
    const t = date.getTime();
    const perTola24k = Math.round((BASE_RATES.gold24kPerTola * wobble(t)) / 10) * 10;
    const yesterday = Math.round((BASE_RATES.gold24kPerTola * wobble(t - DAY_MS)) / 10) * 10;
    const perGram24k = Math.round(perTola24k / TOLA_GRAMS);

    const perGram = {};
    for (const karat of [18, 21, 22, 24]) {
        perGram[karat] = Math.round((perGram24k * karat) / 24);
    }

    const changePct = Math.round(((perTola24k - yesterday) / yesterday) * 10000) / 100;

    return {
        currency: 'PKR',
        perTola24k,
        perGram24k,
        perGram,
        silverPerGram: Math.round(BASE_RATES.silverPerGram * wobble(t + 7777777)),
        changePct,
        trend: changePct >= 0 ? 'up' : 'down',
        updatedAt: date.toISOString(),
        source: 'simulated',
    };
}

/* ----------------------------- pricing ---------------------------- */

// spec = { metal, karat, weight, stone: { type, carat }, engraving }
function calculatePrice(spec, rates = getRates()) {
    const metal = METALS[spec.metal];
    if (!metal) throw new ValidationError('Unknown metal');

    let karat = null;
    let ratePerGram;
    if (metal.type === 'gold') {
        karat = Number(spec.karat);
        if (!metal.karats.includes(karat)) {
            throw new ValidationError(`${metal.label} is not available in ${spec.karat}K`);
        }
        ratePerGram = rates.perGram[karat];
    } else {
        ratePerGram = rates.silverPerGram * SILVER_PURITY;
    }

    const weight = Number(spec.weight);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 200) {
        throw new ValidationError('Invalid weight');
    }

    const stoneType = (spec.stone && spec.stone.type) || 'none';
    const stoneInfo = STONES[stoneType];
    if (!stoneInfo) throw new ValidationError('Unknown stone');

    let carat = 0;
    if (stoneType !== 'none') {
        carat = Number(spec.stone.carat);
        if (!Number.isFinite(carat) || carat < stoneInfo.min || carat > stoneInfo.max) {
            throw new ValidationError(`${stoneInfo.label} must be between ${stoneInfo.min} and ${stoneInfo.max} carat`);
        }
    }

    const engraving = cleanEngraving(spec.engraving);
    const metalValue = weight * ratePerGram;

    const lines = {
        metal: roundTo(metalValue, 100),
        making: roundTo(metalValue * metal.making, 100),
        stone: roundTo(carat * stoneInfo.perCarat, 100),
        engraving: engraving ? ENGRAVING_FEE : 0,
    };
    const total = lines.metal + lines.making + lines.stone + lines.engraving;

    return {
        currency: 'PKR',
        metal: spec.metal,
        metalLabel: metal.label,
        karat,
        weight: round2(weight),
        ratePerGram: Math.round(ratePerGram),
        makingPercent: Math.round(metal.making * 100),
        stone: { type: stoneType, label: stoneInfo.label, carat: round2(carat) },
        engraving,
        lines,
        total,
    };
}

/* ------------------------- custom designs ------------------------- */

// config = { pieceType, size, metal, karat, stone: { type, carat }, engraving }
// Returns a cleaned config and the spec used for pricing. Throws ValidationError if invalid.
function resolveConfig(input) {
    if (!input || typeof input !== 'object') throw new ValidationError('Design configuration is missing');

    const piece = PIECE_TYPES[input.pieceType];
    if (!piece) throw new ValidationError('Unknown piece type');

    const sizeValue = String(input.size ?? piece.defaultSize);
    const size = piece.sizes.find((s) => s.value === sizeValue);
    if (!size) throw new ValidationError('Unknown size for this piece');

    const metal = METALS[input.metal];
    if (!metal) throw new ValidationError('Unknown metal');

    const karat = metal.type === 'gold' ? Number(input.karat ?? metal.defaultKarat) : null;

    const stoneType = (input.stone && input.stone.type) || 'none';
    const stoneInfo = STONES[stoneType];
    if (!stoneInfo) throw new ValidationError('Unknown stone');
    const carat = stoneType === 'none' ? 0 : round2(Number(input.stone.carat ?? stoneInfo.defaultCarat));

    const config = {
        pieceType: input.pieceType,
        size: size.value,
        metal: input.metal,
        karat,
        stone: { type: stoneType, carat },
        engraving: cleanEngraving(input.engraving),
    };

    const spec = {
        metal: config.metal,
        karat: config.karat,
        weight: round2(piece.baseWeight * size.factor),
        stone: config.stone,
        engraving: config.engraving,
    };

    calculatePrice(spec); // validates karat / carat ranges
    return { config, spec };
}

/* --------------------------- products ---------------------------- */

function specFromProduct(product) {
    return {
        metal: product.metal,
        karat: product.karat,
        weight: product.weight,
        stone: product.stone || { type: 'none', carat: 0 },
        engraving: '',
    };
}

function presentProduct(product, rates = getRates()) {
    const { total } = calculatePrice(specFromProduct(product), rates);
    return { ...product, price: total, currency: 'PKR' };
}

/* ---------------------- options for the studio ---------------------- */

function getOptions() {
    return {
        currency: 'PKR',
        lockHours: LOCK_HOURS,
        engraving: { fee: ENGRAVING_FEE, maxLength: ENGRAVING_MAX },
        metals: Object.entries(METALS).map(([key, m]) => ({
            key, label: m.label, type: m.type, karats: m.karats, defaultKarat: m.defaultKarat, swatch: m.swatch,
        })),
        stones: Object.entries(STONES).map(([key, s]) => ({
            key, label: s.label, min: s.min, max: s.max, defaultCarat: s.defaultCarat, perCarat: s.perCarat, swatch: s.swatch,
        })),
        pieceTypes: Object.entries(PIECE_TYPES).map(([key, p]) => ({
            key, label: p.label, defaultSize: p.defaultSize,
            sizes: p.sizes.map(({ value, label }) => ({ value, label })),
        })),
    };
}

module.exports = {
    ValidationError,
    LOCK_HOURS,
    getRates,
    calculatePrice,
    resolveConfig,
    specFromProduct,
    presentProduct,
    getOptions,
};