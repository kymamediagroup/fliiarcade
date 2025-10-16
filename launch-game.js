const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const { openBrowser } = require('./browser.js');

const name = process.argv[2];
const system = process.argv[3];
const port = process.argv[4] || '8080';
const path = process.argv[5] || 'games';
const protocol = process.argv[6] || 'http';

if (!name || !system) {
    throw new Error('☠ Name and system required!');
}

const file = join('.', 'public', 'app.json');

if (!existsSync(file)) {
    throw new Error('☠ Build app first!');
}

const appId = JSON.parse(readFileSync(file).toString()).id;

openBrowser(`${ protocol }://localhost:${ port }/${ encodeURIComponent(path) }/${ encodeURIComponent(system) }-${ encodeURIComponent(name) }-${ encodeURIComponent(appId) }.html`);
