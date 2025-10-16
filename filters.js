// All games will be loaded.

const loadFilterAll = game => game;

// Examples:

// Load only parents (not clones)

const loadFilterParents = game => !game.cloneOf;

// Don't load DosBox games that lack EXE names (must be run manually)

// ({ system, exeName }) => system != 'dosbox' || exeName;

// All loaded games with required files will be published.

const publishFilterAll = game => game;

// Examples:

// Just games with vidoes

const publishFilterVideos = game => game.hasVideo;

// Just games with logos

const publishFilterLogos = game => game.hasLogo;

// MAME games must have artwork

const publishFilterMameArtwork =  ({ system, hasArtwork }) => hasArtwork || system != 'mame';

// Just games with icons

const publishFilterIcons = game => game.hasIcon;

// Just games with videos and logos

const publishFilterVideosAndLogos = ({ hasVideo, hasLogo }) => hasVideo && hasLogo;

module.exports = {
    loadFilterAll,
    loadFilterParents,
    publishFilterAll,
    publishFilterLogos,
    publishFilterVideos,
    publishFilterIcons,
    publishFilterMameArtwork,
    publishFilterVideosAndLogos
};