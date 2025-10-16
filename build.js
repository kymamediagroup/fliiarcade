const { mkdirSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');
const { createHash } = require('crypto');
const sizeOf = require('image-size');

const { loadFilterAll, publishFilterAll } = require('./filters.js');
const { log, logWarning, logLoad, logSuccess, logDelete, logProcess, logWrite, logPopulate, logId, logCompute, logBreak, debugGameData } = require('./log.js');
const { deleteFiles, getAllFileNames, getAllFilePaths, getAllImageNames, loadTextFile, loadJson, loadConfig } = require('./file.js');
const { loadGamesFromDatabase } = require('./data.js');
const { loadCommonTemplatePiece, loadGameTemplatePiece, loadGameSectionHtml, replacePlaceholder, replaceComponentPlaceholderHtml, replaceResourcePlaceholder } = require('./template.js');
const { loadMameVersions, undiscoveredAssemblies } = require('./mame.js');
const publish = require('./publish.js');
const { loadResources, rtlLanguages } = require('./localize.js');

// const { getZipSha1Sync } = require('./hash.js');

// If NPM not running the script…

if (process.env.npm_package_description === undefined) {
    // NOTE: Just for convenience, could also load package.json to get the author, description, etc.

    throw new Error('☠ Please run from an NPM script!');
}

// First argument is the database folder name (e.g. all, favorites)

const databaseName = process.argv[2] || 'all';

// Second argument is language

const language = process.argv[3] || 'en';

// Third argument is app name

const appName = process.argv[4] || process.env.npm_package_description;

// Fourth argument is which section to show on load

const defaultSectionId = process.argv[5] || 'emulator'; // e.g. emulator, preview or info

// Fifth argument is "full screen" (all navigation hidden, other than full screen toggle button)

const fullScreen = !!process.argv[6]; // Start in full-screen view

// Used for copyright notice

const author = process.env.npm_package_author_name;
const yearCurrent = new Date().getFullYear();

// All games will be loaded.

const loadFilter = loadFilterAll;

// All loaded games with required files will be published.

const publishFilter = publishFilterAll;

log(`Building ${ appName } in ${ language.toUpperCase() }`);

log('Default section: ' + defaultSectionId);

const startTime = Date.now();

logLoad('Loading localization resources…');

const resources = loadResources();

logSuccess(`Loaded ${ Object.keys(resources).length } languages`, 1);

logLoad('Loading MAME configuration…');

// Any missing assembly + script combinations (none at moment) will be referenced on Internet Archive

// For use in choosing ROM files (and skipping those that don't exist)
// For example, a "merged" romset will have only the parent puckman.zip, which includes contents of clones (e.g. pacman) as well
// OTOH, an "unmerged" romset will not need the parent ROM file
// NOTE: This affects only clones

const { externalEmulatorLocation, preferredVersion, romsetTypes } = loadConfig('mame'); // 'https://archive.org/download/emularity_engine_v1';

logSuccess('Loaded MAME configuration', 1);

logLoad('Loading MAME version(s)…');

const mameVersions = loadMameVersions();

logSuccess(`Loaded ${ mameVersions.length } MAME version(s)`, 1);

if (mameVersions.some(version => !romsetTypes[version])) {
    throw new Error('Missing MAME romset info!');
}

logSuccess(`Loaded ${ mameVersions.length } MAME version(s)`, 1);

logLoad('Loading DosBox configuration…');

// There are several flavors dosbox emulator (e.g. dosbox, dosbox-sync, etc.)

const dosboxEmulator = loadConfig('dosbox').type;

logSuccess('Loaded DosBox configuration', 1);

logLoad(`Loading games from ${ databaseName } database…`);

const games = loadGamesFromDatabase(databaseName).filter(loadFilter);

logSuccess(`Loaded ${ games.length } games`, 1);

logDelete('Deleting previously published game HTML files…');

// TODO: Purge others (e.g. artwork, icons, video, roms, emularity, etc.)

if (deleteFiles(join('.', 'public', 'games'), 'html')) {
    let totalAmbiguousRomVersions = 0;
    let totalMissingRoms = 0;
    let totalMissingVideos = 0;
    let totalMissingBackgrounds = 0;
    let totalMissingLogos = 0;
    let totalMissingIcons = 0;
    let totalMissingCabinetImages = 0;
    let totalMissingSystemCabinetImages = 0;
    let totalMissingArtwork = 0;
    let totalMissingBezelImages = 0;
    let totalMissingGenreImages = 0;
    let totalMissingEmulators = 0;
    let totalExternalEmulators = 0;
    let totalExternalRoms = 0;
    let totalResolutionMismatches = 0;
    let totalMissingCanonicalMetaData = 0;
    let totalBiosMismatches = 0;
    let totalWasmVariations = 0;
    let totalWasmMismatches = 0;
    let totalWasmJsMismatches = 0;
    let totalExistingExtraArguments = 0;

    const wasmVariations = {};
    const wasmVariationCounts = {};
    const gamesWithResolutionMismatches = [];
    const gamesMissingVideos = [];
    const gamesMissingIcons = [];
    const gamesMissingLogos = [];
    const gamesMissingCabinetImages = [];
    const gamesMissingBackgroundImages = [];
    const gamesMissingBezelImages = [];
    const gamesMissingMetaData = [];
    const gamesMissingArtwork = [];
    const gamesSkipped = [];
    const gamesWithOddBezelAspectRatios = [];
    const fixedWasmVariations = [];

    let skippedGames = 0;

    const genresUsed = new Set();
    const systemsUsed = new Set();
    const publishedEmulators = new Set();

    // Calculate hash of all template pieces combined

    logCompute('Computing App ID…');

    let combinedTemplateContent = '';

    const filePaths = getAllFilePaths(join('.', 'html'));

    for (const filePath of filePaths) {
        const content = loadTextFile(filePath);

        combinedTemplateContent += content;
    }

    const htmlHash = createHash('sha256').update(combinedTemplateContent).digest('hex').substring(0, 8);

    logId(`App ID: ${ htmlHash }`, 1);

    const appMetaData = {
        name: appName,
        id: htmlHash
    };

    logWrite('Publishing app meta data…');

    writeFileSync(join('.', 'public', 'app.json'), JSON.stringify(appMetaData));

    logSuccess('Published app meta data', 1);

    logWrite('Publishing common script…');

    // TODO: publish all scripts in root?

    if (publish(['scripts', 'common.js'])) {
        logSuccess('Published common script', 1);
    } else {
        logWarning('Missing common script!', 1);
    }

    logWrite('Publishing Emularity scripts…');

    // NOTE: The trailing "polyfill" can almost certainly be removed

    ['browserfs.min.js', 'browserfs.min.js.map', 'loader.js', 'es6-promise.js'].forEach(name => {
        if (publish(['scripts', name])) {
            logSuccess(`Published script: ${ name }`, 1);
        } else {
            throw new Error(`☠ Missing Emularity script: ${ name }!`);
        }
    });

    logWrite('Publishing Three script…');

    if (publish(['scripts', 'three.module.min.js'])) {
        logSuccess('Published script: three.module.min.js', 1);
    } else {
        throw new Error('☠ Missing Three script: three.module.min.js!');
    }

    logWrite('Publishing common style sheet…');

    if (publish(['style', 'common.css'])) {
        logSuccess('Published common style sheet', 1);
    } else {
        logWarning('Missing common style sheet!', 1);
    }

    // Publish MAME default horizontal and vertical artwork

    logWrite('Publishing MAME default artwork…');

    if (existsSync(join('mame', 'artwork', 'genhorizontal'))) {
        const layFiles = getAllFileNames(join('.', 'mame', 'artwork', 'genhorizontal'), ['lay'], false, false);
        const pngFiles = getAllFileNames(join('.', 'mame', 'artwork', 'genhorizontal'), ['png'], false, false);

        layFiles.forEach(file => {
            if (publish(['mame', 'artwork', 'genhorizontal', `${ file }.lay`])) {
                logSuccess('Published MAME default horizontal artwork layout', 1);
            } else {
                logWarning('Failed to publish MAME default horizontal artwork layout!', 1);
            }
        });

        pngFiles.forEach(file => {
            if (publish(['mame', 'artwork', 'genhorizontal', `${ file }.png`])) {
                logSuccess('Published MAME default horizontal artwork image', 1);
            } else {
                logWarning('Failed to publish MAME default horizontal artwork image!', 1);
            }
        });
    } else {
        logWarning('Missing MAME default horizontal artwork!', 1);
    }

    if (existsSync(join('mame', 'artwork', 'genvertical'))) {
        const layFiles = getAllFileNames(join('.', 'mame', 'artwork', 'genvertical'), ['lay'], false, false);
        const pngFiles = getAllFileNames(join('.', 'mame', 'artwork', 'genvertical'), ['png'], false, false);

        layFiles.forEach(file => {
            if (publish(['mame', 'artwork', 'genvertical', `${ file }.lay`])) {
                logSuccess('Published MAME default vertical artwork layout', 1);
            } else {
                logWarning('Failed to publish MAME default vertical artwork layout!', 1);
            }
        });

        pngFiles.forEach(file => {
            if (publish(['mame', 'artwork', 'genvertical', `${ file }.png`])) {
                logSuccess('Published MAME default vertical artwork image', 1);
            } else {
                logWarning('Failed to publish MAME default vertical artwork image!', 1);
            }
        });
    } else {
        logWarning('Missing MAME default vertical artwork!', 1);
    }

    logLoad('Loading sections…');

    // Get game section names (e.g. info, video, emulation)

    const sections = getAllFileNames(join('.', 'html', 'game', 'sections'), ['html'], false, false);

    logLoad('Loading component templates…');

    const tabstripTemplateHtml = loadCommonTemplatePiece('tabstrip');

    logSuccess('Loaded tabstrip template', 1);

    const tabTemplateHtml = loadCommonTemplatePiece('tab');

    logSuccess('Loaded tab template', 1);

    const genreListTemplateHtml = loadCommonTemplatePiece('genre-list');

    logSuccess('Loaded genre list template', 1);

    const genreImageItemTemplateHtml = loadCommonTemplatePiece('genre-image-item');

    logSuccess('Loaded game image item template', 1);

    const genreItemTemplateHtml = loadCommonTemplatePiece('genre-image-item');

    logSuccess('Loaded game item template', 1);

    logProcess(`Processing ${ games.length } game(s)…`);

    logBreak();

    games.forEach(game => {
        logProcess(`Processing game: ${ game.description }`);

        let hasVideo = false;
        let hasLogo = false;
        let hasIcon = false;
        let hasMameArtwork = false;

        let missingRoms = 0;
        let missingEmulators = 0;
        let missingGameMetaData;

        // Default icon represents the system

        let iconName = game.system;

        // Same for default background

        let backgroundName = game.system;

        // Artwork (e.g. bezels)

        let artworkName, bezelImageName, overlayImageName, bezelAspectRatioStyle;

        const { genres } = game;

        let version;

        let publishedDefaultController;

        if (game.roms.length) {
            logWrite('Publishing ROM file(s)…', 1);
        }

        if (game.system.toLowerCase() == 'mame') {
            // TODO: Refactor in mame.js

            version = (function(names, machineName, cloneOf) {
                const versionMap = mameVersions.map(version => {
                    // If merged romset...

                    if (romsetTypes[version] == 'merged' && cloneOf) {
                        // Remove the clone ROM, as all will be included in parent

                        return names.filter(name => name != machineName).every(name => existsSync(join('.', 'mame', 'roms', version, `${ name }.zip`)));
                    }

                    return names.every(name => existsSync(join('.', 'mame', 'roms', version, `${ name }.zip`)));
                });

                const foundVersions = versionMap.filter(v => !!v);
                const foundPreferredVersion = mameVersions.includes(preferredVersion) && versionMap[mameVersions.indexOf(preferredVersion)];

                if (foundVersions.length > 1 && !foundPreferredVersion) {
                    // TODO: Move this out of this function

                    logWarning('Multiple ROM versions found!', 2);

                    totalAmbiguousRomVersions++;
                }

                // If preferred version found…

                if (foundPreferredVersion) {
                    return preferredVersion;
                }

                if (foundVersions.length) {
                    return mameVersions[versionMap.findIndex(v => !!v)];
                }

                return '';
            })(game.roms, game.name, game.cloneOf);

            // If merged romset...

            if (romsetTypes[version] == 'merged' && game.cloneOf) {
                // Remove clone ROM (all will be in parent)

                game.roms = game.roms.filter(rom => rom != game.name);
            }

            // game.romHashes = game.roms.map(game => getZipSha1Sync(join('.', 'mame', 'roms', `${ game.name }.zip`)));

            game.version = version;
        }

        game.roms.forEach(rom => {
            if (game.system.toLowerCase() == 'mame') {
                if (version) {
                    if (publish([game.system, 'roms', version, rom + '.zip'], ['public', game.system, 'roms', rom + '.zip'])) {
                        logSuccess(`Published ROM file: ${ rom }.zip`, 2);
                    }
                } else {
                    missingRoms++;
                }
            } else {
                // Non-MAME systems are not versioned

                if (publish([game.system, 'roms', rom + '.zip'])) {
                    logSuccess(`Published ROM file: ${ rom }.zip`, 2);
                } else {
                    missingRoms++;
                }
            }
        });

        totalMissingRoms += missingRoms;

        let metaDataFile;

        if (game.system.toLowerCase() == 'dosbox') {
            metaDataFile = `${ dosboxEmulator }.json`;
        } else {
            metaDataFile = `${ game.name }.json`;
        }

        // If metadata file does NOT exist…

        if (game.system.toLowerCase() != 'mame' && !existsSync(join('.', game.system.toLowerCase(), metaDataFile))) {
            throw new Error(`☠ Missing ${ game.system } emulator meta data!`);
        }

        // Put reversed "The" at front

        game.description = game.description.split(', The').reverse().join('The ');

        // If MAME game…

        if (game.system.toLowerCase() == 'mame') {
            // Trim any paranthetical at end (always extraneous info)

            game.description = game.description.replace(/\s*\(.*\)\s*$/, '');
        }

        if (game.system.toLowerCase() == 'dosbox') {
            // If haven't yet published the DoxBox emulator...

            if (!publishedEmulators.has('dosbox')) {
                logWrite('Publishing DosBox emulator…', 1);

                if (publish(['dosbox', `${ dosboxEmulator }.wasm.gz`])) {
                    logSuccess('Published DosBox emulator assembly', 2);
                } else {
                    missingEmulators++;

                    totalMissingEmulators++;
                }

                if (publish(['dosbox', `${ dosboxEmulator }.js.gz`])) {
                    logSuccess('Published DosBox emulator assembly script', 2);
                } else {
                    missingEmulators++;

                    totalMissingEmulators++;
                }

                if (publish(['dosbox', `${ dosboxEmulator }.json`])) {
                    logSuccess('Published DosBox meta data', 2);
                } else {
                    // TODO: Skip game if this is set

                    missingGameMetaData = true;

                    // TODO: Set flag instead, as this will repeat for all DoxBox games

                    // totalMissingGameMetaData++;
                }

                if (!missingEmulators && !missingGameMetaData) {
                    publishedEmulators.add('dosbox');
                }
            }
        } else if (game.system.toLowerCase() == 'mame') {
            // Publish "in stock" MAME emulator (hosting MAME WASM and JS files for this title, otherwise they are pulled from IA)

            // Never a parent game of clone, but will refer to common source files in some cases (e.g. neogeo)

            let wasmFilename = game.parentSystem == game.cloneOf ? game.name : game.parentSystem;

            // NOTE: The check for these two odd clones will be factored out in next DB revision

            if (['gradius', 'crimfghtu', 'cyberbalt'].includes(game.name)) {
                wasmFilename = game.cloneOf;
            }

            // const wasmFilename = game.parentSystem || game.name;

            if (!publishedEmulators.has(wasmFilename)) {
                logWrite('Publishing MAME emulator…', 1);

                if (publish(['mame', `mame${ wasmFilename }.wasm.gz`])) {
                    logSuccess(`Published emulator assembly: mame${ wasmFilename }`, 2);
                } else {
                    missingEmulators++;
                }

                if (publish(['mame', `mame${ wasmFilename }.js.gz`])) {
                    logSuccess(`Published emulator assembly script: mame${ wasmFilename }`, 2);
                } else {
                    missingEmulators++;
                }

                if (!missingEmulators) {
                    publishedEmulators.add(wasmFilename);
                }
            } else {
                log(`Already published emulator: mame${ wasmFilename }`, undefined, 1);
            }

            if (missingEmulators) {
                if (externalEmulatorLocation) {
                    // Reference emulator remotely

                    game.externalEmulatorLocation = externalEmulatorLocation;
                } else {
                    logWarning(`Missing ${ missingEmulators } emulator file(s)!`, 2);

                    totalMissingEmulators += missingEmulators;
                }
            }

            let metadata;
            let metaDataFile;

            if (existsSync(join('mame', `${ game.name }.json`))) {
                metaDataFile = game.name;
            } else if (game.cloneOf && existsSync(join('mame', `${ game.cloneOf }.json`))) {
                metaDataFile = game.cloneOf;
            }

            if (metaDataFile) {
                logLoad('Loading meta data…', 1);

                try {
                    metadata = loadJson(join('mame', `${ metaDataFile }.json`));
                } catch (e) {
                    logWarning('Failed to load meta data!', 2);
                }

                if (metadata) {
                    metadata.name = game.description;
                    metadata.driver = wasmFilename;
                    metadata.machine_name = game.name;

                    logSuccess(`Loaded meta data from ${ metaDataFile }.json`, 2);
                } else {
                    missingGameMetaData = true;
                }
            }

            if (!metadata) {
                logProcess('Creating meta data…', 1);

                // TODO: Tally confidence to create (any other games reference this system?)

                metadata = {
                    name: game.description,
                    arcade: '1',
                    peripherals: [''],
                    extra_args: [''],
                    driver: wasmFilename,
                    machine_name: game.name,
                    wasmjs_filename: `mame${ wasmFilename }.js.gz`,
                    wasm_filename: `mame${ wasmFilename }.wasm.gz`,
                    file_locations: {}
                };

                // If variations found for this driver...

                // FIXME: This needs to be moved to after confidence is computed (and don't tally "fixed" locations)
                //        Logged confidence will inflate with each fixed location; doesn't affect anything else yet.

                if (wasmVariations[wasmFilename]) {
                    // TODO: This will only work here if have already encountered the variation (need to build wasmVariations in advance of loop)

                    let confidence = 0;

                    if (wasmVariationCounts[wasmFilename]) {
                        confidence = wasmVariationCounts[wasmFilename][0] / wasmVariationCounts[wasmFilename][1];
                    }

                    log('Fixing file location variation(s)', '🔧', 2);

                    if (confidence < 1) {
                        logWarning(`With less than 100% confidence (${ Math.floor(confidence * 100) }%)`, 3); // TODO: Tally
                    }

                    metadata.file_locations = wasmVariations[wasmFilename];

                    game.wasmProgramName = Object.keys(wasmVariations[wasmFilename])[0];
                } else {
                    // Otherwise go with the usual naming conventions

                    metadata.file_locations[`mame${ wasmFilename }.wasm`] = `mame${ wasmFilename }.wasm.gz`;
                }

                missingGameMetaData = true;

                logSuccess('Created meta data', 2);
            }

            const files = [];
            const virtualFileSystem = {};

            virtualFileSystem.files = [];

            game.roms.forEach(rom => {
                files.push({
                    name: `${ rom }.zip`,
                    url: `../mame/roms/${ rom }.zip`
                });
            });

            // Samples (recorded sound effects)

            // TODO: Correlate with hasSamples property

            if (existsSync(join('.', 'mame', 'samples', `${ game.name }.zip`))) {
                logWrite('Publishing sound samples…', 1);

                if (publish(['mame', 'samples', `${ game.name }.zip`])) {
                    virtualFileSystem.samples = `${ game.name }_samples`;

                    logSuccess(`Published sound samples: ${ game.name }.zip`, 2);
                }
            }

            // CHDs (optical disc dumps)

            // TODO: Correlate with existing "disks" property (next export revision)

            if (version && existsSync(join('.', 'mame', 'roms', version, game.name))) {
                logWrite('Publishing disk file(s)…', 1);

                game.disks = [];

                const chdFiles = getAllFileNames(join('.', 'mame', 'roms', version, game.name), ['chd'], true, false);

                if (!existsSync(join('.', 'public', 'mame', 'roms', game.name))) {
                    mkdirSync(join('.', 'public', 'mame', 'roms', game.name));
                }

                chdFiles.forEach(file => {
                    if (publish(['mame', 'roms', version, game.name, file], ['.', 'public', 'mame', 'roms', game.name, file])) {
                        virtualFileSystem.files.push({
                            name: `${ file }`,
                            url: `../mame/roms/${ game.name }/${ file }`
                        });

                        logSuccess(`Published disk file: ${ file }`, 2);

                        game.disks.push(file);
                    }
                });

                // game.diskHashes = game.disks.map(file => getZipSha1Sync('mame', 'roms', version, game.name, file));
            }

            // NVRAM (internal machine settings)

            if (existsSync(join('.', 'mame', 'nvram', game.name))) {
                logWrite('Publishing NVRAM file(s)…', 1);

                const ramFiles = getAllFileNames(join('.', 'mame', 'nvram', game.name), ['*'], true, false);

                if (!existsSync(join('.', 'public', 'mame', 'nvram', game.name))) {
                    mkdirSync(join('.', 'public', 'mame', 'nvram', game.name));
                }

                ramFiles.forEach(file => {
                    if (publish(['mame', 'nvram', game.name, file], ['.', 'public', 'mame', 'nvram', game.name, file])) {
                        virtualFileSystem.files.push({
                            name: file,
                            url: `../mame/nvram/${ game.name }/${ file }`
                        });

                        logSuccess(`Published NVRAM file: ${ file }`, 2);
                    } else {
                        logWarning(`Failed to publish NVRAM file: ${ file }`);
                    }
                });

                game.nvramFiles = ramFiles;
            }

            if (existsSync(join('.', 'mame', 'artwork', game.name))) {
                artworkName = game.name;
            } else if (game.cloneOf && existsSync(join('.', 'mame', 'artwork', game.cloneOf))) {
                artworkName = game.cloneOf;
            }

            if (artworkName) {
                logWrite(`Publishing MAME artwork files for ${ artworkName }…`, 1);

                const layFiles = getAllFileNames(join('.', 'mame', 'artwork', artworkName), ['lay'], false, false);
                const pngFiles = getAllFileNames(join('.', 'mame', 'artwork', artworkName), ['png'], false, false);

                if (!existsSync(join('.', 'public', 'mame', 'artwork', artworkName))) {
                    mkdirSync(join('.', 'public', 'mame', 'artwork', artworkName));
                }

                layFiles.forEach(file => {
                    if (publish(['mame', 'artwork', artworkName, `${ file }.lay`])) {
                        virtualFileSystem.files.push({
                            name: `artwork/${ file }.lay`,
                            url: `../mame/artwork/${ artworkName }/${ file }.lay`
                        });

                        logSuccess(`Published MAME artwork layout file: ${ file }.lay`, 2);
                    }
                });

                pngFiles.forEach(file => {
                    if (publish(['mame', 'artwork', artworkName, `${ file }.png`])) {
                        virtualFileSystem.files.push({
                            name: `artwork/${ file }.png`,
                            url: `../mame/artwork/${ artworkName }/${ file }.png`
                        });

                        logSuccess(`Published MAME artwork image: ${ file }.png`, 2);
                    }
                });

                if (!pngFiles.length) {
                    logWarning('Missing MAME bezel image!', 2);

                    totalMissingBezelImages++;

                    gamesMissingBezelImages.push(game);
                }

                hasMameArtwork = true;

                game.artworkFiles = pngFiles.map(file => `${ file }.png`).concat(layFiles.map(file => `${ file }.lay`));

                const overlayImages = pngFiles.filter(file => file == 'overlay');

                if (overlayImages.length == 1) {
                    overlayImageName = overlayImages[0];
                } else if (overlayImages.length > 1) {
                    logWarning('Ambiguous overlay image!', 1);
                }

                if (pngFiles.length == 1) {
                    bezelImageName = pngFiles[0];
                } else if (pngFiles.length > 1) {
                    const pngFilesWithBezel = pngFiles.filter(file => file.toLowerCase().includes('bezel'));

                    if (pngFilesWithBezel.length == 1) {
                        bezelImageName = pngFilesWithBezel[0];
                    } else if (pngFilesWithBezel.length) {
                        const bezelImage = pngFilesWithBezel.find(file => file.toLowerCase() == 'bezel');

                        if (bezelImage) {
                            bezelImageName = bezelImage;
                        } else {
                            logWarning('Ambiguous bezel image!', 1);

                            bezelImageName = 'bezel';

                            artworkName = !game.nativeResolution || game.nativeResolution[0] >= game.nativeResolution[1] ? 'genhorizontal' : 'genvertical';
                        }
                    } else {
                        logWarning('Can\'t find any bezel images!!', 1);

                        bezelImageName = 'bezel';

                        artworkName = !game.nativeResolution || game.nativeResolution[0] >= game.nativeResolution[1] ? 'genhorizontal' : 'genvertical';
                    }
                } else {
                    bezelImageName = 'bezel';

                    artworkName = game.nativeResolution[0] >= game.nativeResolution[1] ? 'genhorizontal' : 'genvertical';
                }
            } else {
                logWarning('Missing MAME artwork!', 1);

                bezelImageName = 'bezel';

                artworkName = game.nativeResolution[0] >= game.nativeResolution[1] ? 'genhorizontal' : 'genvertical';

                totalMissingArtwork++;

                gamesMissingArtwork.push(game);
            }

            game.artworkName = artworkName;

            const { width, height } = sizeOf(join('.', 'mame', 'artwork', artworkName, `${ bezelImageName }.png`));

            // If 16:9...

            if (width == (height * 16) / 9) {
                bezelAspectRatioStyle = '';
            } else {
                log(`Odd bezel aspect ratio: ${ width / height }!`, undefined, 1);

                gamesWithOddBezelAspectRatios.push(game);

                bezelAspectRatioStyle = `${ width } / ${ height }`;
            }

            if (existsSync(join('.', 'mame', 'ctrlr', 'default.cfg'))) {
                // If have not yet published the single supported ctrlr file...

                if (!publishedDefaultController) {
                    logWrite('Publishing controller file…', 1);
                }

                if (publishedDefaultController || publish(['mame', 'ctrlr', 'default.cfg'])) {
                    virtualFileSystem.files.push({
                        name: 'ctrlr/default.cfg',
                        url: '../mame/ctrlr/default.cfg'
                    });

                    logSuccess('Published controller file: default.cfg', 2);

                    publishedDefaultController = true;
                }
            }

            // CFGs (e.g. control overrides for ROM "driver" problem cases)

            if (existsSync(join('.', 'mame', 'cfg', `${ game.name }.cfg`))) {
                logWrite('Publishing configuration file…', 1);

                if (publish(['mame', 'cfg', `${ game.name }.cfg`])) {
                    virtualFileSystem.files.push({
                        name: `cfg/${ game.name }.cfg`,
                        url: `../mame/cfg/${ game.name }.cfg`
                    });

                    logSuccess(`Published configuration file: ${ game.name }.cfg`, 2);
                }
            }

            if (metadata.virtual_file_system) {
                throw new Error('☠ Existing virtual file system in canonical meta data!');
            }

            if (metadata.js_filename) {
                logWarning('Canonical meta data has "js_filename" property (?)', 1);
            }

            if (metadata.extra_args && metadata.extra_args[0]) {
                logWarning('Extra arguments in canonical meta data!', 1);

                totalExistingExtraArguments++;
            }

            metadata.virtual_file_system = virtualFileSystem;
            metadata.files = files;

            metadata.keep_aspect = true;

            if (game.nativeResolution) {
                // Existing meta data, which was downloaded with WASM and JS files from IA is source of truth.

                if (metadata.native_resolution) {
                    let resolutionMismatch = false;

                    // If existing meta data width is different...

                    if (metadata.native_resolution[0] != game.nativeResolution[0]) {
                        if (metadata.native_resolution[1] == game.nativeResolution[0] && metadata.native_resolution[0] == game.nativeResolution[1]) {
                            log('Resolution width variation. Some machines (e.g. Space Invaders) used mirrors to rotate.', undefined, 1);
                        } else {
                            log('Resolution width variation. Some machines are mapped to different dimensions for whatever reason.', undefined, 1);
                        }

                        resolutionMismatch = true;

                        // Use meta data as source of truth

                        game.nativeResolution = metadata.native_resolution;
                    }

                    // If existing meta data height is different...

                    if (metadata.native_resolution[1] != game.nativeResolution[1]) {
                        if (game.name != 'invaders') { // Space Invaders is a weird outlier due to use of mirror
                            if (metadata.native_resolution[1] == game.nativeResolution[0] && metadata.native_resolution[0] == game.nativeResolution[1]) {
                                log('Resolution height variation. Some machines (e.g. Space Invaders) used mirrors to rotate.', undefined, 1);
                            } else {
                                log('Resolution height variation. Some machines (e.g. Space Panic) use different heights for whatever reason.', undefined, 1);
                            }

                            resolutionMismatch = true;
                        }

                        game.nativeResolution = metadata.native_resolution;
                    }

                    if (resolutionMismatch) {
                        totalResolutionMismatches++;

                        gamesWithResolutionMismatches.push(game);
                    }
                } else {
                    metadata.native_resolution = game.nativeResolution;
                }
            } else {
                // TODO: Warn only if raster display (vector displays have no resolution)

                metadata.native_resolution = [0, 0]; // This is what IA put in the manifests for vector games
            }

            if (metadata.wasmjs_filename && metadata.wasmjs_filename != `mame${ wasmFilename }.js.gz`) {
                logWarning(`Assembly script mismatch: "${ metadata.wasmjs_filename }" is not "${ `mame${ wasmFilename }.js.gz` }"!`, 1);

                totalWasmJsMismatches++;
            }

            if (metadata.wasm_filename && metadata.wasm_filename != `mame${ wasmFilename }.wasm.gz`) {
                logWarning(`Assembly mismatch: "${ metadata.wasm_filename }" is not "${ `mame${ wasmFilename }.wasm.gz` }"!`, 1);

                totalWasmMismatches++;
            }

            if (!Object.keys(metadata.file_locations).includes(`mame${ wasmFilename }.wasm`)) {
                log(`Assembly filename variation: "mame${ wasmFilename }.wasm" not used`, undefined, 1);

                wasmVariations[wasmFilename] = metadata.file_locations;

                totalWasmVariations++;

                fixedWasmVariations.push(game);

                if (!wasmVariationCounts[wasmFilename]) {
                    wasmVariationCounts[wasmFilename] = [0, 0];
                }

                wasmVariationCounts[wasmFilename][0]++;
                wasmVariationCounts[wasmFilename][1]++;
            } else if (wasmVariationCounts[wasmFilename]) {
                wasmVariationCounts[wasmFilename][1]++;
            }

            if (game.biosFiles) {
                if (metadata.bios_filenames) {
                    // If existing meta data bios filename is different...

                    if (game.biosFiles[0] && metadata.bios_filenames[0] != game.biosFiles[0]) {
                        if (metadata.bios_filenames[0]) {

                            logWarning(`BIOS mismatch: "${ metadata.bios_filenames[0] }" is not "${ game.biosFiles[0] }"`, 1);

                            totalBiosMismatches++;
                        } else {
                            log(`BIOS file "${ game.biosFiles[0] }" not listed in static manifest`, undefined, 1);
                        }
                    }
                }

                metadata.bios_filenames = game.biosFiles.map(file => `${ file }.zip`);

                if (!metadata.bios_filenames.length) {
                    metadata.bios_filenames = [''];
                }
            }

            writeFileSync(join('.', 'public', 'mame', `${ game.name }.json`), JSON.stringify(metadata, null, 3));
        }

        if (missingRoms && !game.externalLocation) {
            logWarning(`Missing ${ missingRoms } ROM(s)!`, 1);

            skippedGames++;

            gamesSkipped.push(game);
        } else if (missingEmulators && (!game.externalEmulatorLocation || undiscoveredAssemblies.includes(game.name))) {
            logWarning(`Missing ${ missingEmulators } emulator file(s)!`, 1);

            skippedGames++;

            gamesSkipped.push(game);
        } else if (!publishFilter(Object.assign(Object.assign({}, game), { // Augment game with flags for filtering
            hasVideo,
            hasLogo,
            hasIcon,
            hasMameArtwork
        }))) {
            log('Filtered', undefined, 1);

            skippedGames++;

            gamesSkipped.push(game);
        } else {
            if (missingEmulators) {
                if (missingGameMetaData) {
                    logWarning(`Referencing emulator file(s) at ${ externalEmulatorLocation } without canonical meta data!`, 1);
                } else {
                    log(`Referencing emulator file(s) at ${ externalEmulatorLocation }`, '📡', 1);
                }

                totalExternalEmulators++;
            }

            // TODO: Move this above where creating meta data

            if (missingGameMetaData) {
                if (!missingEmulators) {
                    logWarning('Missing canonical meta data!', 1);
                }

                totalMissingCanonicalMetaData++;

                gamesMissingMetaData.push(game);
            }

            if (missingRoms) {
                log(`Referencing ROM files at ${ game.externalLocation }`, '📡', 1);

                totalExternalRoms++;
            }

            logWrite('Publishing media files…', 1);

            let logoName;

            if (publish(['images', 'logos', `${ game.name }.png`])) {
                logSuccess('Published logo image', 2);

                hasLogo = true;

                logoName = game.name;
            } else if (publish(['images', 'logos', `${ game.description }.png`])) {
                logSuccess('Published logo image', 2);

                hasLogo = true;

                logoName = game.description;
            } else {
                totalMissingLogos++;

                logWarning('Missing logo!', 2);

                gamesMissingLogos.push(game);
            }

            if (publish(['images', 'backgrounds', `${ game.name }.png`])) {
                logSuccess('Published background image', 2);

                backgroundName = game.name;
            } else {
                genres.forEach(genre => {
                    if (publish(['backgrounds', `${ genre } Games.png`])) {
                        logSuccess(`Published ${ genre } genre background image`, 2);

                        // Use genre-specific background

                        backgroundName = genre + ' Games';
                    }
                });

                totalMissingBackgrounds++;

                logWarning('Missing background image!', 2);

                gamesMissingBackgroundImages.push(game);
            }

            let videoName;

            if (publish(['video', 'previews', `${ game.name }.mp4`])) {
                logSuccess('Published preview video', 2);

                hasVideo = true;

                videoName = game.name;
            } else if (publish(['video', 'previews', `${ game.description }.mp4`])) {
                logSuccess('Published preview video', 2);

                hasVideo = true;

                videoName = game.description;
            } else if (game.cloneOf && publish(['video', 'previews', `${ game.cloneOf }.mp4`])) {
                logSuccess('Published parent preview video', 2);

                hasVideo = true;

                videoName = game.cloneOf;
            } else {
                totalMissingVideos++;

                gamesMissingVideos.push(game);

                logWarning('Missing preview video!', 2);
            }

            let inlineCss = '';

            // If game document-specific CSS...

            if (existsSync(join('.', 'style', 'game.css'))) {
                inlineCss += '\n' + loadTextFile(join('.', 'style', 'game.css'));
            }

            let genreCss = '';

            genres.forEach(genre => {
                if (existsSync(join('.', 'style', genre + '.css'))) {
                    genreCss = loadTextFile(join('.', 'style', genre + '.css'));
                }
            });

            // If system-specific CSS...

            if (existsSync(join('.', 'style', game.system + '.css'))) {
                inlineCss += '\n' + loadTextFile(join('.', 'style', game.system + '.css'));
            }

            // If genre-specific CSS...

            if (genreCss) {
                inlineCss += '\n' + genreCss;
            }

            // If game-specific CSS…

            if (existsSync(join('.', 'style', game.name + '.css'))) {
                inlineCss += '\n' + loadTextFile(join('.', 'style', game.name + '.css'));
            }

            let inlineCssHtml = '';

            if (inlineCss) {
                inlineCssHtml = '<style>' + inlineCss + '</style>';
            }

            if (publish(['icons', `${ game.name }.ico`])) {
                logSuccess('Published icon', 2);

                // Use game-specific icon

                iconName = game.name;
            } else if (publish(['icons', `${ game.cloneOf }.ico`])) {
                logSuccess('Published parent icon', 2);

                // Use game-specific icon

                iconName = game.cloneOf;

                hasIcon = true;
            } else {
                logWarning('Missing icon!', 2);

                gamesMissingIcons.push(game);

                const genre = genres.reverse().find(genre => {
                    return existsSync(join('icons', `${ genre }.ico`));
                });

                if (genre) {
                    logSuccess(`Published ${ genre } genre icon`, 2);

                    // Use genre-specific icon

                    iconName = genre;
                }

                totalMissingIcons++;
            }

            let avatarFolder;

            if (game.system.toLowerCase() == 'mame') {
                avatarFolder = 'cabinets';
            } else {
                if (existsSync(join('.', 'images', 'boxes', game.name + '.png')) || existsSync(join('.', 'images', 'boxes', game.description + '.png'))) {
                    avatarFolder = 'boxes';
                } else {
                    avatarFolder = 'cabinets';
                }
            }

            let avatarName;

            if (publish(['images', avatarFolder, game.name + '.png'])) {
                logSuccess(`Published avatar image: ${ game.name }.png`, 2);

                avatarName = game.name;
            } else if (publish(['images', avatarFolder, game.description + '.png'])) {
                logSuccess(`Published avatar image: ${ game.description }.png`, 2);

                avatarName = game.description;
            } else {
                logWarning('Missing avatar image!', 2);

                // TODO: Do at end (only system avatar images used)

                if (publish(['images', avatarFolder, game.system + '.png'])) {
                    logSuccess('Published system avatar image instead', 2);
                } else if (avatarFolder != 'cabinets' && publish(['images', 'cabinets', game.system + '.png'])) {
                    logSuccess('Published system avatar image instead', 2);

                    avatarFolder = 'cabinets';
                } else {
                    logWarning('Missing system avatar image!', 2);

                    totalMissingSystemCabinetImages++;
                }

                avatarName = game.system;

                totalMissingCabinetImages++;

                gamesMissingCabinetImages.push(game);
            }

            // Populate HTML templates and write game document to public

            logLoad('Loading game document templates…', 1);

            let templateHtml = '<head>' + loadGameTemplatePiece('head', game) + inlineCssHtml + '</head>';

            let contentHtml = '';

            logProcess('Processing game document sections…', 1);

            sections.forEach(section => {
                // If game has preview video or this is not the video section…

                if (section != 'video' || hasVideo) {
                    contentHtml += loadGameSectionHtml(section, game, undefined, section == defaultSectionId);

                    logSuccess(`Added ${ section } section`, 2);
                }
            });

            let headerHtml = loadGameTemplatePiece(hasLogo ? 'headline-image' : 'headline', game);

            headerHtml += loadGameTemplatePiece('navigation', game);

            let extraHtml = loadGameTemplatePiece('extras', game);
            let extraImages = [];

            let extraImagesUrlPath = '../images/extras';

            let extraGameImagesPath = join('.', 'images', 'extras');

            genres.forEach(genre => {
                genresUsed.add(genre);
            });

            systemsUsed.add(game.system);

            let extraImagesType = '';

            if (existsSync(join('.', 'images', 'extras', game.name + '.png'))) {
                extraImages = [game.name + '.png'];
            } else if (existsSync(join('.', 'images', 'extras', game.name + '.gif'))) {
                extraImages = [game.name + '.gif'];
            } else if (existsSync(join('.', 'images', 'extras', game.name))) {
                extraImages = getAllImageNames(join('.', 'images', 'extras', game.name), ['png', 'gif'], true, false);

                extraImagesUrlPath = `../images/extras/${ game.name }`;
                extraGameImagesPath = join('.', 'images', 'extras', game.name);
            } else if (genres.some(genre => existsSync(join('.', 'images', 'extras', genre + ' games.png')))) {
                extraImages = [genres.reverse().find(genre => existsSync(join('.', 'images', 'extras', genre + ' games.png'))) + '.png'];

                extraImagesType = 'genre';
            } else if (genres.some(genre => existsSync(join('.', 'images', 'extras', genre + ' games.gif')))) {
                extraImages = [genres.reverse().find(genre => existsSync(join('.', 'images', 'extras', genre + ' games.gif'))) + '.gif'];

                extraImagesType = 'genre';
            } else if (genres.some(genre => existsSync(join('.', 'images', 'extras', genre + ' games')))) {
                const genre = genres.reverse().find(genre => existsSync(join('.', 'images', 'extras', genre + ' games')));

                extraImages = getAllImageNames(join('.', 'images', 'extras', genre + ' games'));

                extraImagesUrlPath = `../images/extras/${ game.name } games`;
                extraGameImagesPath = join('.', 'images', 'extras', genre + ' games');

                extraImagesType = 'genre';
            } else if (existsSync(join('.', 'images', 'extras', game.system + '.png'))) {
                extraImages = [game.system + '.png'];

                extraImagesType = 'system';
            } else if (existsSync(join('.', 'images', 'extras', game.system + '.gif'))) {
                extraImages = [game.system + '.gif'];

                extraImagesType = 'system';
            } else if (existsSync(join('.', 'images', 'extras', game.system))) {
                extraImages = getAllImageNames(join('.', 'images', 'extras', game.system));

                extraImagesUrlPath = extraImagesUrlPath = `../images/extras/${ game.system }`;
                extraGameImagesPath = join('.', 'images', 'extras', game.system);

                extraImagesType = 'system';
            }

            let decorationPieceName = 'decoration';

            if (extraImagesType) {
                decorationPieceName += extraImagesType + '-' + decorationPieceName;
            }

            const extraImageTemplateHtml = loadCommonTemplatePiece(decorationPieceName);

            let extraImagesHtml = extraImages.map((image, i) => {
                let html = extraImageTemplateHtml;

                const index = isNaN(parseInt(image, 10)) ? Math.min(i + 1, 4) : parseInt(image, 10);

                html = replacePlaceholder('index', index, html);
                html = replacePlaceholder('source', `${ extraImagesUrlPath }/${ image }`, html);

                return html;
            });

            logProcess('Processing extra components…', 1);

            extraHtml = replaceComponentPlaceholderHtml('extraImages', extraImagesHtml, extraHtml);

            logSuccess('Processed extra images', 2);

            if (extraHtml) {
                extraHtml = `<div id="extra">${ extraHtml }</div>`;
            }

            let genreListHtml = genreListTemplateHtml;
            let tabstripHtml = tabstripTemplateHtml;
            let tabsHtml = '';
            let genresHtml = '';

            logProcess('Building main tabstrip…', 1);

            sections.forEach(section => {
                // NOTE: video section omitted when no preview video

                const isDefaultSection = sections.includes(defaultSectionId) ? section == defaultSectionId : section == sections[0];

                let tabHtml = replacePlaceholder('section', section, tabTemplateHtml);

                tabHtml = replacePlaceholder('caption', section, tabHtml);
                tabHtml = replacePlaceholder('data', isDefaultSection ? 'data-autofocus' : '', tabHtml);
                tabHtml = replacePlaceholder('tabIndex', isDefaultSection ? '0' : '-1', tabHtml);
                tabHtml = replacePlaceholder('selected', String(isDefaultSection), tabHtml);

                tabsHtml += tabHtml;

                logSuccess(`Added ${ section } tab`, 2);
            });

            tabstripHtml = replaceComponentPlaceholderHtml('tabs', tabsHtml, tabstripHtml);

            logProcess('Building genres list…', 1);

            genres.forEach(genre => {
                let genreHtml;

                if (existsSync(join('.', 'images', 'logos', `${ genre } Games.png`))) {
                    genreHtml = replacePlaceholder('name', genre, genreImageItemTemplateHtml);

                    genreHtml = replacePlaceholder('source', `../images/logos/${ genre } Games.png`, genreHtml);
                } else {
                    genreHtml = replacePlaceholder('name', genre, genreItemTemplateHtml);
                }

                genresHtml += genreHtml;

                logSuccess(`Added ${ genre } item`, 2);
            });

            genreListHtml = replaceComponentPlaceholderHtml('genres', genresHtml, genreListHtml);

            logProcess('Processing header components…', 1);

            headerHtml = replaceComponentPlaceholderHtml('tabstrip', tabstripHtml, headerHtml);

            logSuccess('Processed tabstrip(s)', 2);

            headerHtml = replaceComponentPlaceholderHtml('genre-list', genreListHtml, headerHtml);

            logSuccess('Processed genre list(s)', 2);

            // TODO: document template

            templateHtml += `<body class="${ fullScreen ? 'full-screen' : '' }" dir="${ rtlLanguages.includes(language) ? 'rtl' : 'ltr' }" style="background-image:url(../images/backgrounds/${ backgroundName }.png)">`;
            templateHtml += '<header>' + headerHtml + '</header>';
            templateHtml += '<main>' + contentHtml + '</main>';
            templateHtml += '<footer>' + loadGameTemplatePiece('footer', game) + '</footer>';
            templateHtml += extraHtml;
            templateHtml += loadGameTemplatePiece('scripts', game);
            templateHtml += '</body>';

            if (extraImages.length) {
                logWrite('Publishing extra image(s)…', 1);
            }

            extraImages.forEach(image => {
                if (!existsSync(join('.', 'public', extraGameImagesPath))) {
                    mkdirSync(join('.', 'public', extraGameImagesPath));
                }

                if (publish([extraGameImagesPath, image])) {
                    logSuccess(`Published extra game image: ${ image }`, 2);
                } else {
                    logWarning(`Failed to publish extra game imge: ${ image }!`, 2);
                }
            });

            if (game.controls && game.buttonLabels) {
                const buttonLabels = game.buttonLabels;
                const player1Controls = game.controls[1];

                // Deal with buttons as joystick directions in a handful of games (e.g. Asteroids, Lunar Lander)

                if (buttonLabels.length >= 2 && (player1Controls.type == 'only_buttons' || player1Controls.type == 'pedal')) { // Pedal case is Lunar Lander
                    if (buttonLabels[0].toLowerCase().split(' ').includes('left') && buttonLabels[1].toLowerCase().split(' ').includes('right')) {
                        game.buttonLabels = buttonLabels.slice(2);

                        game.controls[1].ways = 2;
                        game.controls[1].buttons = game.controls[1].numberOfButtons = buttonLabels.length;
                        game.controls[1].directions = ['left', 'right'];
                    }

                    if (buttonLabels[0].toLowerCase().split(' ').includes('up') && buttonLabels[1].toLowerCase().split(' ').includes('down')) {
                        game.buttonLabels = buttonLabels.slice(2);

                        game.controls[1].ways = 2;
                        game.controls[1].buttons = game.controls[1].numberOfButtons = buttonLabels.length;
                        game.controls[1].directions = ['up', 'down'];
                    }
                }
            }

            let html = templateHtml;

            log('Localizing game document…', '🌏︎', 1);

            // Replace resource placeholders

            Object.entries(resources[language]).forEach(([key, value]) => {
                html = replaceResourcePlaceholder(key, value, html);
            });

            // Replace data placeholders

            logPopulate('Populating game data…', 1);

            Object.keys(game).forEach(key => {
                html = replacePlaceholder(key, game[key], html);
            });

            html = replacePlaceholder('video-name', encodeURIComponent(videoName), html, true);

            const bezelAspectRatioStyleDirective = bezelAspectRatioStyle ? `aspect-ratio:${ bezelAspectRatioStyle }` : '';

            html = replacePlaceholder('bezel-style', `style="background-image: url(&quot;../mame/artwork/${ encodeURIComponent(artworkName) }/${ encodeURIComponent(bezelImageName) }.png&quot;);${ bezelAspectRatioStyleDirective }"`, html, true);

            let overlayStyle = '';

            if (overlayImageName) {
                overlayStyle = `style="background-image: url(../mame/artwork/${ encodeURIComponent(artworkName) }/${ encodeURIComponent(overlayImageName) }.png)"`;
            }

            html = replacePlaceholder('overlay-style', overlayStyle, html, true);

            html = replacePlaceholder('artwork-name', encodeURIComponent(artworkName), html, true);
            html = replacePlaceholder('bezel-image-name', encodeURIComponent(bezelImageName), html, true);

            html = replacePlaceholder('logo-name', encodeURIComponent(logoName), html, true);

            // Rating does not exist on DosBox games at moment (can remove this line once that is corrected)

            html = replacePlaceholder('rating', '--', html);

            // Story does not exist on DosBox games at moment (can remove this line once that is corrected)

            html = replacePlaceholder('story', '', html);

            // Embed game object literal

            html = replacePlaceholder('json', JSON.stringify(game), html, true);

            html = replacePlaceholder('dosbox-emulator', dosboxEmulator, html);

            html = replacePlaceholder('author', author, html);
            html = replacePlaceholder('appName', appName, html);
            html = replacePlaceholder('yearCurrent', yearCurrent, html);
            html = replacePlaceholder('genres', genres.join(', '), html);

            html = replacePlaceholder('avatarName', encodeURIComponent(avatarName), html, true);
            html = replacePlaceholder('avatarFolder', encodeURIComponent(avatarFolder), html, true);
            html = replacePlaceholder('iconName', encodeURIComponent(iconName), html, true);

            html = replacePlaceholder('players', game.players || 'NA', html);

            html = replacePlaceholder('buttonLabels', (game.buttonLabels || []).join(', '), html);

            html = replacePlaceholder('generalOrMature', game.mature ? 'mature' : 'general', html);

            html = replacePlaceholder('alternatingYesNo', game.players == 1 ? 'N/A' : game.alternating ? resources[language].yes : resources[language].no, html);

            // If missed any placeholders…

            if (html.includes('{{') && html.includes('}}')) {
                throw new Error('☠ Bad template!');
            }

            // Wrap HTML

            html = `<!DOCTYPE html><html lang="${ language }">${ html }</html>`;

            // Write HTML

            logWrite('Publishing game document…', 1);

            writeFileSync(join('.', 'public', 'games', `${ game.system.toLowerCase() }-${ game.name }-${ htmlHash }.html`), html);

            logSuccess(`Published game document: ${ game.system.toLowerCase() }-${ game.name }-${ htmlHash }.html`, 2);
        }

        logBreak();
    });

    logWrite('Publishing common images…');

    getAllFileNames(join('.', 'images'), ['png'], true, false).forEach(image => {
        if (publish(['images', image])) {
            logSuccess(`Published common image: ${ image }`, 1);
        } else {
            logWarning(`Failed to publish common image: ${ image }!`, 1);
        }
    });

    logWrite('Publishing shaders…');

    getAllFileNames(join('.', 'images', 'shaders'), ['png'], true, false).forEach(image => {
        if (publish(['images', 'shaders', image])) {
            logSuccess(`Published shader image: ${ image }`, 1);
        } else {
            logWarning(`Failed to publish shader image: ${ image }!`, 1);
        }
    });

    logWrite('Publishing common videos…');

    getAllFileNames(join('.', 'video'), ['mp4'], true, false).forEach(video => {
        if (publish(['video', video])) {
            logSuccess(`Published video: ${ video }`, 1);
        } else {
            logWarning(`Failed to publish video: ${ video }!`, 1);
        }
    });

    logWrite('Publishing genre images…');

    Array.from(genresUsed).forEach(genre => {
        if (publish(['images', 'logos', genre + ' Games.png'])) {
            logSuccess(`Published ${ genre } genre image`, 1);
        } else {
            logWarning(`Missing ${ genre } genre image!`, 1);

            totalMissingGenreImages++;
        }
    });

    logWrite('Publishing system icons…');

    // TODO: Only publish needed backgrounds and icons (same as genres, but refactor to happen here, instead of during loop)

    Array.from(systemsUsed).forEach(system => {
        // NOTE: current databases have imported "MAME" system type for arcade games (should be "mame")

        if (publish(['icons', system.toLowerCase() + '.ico'])) {
            logSuccess(`Published ${ system } system icon`, 1);
        } else {
            logWarning(`Missing ${ system } system icon!`, 1);
        }
    });

    logWrite('Publishing system backgrounds…');

    Array.from(systemsUsed).forEach(system => {
        if (publish(['images', 'backgrounds', system.toLowerCase() + '.png'])) {
            logSuccess(`Published ${ system } system background`, 1);
        } else {
            logWarning(`Missing ${ system } system background!`, 1);
        }
    });

    logBreak();

    if (skippedGames) {
        logWarning(`Skipped ${ skippedGames } game(s)!`);

        debugGameData(gamesSkipped);
    }

    if (totalMissingRoms) {
        logWarning(`Missing ${ totalMissingRoms } ROM(s)!`);
    }

    if (totalMissingEmulators) {
        logWarning(`Missing ${ totalMissingEmulators } emulator file(s)!`);
    }

    if (totalMissingCabinetImages) {
        logWarning(`Missing ${ totalMissingCabinetImages } avatar image(s)!`);

        debugGameData(gamesMissingCabinetImages);
    }

    if (totalMissingSystemCabinetImages) {
        logWarning(`Missing ${ totalMissingSystemCabinetImages } system avatar image(s)!`);
    }

    if (totalMissingArtwork) {
        logWarning(`${ totalMissingArtwork } game(s) missing MAME artwork!`);

        debugGameData(gamesMissingArtwork);
    }

    if (totalMissingBezelImages) {
        logWarning(`Missing ${ totalMissingBezelImages } MAME bezel image(s)!`);

        debugGameData(gamesMissingBezelImages);
    }

    if (totalMissingGenreImages) {
        logWarning(`Missing ${ totalMissingGenreImages } genre image(s)!`);
    }

    if (totalMissingLogos) {
        logWarning(`Missing ${ totalMissingLogos } logo(s)!`);

        debugGameData(gamesMissingLogos);
    }

    if (totalMissingBackgrounds) {
        logWarning(`Missing ${ totalMissingBackgrounds } background image(s)!`);

        debugGameData(gamesMissingBackgroundImages);
    }

    if (totalMissingVideos) {
        logWarning(`Missing ${ totalMissingVideos } video(s)!`);

        debugGameData(gamesMissingVideos);
    }

    if (totalMissingIcons) {
        logWarning(`Missing ${ totalMissingIcons } icon(s)!`);

        debugGameData(gamesMissingIcons);
    }

    if (totalAmbiguousRomVersions) {
        logWarning(`${ totalAmbiguousRomVersions } game(s) have ambiguous ROM versions!`);
    }

    if (totalBiosMismatches) {
        logWarning(`${ totalBiosMismatches } game(s) have BIOS file mismatches!`);
    }

    if (totalExternalEmulators) {
        log(`${ totalExternalEmulators } game(s) host emulator assemblies and scripts at: ${ externalEmulatorLocation }`);
    }

    if (totalMissingCanonicalMetaData) {
        logWarning(`${ totalMissingCanonicalMetaData } game(s) missing canonical meta data!`);

        console.log(gamesMissingMetaData);

        if (externalEmulatorLocation) {
            log(`Should be downloaded from: ${ externalEmulatorLocation }, as may contain resolution and/or assembly filename variations`, undefined, 1);
        }
    }

    if (totalResolutionMismatches) {
        log(`${ totalResolutionMismatches } game(s) have resolution variations`);

        debugGameData(gamesWithResolutionMismatches);
    }

    if (totalWasmVariations) {
        log(`${ totalWasmVariations } game(s) have assembly filename variation(s)`);

        debugGameData(fixedWasmVariations);
    }

    if (totalExternalRoms) {
        log(`${ totalExternalRoms } externally hosted ROM(s)`);
    }

    if (totalWasmMismatches) {
        logWarning(`${ totalWasmMismatches } assembly mismatch(es)`);
    }

    if (totalWasmJsMismatches) {
        logWarning(`${ totalWasmJsMismatches } assembly script mismatch(es)`);
    }

    if (totalExistingExtraArguments) {
        logWarning(`${ totalExistingExtraArguments } game(s) have extra arguments in canonical meta data!`);
    }

    if (gamesWithOddBezelAspectRatios.length) {
        log(`${ gamesWithOddBezelAspectRatios.length } game(s) have odd bezel aspect ratios`);

        debugGameData(gamesWithOddBezelAspectRatios);
    }

    log(`Finished in ${ Math.round((Date.now() - startTime) / 1000) } seconds.`, '⚐');
} else {
    throw new Error('☠ Failed to delete previously published game HTML files!');
}
