# Flii Arcade #

## Introduction ##

Building this project results in a set of Web documents and supporting files for games in a specified "database" (directory full of JSON files).

The resulting documents emulate the game, as well as providing additional information and related media (e.g. preview videos, logos).

## Inputs ##

### Databases ###

Specify the database by name, which references a directory in the ```databases``` directory.

Each JSON file in directory represents a single game.

For example, the following JSON represents Street Fighter II on MAME:

```
{
    "name":"sf2",
    "description":"Street Fighter II: The World Warrior (World 910522)",
    "system":"MAME",
    "players":2,
    "parentSystem":"cps1",
    "roms":["sf2"],
    "numberOfButtons":6,
    "buttonLabels":["Light Punch","Middle Punch","Heavy Punch","Light Kick","Middle Kick","Heavy Kick"],
    "alternating":false,
    "story":"GET READY TO RUMBLE!\r\n\r\nFrom across the globe comes eight of the wildest fighters the world has ever known. Choose your champion, gather your courage and prepare to battle your opponents in a bare knuckle brawl. Face Ken and his devastating \"Dragon Punch\"! Watch the temperature rise as Dhalsim incinerates you with his mystical Yoga Flame! Hear your spine crack as Zangief smashes you to the pavement with his spinning pile driver! Cover your ears as Guile breaks the sound barrier with the awesome power of the Sonic Boom!\r\n\r\nAnnihilate your competition and claim the right to test your skills against the bone-crushing power of the Grand Masters! Can you survive? Can Anyone?",
    "genre":"Fighter",
    "manufacturer":"Capcom",
    "year":1991,
    "rating":"AAMA - Yellow (Animated Violence Mild)",
    "mature":false",
    "crc":""
}
```

Additionally, an ```externalLocation``` property can be used to load ROM(s) from other servers (e.g. Internet Archive). 😊

For MAME games, this data is enough to generate an Emularity emulation, plus additional information and UI (e.g. button key).

Additional media (e.g. logo, preview video) is included by matching filenames with the game name.

### Templates ###

Templates are in the ```html``` directory.

## Outputs ##

Web documents and supporting files are created in the ```public``` directory, with one document per game. No index document is created at this time, as the documents are intended to be loaded in an ```IFRAME`` element, contained in an app.

## Scripts ##

### Build ###

```npm run build <database> <language> <app name> <default section>```

```npm run build```

```npm run build-arcade-games```

### Start ###

This command starts a local Web server to browse the results.

```npm run start```
