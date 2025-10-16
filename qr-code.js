const os = require('os');
const qrcode = require('qrcode');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

/**
 * Finds the current machine's primary non-internal IPv4 address.
 * @returns {string} The local IPv4 address or '127.0.0.1' as a fallback.
 */
function getLocalIP() {
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        // Look through each network interface and its addresses
        for (const iface of interfaces[name]) {
            // We only want IPv4 addresses that are not loopback (internal)
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }

    return '127.0.0.1';
}

/* async function generateQrCode(path = '/', port = '8080', protocol = 'http') {
    const ipAddress = getLocalIP();

    const targetUrl = `${ protocol }://${ ipAddress }:${ port }${ path }`;

    console.log('Scan with your mobile device:');

    try {
        qrcode.toString(targetUrl, {
            type: 'terminal',
            small: true
        }, (err, qrCodeAscii) => {
            if (err) {
                console.error('Error generating QR code:', err.message);
                return;
            }

            console.log(qrCodeAscii);
        });
    } catch (err) {
        console.error('Error generating QR code:', err.message);
    }
} */

function generateQrCode(path = 'games', port = 8080, protocol = 'http') {
    return new Promise((resolve, reject) => {
        const ipAddress = getLocalIP();
        const targetUrl = `${protocol}://${ ipAddress }:${ port }/${ path }`;

        console.log(`🌐 Location: ${ targetUrl }`);
        console.log('📲 Scan with your mobile device:');

        // Use the qrcode callback, resolving the Promise when the print job is finished.
        qrcode.toString(targetUrl, { type: 'terminal', small: true }, (err, qrCodeAscii) => {
            if (err) {
                console.error(err);

                return reject(err);
            }

            console.log(qrCodeAscii);

            return resolve();
        });
    });
}

function generateGameQrCode(name, system, port = 8080, path = 'games') {
    const file = join('.', 'public', 'app.json');

    if (!existsSync(file)) {
        throw new Error('☠ Build app first!');
    }

    const appId = JSON.parse(readFileSync(file).toString()).id;

    return generateQrCode(`${ encodeURIComponent(path) }/${ encodeURIComponent(system) }-${ encodeURIComponent(name) }-${ encodeURIComponent(appId) }.html`, port);
}

module.exports = {
    generateQrCode,
    generateGameQrCode
};
