'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const fileFor = (name) => path.join(DATA_DIR, `${name}.json`);

function read(name, fallback = []) {
    try {
        const raw = fs.readFileSync(fileFor(name), 'utf8').replace(/^\uFEFF/, '').trim();
        return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
        if (err.code === 'ENOENT') return fallback;
        console.error(`[db] Could not read ${name}.json:`, err.message);
        throw err;
    }
}

function write(name, data) {
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