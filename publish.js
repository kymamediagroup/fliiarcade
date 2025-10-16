const { copyFileSync, existsSync } = require('fs');
const { join } = require('path');

function publish(sourcePathParts, destPathParts) {
    let result = false;

    // If no destination passed…

    if (!destPathParts) {
        // Assume same path in public

        destPathParts = ['public', ...sourcePathParts];
    }

    if (existsSync(join('.', ...sourcePathParts))) {
        copyFileSync(join('.', ...sourcePathParts), join('.', ...destPathParts));

        result = true;
    }

    return result;
}

module.exports = publish;