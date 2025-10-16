const { readdirSync, readFileSync, statSync } = require('fs');
const { join } = require('path');

// These MAME games have no files to reference on Internet Archive (or anywhere?), so will be skipped

const undiscoveredAssemblies = ['ace', 'carpolo', 'clayshoo', 'cybsled', 'ddrdismx', 'ddrstraw', 'primrage', 'tmek'];

// MAME-based software consumers For future expansion

// TODO: Put this stuff in mame.json

const mameSoftwareSystems = {
    // Computers

    'c64': {
        name: 'Commodore 64',
        mediaTypes: {
            cart: {
                extensions: ['crt']
            }
        },
        resolution: [418, 235]

        // NOTE: This one does not need to specify the BIOS
    },
    'coco3': {
        name: 'Tandy Color Computer',
        mediaTypes: {
            flop: {
                extensions: ['dsk']
            }
        },
        resolution: [320, 200],
        cloneOf: 'coco'
    },
    'apple2c': {
        name: 'Apple II',
        mediaTypes: {
            flop: {
                extensions: ['dsk']
            }
        },
        resolution: [560, 192],
        cloneOf: 'apple2'

        // NOTE: This one does not need to specify the BIOS
    },

    // Consoles

    'astrocde': {
        name: 'Bally Astrocade',
        mediaTypes: {
            cart: {
                extensions: ['bin']
            }
        },
        resolution: [160, 102]
    },
    'vectrex': {
        name: 'GCE Vectrex',
        mediaTypes: {
            cart: {
                extensions: ['vec']
            }
        },
        resolution: [480, 640]
    },
    'a2600': {
        name: 'Atari 2600',
        mediaTypes: {
            cart: {
                extensions: ['a26']
            }
        },
        resolution: [160, 192]

        // NOTE: This one does NOT have a machine or BIOS file (all included in MAME)
    },
    'a5200': {
        name: 'Atari 5200',
        mediaTypes: {
            cart: {
                extensions: ['a52']
            }
        },
        resolution: [336, 225]
    },
    'a7800': {
        name: 'Atari 7800',
        mediaTypes: {
            cart: {
                extensions: ['a78']
            }
        },
        resolution: [320, 224]
    },
    'nes': {
        name: 'Nintendo Entertainment System',
        mediaTypes: {
            cart: {
                extensions: ['nes']
            }
        },
        resolution: [256, 240]
    },
    'snes': {
        name: 'Super Nintendo Entertainment System',
        mediaTypes: {
            cart: {
                extensions: ['nes']
            }
        },
        resolution: [256, 240]
    },
    'genesis': {
        name: 'Sega Genesis',
        mediaTypes: {
            cart: {
                extensions: ['bin']
            }
        },
        resolution: [320, 224]
    }
};

function loadMame() {
    return readFileSync(join('.', 'mame.json')).toString();
}

function loadMameVersions() {
    return readdirSync(join('.', 'mame', 'roms')).filter(item => statSync(join('.', 'mame', 'roms', item)).isDirectory());
}

module.exports = {
    loadMame,
    loadMameVersions,
    mameSoftwareSystems,
    undiscoveredAssemblies
};