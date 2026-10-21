'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const IS_SERVERLESS = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Where the original data files live (the place differs a little on Netlify)
const SEED_CANDIDATES = [
    path.join(__dirname, '..', 'data'),
    path.join(process.cwd(), 'server', 'data'),
    path.join(process.env.LAMBDA_TASK_ROOT || '', 'server', 'data'),
];
const SEED_DIR = SEED_CANDIDATES.find((d) => fs.existsSync(path.join(d, 'products.json'))) || SEED_CANDIDATES[0];

// On Netlify only /tmp can be written to, so a copy is made there on first use
const DATA_DIR = IS_SERVERLESS ? path.join(os.tmpdir(), 'evelyn-data') : SEED_DIR;

function ensure() {
    if (!IS_SERVERLESS) return;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    for (const file of ['products.json', 'designs.json', 'enquiries.json', 'locks.json']) {
        const target = path.join(DATA_DIR, file);
        const source = path.join(SEED_DIR, file);
        if (!fs.existsSync(target) && fs.existsSync(source)) fs.copyFileSync(source, target);
    }
}

const fileFor = (name) => path.join(DATA_DIR, `${name}.json`);

function read(name, fallback = []) {
    try {
        ensure();
        const raw = fs.readFileSync(fileFor(name), 'utf8').replace(/^\uFEFF/, '').trim();
        return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
        if (err.code === 'ENOENT') return fallback;
        console.error(`[db] Could not read ${name}.json:`, err.message);
        throw err;
    }
}

function write(name, data) {
    ensure();
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(fileFor(name), JSON.stringify(data, null, 2), 'utf8');
}

// Read -> change -> write in one synchronous step,
// so two requests can never overwrite each other's changes.
function update(name, mutate, fallback = []) {
    const current = read(name, fallback);
    const next = mutate(current);
    const result = next === undefined ? current : next;
    write(name, result);
    return result;
}

module.exports = { read, write, update };