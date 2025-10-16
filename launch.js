const { openBrowser } = require('./browser.js');

const port = process.argv[2] || '8080';
const path = process.argv[3] || 'games';
const protocol = process.argv[3] || 'http';

openBrowser(`${ protocol }://localhost:${ port }/${ encodeURIComponent(path) }`);
