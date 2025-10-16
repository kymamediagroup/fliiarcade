const { readFileSync, existsSync } = require('fs');
const { encode } = require('html-entities');
const { join } = require('path');

function loadTemplatePiece(name, pieceName) {
    return readFileSync(join('.', 'html', name, pieceName + '.html')).toString();
}

function loadSectionTemplatePiece(name, pieceName) {
    return readFileSync(join('.', 'html', name, 'sections', pieceName + '.html')).toString();
}

function loadCommonTemplatePiece(pieceName) {
    return loadTemplatePiece('common', pieceName);
}

function loadGameTemplatePiece(pieceName, game) {
    // If game specified…

    if (game) {
        // If game-specific template piece exists…

        if (existsSync(join('.', 'html', 'game', game.name, pieceName + '.html'))) {
            // Use game-specific template piece

            return readFileSync(join('.', 'html', 'game', game.name, pieceName + '.html')).toString();
        }

        const { genres } = game;
        let genrePiece = '';

        // Try to find genere-specific template piece

        genres.forEach(genre => {
            if (existsSync(join('.', 'html', 'game', genre, pieceName + '.html'))) {
                genrePiece = join('.', 'html', 'game', genre, pieceName + '.html');
            }
        });

        if (genrePiece) {
            return genrePiece;
        }

        if (existsSync(join('.', 'html', 'game', game.system, pieceName + '.html'))) {
            // Use system-specific template piece

            return readFileSync(join('.', 'html', 'game', game.system, pieceName + '.html')).toString();
        }
    }

    // Use common game template piece

    return loadTemplatePiece('game', pieceName);
}

function loadGameTemplateSectionPiece(pieceName, game) {
    // If game specified…

    if (game) {
        // If game-specific template piece exists…

        if (existsSync(join('.', 'html', 'game', game.name, 'sections', pieceName + '.html'))) {
            // Use game-specific template piece

            return readFileSync(join('.', 'html', 'game', game.name, 'sections', pieceName + '.html')).toString();
        } else if (existsSync(join('.', 'html', 'game', game.system, 'sections', pieceName + '.html'))) {
            // Use system-specific template piece

            return readFileSync(join('.', 'html', 'game', game.system, 'sections', pieceName + '.html')).toString();
        }
    }

    // Use common game template piece

    return loadSectionTemplatePiece('game', pieceName);
}

function loadGameSectionHtml(id, game, piece = id, visible) {
    // Hide all but the default section

    return `<section role="tabpanel" id="${ encode(id) }"${ visible ? '' : ' hidden' }>` + loadGameTemplateSectionPiece(piece, game) + '</section>';
}

function replacePlaceholder(placeholderKey, replacementString, templateString, replacementIsHtml = false) {
    // Escape the placeholder key to prevent issues with special regex characters

    const escapedKey = placeholderKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'g');

    if (!replacementIsHtml) {
        replacementString = encode(replacementString);
    }

    return templateString.replace(regex, replacementString);
}

function replaceResourcePlaceholder(placeholderKey, replacementString, templateString) {
    return replacePlaceholder('resource-' + placeholderKey, replacementString, templateString);
}

function replacePlaceholderHtml(placeholderKey, replacementString, templateString) {
    return replacePlaceholder(placeholderKey, replacementString, templateString, true);
}

function replaceComponentPlaceholderHtml(placeholderKey, replacementString, templateString) {
    return replacePlaceholder('component-' + placeholderKey, replacementString, templateString, true);
}

module.exports = {
    loadCommonTemplatePiece,
    loadGameTemplatePiece,
    loadGameSectionHtml,
    replacePlaceholder,
    replaceComponentPlaceholderHtml,
    replaceResourcePlaceholder
};