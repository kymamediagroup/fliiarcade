const spacesPerIndent = 3;

function log(message, icon = '🛈', indent = 0) {
    console.log(`${ ' '.repeat(indent * spacesPerIndent) }${ icon } ${ message }`);
}

function logBreak() {
    console.log('');
}

function logSuccess(message, indent) {
    log(message, '✓', indent);
}

function logLoad(message, indent) {
    log(message, '🕮', indent);
}

function logDelete(message, indent) {
    log(message, '🗑', indent);
}

function logProcess(message, indent) {
    log(message, '⚙', indent);
}

function logWrite(message, indent) {
    log(message, '✏', indent);
}

function logPopulate(message, indent) {
    log(message, '✀', indent);
}

function logId(message, indent) {
    log(message, '🏷', indent);
}

function logCompute(message, indent) {
    log(message, '🖩', indent);
}

function logWarning(message, indent = 0) {
    console.warn(`${ ' '.repeat(indent * spacesPerIndent) }⚠ ${ message }`);
}

function formatDebug(data) {
    return data;
}

function formatGameDebug(game, indent = 1) {
    // return game;

    return `${ ' '.repeat(indent * spacesPerIndent) }"${ game.description }" (${ game.name })`;
}

function joinDebugs(debugs) {
    // return debugs;

    return debugs.join('\n');
}

function debug(message) {
    console.debug(message);
}

function debugData(data) {
    debug(joinDebugs(data.map(formatDebug)));
}

function debugGameData(data, indent) {
    debug(joinDebugs(data.map(datum => formatGameDebug(datum, indent))));
}

module.exports = {
    log,
    logWarning,
    logBreak,
    logLoad,
    logProcess,
    logSuccess,
    logDelete,
    logWrite,
    logPopulate,
    logId,
    logCompute,
    debug,
    debugData,
    debugGameData,
    formatGameDebug,
    joinDebugs
};