const { generateGameQrCode } = require('./qr-code.js');

const name = process.argv[2];
const system = process.argv[3];
const port = process.argv[4];
const path = process.argv[5];

if (!name || !system) {
    throw new Error('☠ Name and system required!');
}

generateGameQrCode(name, system, port, path);