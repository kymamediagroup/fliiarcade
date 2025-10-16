const { join } = require('path');

const { loadJson } = require('./file.js');

// TODO: Make config (JSON) file for these too (languages.json)

const rtlLanguages = ['ar'];

function loadResources() {
    return loadJson(join('.', 'resources.json'));
}

module.exports = {
    loadResources,
    rtlLanguages
};