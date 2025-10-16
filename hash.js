const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

/**
 * Calculates the SHA-1 hash of a local file synchronously (blocking).
 * * NOTE: For very large files (hundreds of MB or GBs), prefer the asynchronous
 * streaming version to prevent blocking the Node.js event loop.
 * * @param {string} filePath The full path to the file (e.g., 'path/to/my/game.zip').
 * @returns {string} The 40-character SHA-1 hash.
 * @throws {Error} If the file cannot be read or is not found.
 */
function getZipSha1Sync(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found at: ${filePath}`);
    }

    // 1. Read the entire file contents into memory synchronously
    const fileBuffer = fs.readFileSync(filePath);

    // 2. Create the hash object
    const hash = crypto.createHash('sha1');

    // 3. Update the hash with the buffer
    hash.update(fileBuffer);

    // 4. Calculate the final hash and return it as a hexadecimal string
    return hash.digest('hex');
}

// --- Example Usage ---

// NOTE: Please update 'venture.zip' to the actual path of your file.
const zipFilePath = path.join(__dirname, 'venture.zip');

try {
    // To run this example, ensure you have a 'venture.zip' file in the same folder
    const sha1 = getZipSha1Sync(zipFilePath);

    console.log(`Successfully computed SHA-1 hash for ${path.basename(zipFilePath)}:`);
    console.log(sha1);
} catch (error) {
    console.error('Error computing hash:', error.message);
}

module.exports = {
    getZipSha1Sync
};
