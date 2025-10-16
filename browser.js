const { exec } = require('child_process');
const os = require('os');

/**
 * Executes a shell command to open the configured URL in the default web browser,
 * based on the current operating system.
 */

function openBrowser(url) {
    const platform = os.platform();
    let command;

    switch (platform) {
    case 'darwin': // macOS
        command = `open ${ url }`;
        break;
    case 'win32': // Windows
        // 'start' command handles opening URLs in the default browser
        command = `start ${ url }`;
        break;
    case 'linux': // Linux (Requires xdg-open to be installed)
        command = `xdg-open ${ url }`;
        break;
    default:
        throw new Error(`☠ Unsupported platform: ${ platform }. Please open the URL manually: ${ url }`);
    }

    // Execute the command asynchronously

    exec(command, (error) => {
        if (error) {
            console.error(error);
            console.log(`Please manually navigate to: ${ url }`);
        } else {
            console.log(`Successfully launched browser to: ${ url }`);
        }
    });
}

module.exports = {
    openBrowser
};