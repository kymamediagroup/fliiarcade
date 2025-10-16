// const { exec } = require('child_process');
const { execSync } = require('child_process');
const { generateQrCode } = require('./qr-code.js');
const { join } = require('path');

const path = process.argv[2];
const port = process.argv[3] || 8080;

const cacheMaxAge = 315360000; // Ten years in seconds - essentially avoids freshness check requests "forever"

try {
    // console.log('Attempting to stop any existing process on port 8080...');
    // Run the fkill command.
    // The '|| true' is a trick to prevent the script from crashing if fkill isn't found
    // or if it fails (e.g., no process is running). The `--silent` should handle this,
    // but it adds an extra layer of safety.

    // execSync('fkill :8080 --silent || true', { stdio: 'inherit' });

    console.log('Clean-up complete (or no process found)');
} catch (error) {
    // You could log the error here if needed, but the `--silent` and `|| true`
    // should prevent this block from running on typical clean-up failures.

    console.error(error);
}

/* console.log('Starting HTTP Server (http-server ./public)…');

const serverProcess = exec('http-server ./public', (error, stdout, stderr) => {
    // This callback only runs if the http-server process stops or crashes

    if (error) {
        throw new Error(error);
    }

    if (stderr) {
        // NOTE: often http-server outputs its running address to stderr initially,
        // so this might not always indicate an error.

        console.error(`HTTP server errors: ${ stderr }`);
    }

    console.log(`HTTP Server Stopped: ${stdout}`);
});

// Optionally, capture and log the output from http-server in real-time

serverProcess.stdout.on('data', (data) => {
    // This will show the http-server logs, like the address it's serving on.

    console.log(`[HTTP Server]: ${data.toString().trim()}`);
});

// Listen for termination signals (like Ctrl+C or system shutdown)

['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
        console.log(`Received ${signal}. Stopping the HTTP Server…`);

        // 1. Kill the child process (http-server)

        serverProcess.kill();

        console.log('HTTP server stopped');

        // 2. Exit the parent process

        process.exit(0);
    });
});

console.log('HTTP server started');

generateQrCode(path, port); */

/* async function runServer() {
    try {
        // Await the QR code generation, blocking here until the output is complete.

        await generateQrCode(path, port);

        // This call blocks the Node process until Ctrl+C is pressed

        execSync(`http-server ./public -p ${ port || '8080' } -c ${ cacheMaxAge }`, { stdio: 'inherit' });
    } catch (error) {
        // Catch errors from QR code generation or execSync termination

        if (!error.signal || error.signal !== 'SIGINT') {
            console.error('Execution failed!', error);
        }
    }
}

runServer(); */

const express = require('express');
// const fs = require('fs');
const app = express();
const publicDir = join(__dirname, 'public');

// This function determines the correct Content-Type for the file
// and sets the crucial 'Content-Encoding: gzip' header.

function setGzipHeaders(req, res, next) {
    const filePath = req.path;

    if (filePath.endsWith('.js.gz')) {
        console.log('!');
    }

    // Only intercept requests for files ending in .gz
    if (filePath.endsWith('.gz')) {
        let contentType;

        // Determine the actual content type based on the non-gzipped extension
        if (filePath.endsWith('.js.gz')) {
            contentType = 'application/javascript';
        } else if (filePath.endsWith('.wasm.gz')) {
            contentType = 'application/wasm';
        } else if (filePath.endsWith('.data.gz')) {
            contentType = 'application/octet-stream';
        } else {
            // Default MIME type for other gzipped files
            contentType = 'application/octet-stream';
        }

        // Check if the file actually exists on disk (important for security/correctness)
        // const fullPath = path.join(publicDir, filePath);

        // if (fs.existsSync(fullPath)) {
        // 1. Set the correct MIME type (Content-Type)
        res.setHeader('Content-Type', contentType);
        // 2. Tell the browser the content is gzipped (Content-Encoding)
        res.setHeader('Content-Encoding', 'gzip');
        // Allow the request to proceed to Express's static handler
        // } else {
        // File not found, let the standard static handler deal with the 404
        // }
    }

    next();
}

// Use the custom header middleware BEFORE serving static files
app.use(setGzipHeaders);

// Serve static files from the 'public' directory
app.use(express.static(publicDir, {
    // Disable built-in compression if you are serving pre-gzipped files
    enableGzip: false,
    // Set the aggressive caching policy (Express requires milliseconds)
    maxAge: cacheMaxAge * 1000
}));

// Start Server

app.listen(port, (err) => {
    if (err) {
        throw err;
    }

    console.log('Server is now accessible on all interfaces.');
    console.log(`Access at: http://localhost:${ port }`);

    generateQrCode(path, port);
});
