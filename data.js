const { join } = require('path');
const { readFileSync, readdirSync, statSync } = require('fs');

function loadGames(directoryPath) {
    const dataArray = [];

    try {
        // Read all files and folders in the specified directory

        const files = readdirSync(directoryPath);

        // Loop through each file found

        for (const file of files) {
            // Construct the full path to the file

            const filePath = join(directoryPath, file);

            // Check if the item is a file and ends with .json

            if (statSync(filePath).isFile() && file.endsWith('.json')) {
                try {
                    // Read the file content as a UTF-8 string

                    const fileContent = readFileSync(filePath, 'utf8').toString();

                    const game = JSON.parse(fileContent);

                    game.genres = getGenres(game);

                    dataArray.push(game);
                } catch (error) {
                    console.error(`Error reading or parsing file: ${ file }`, error);
                }
            }
        }
    } catch (dirError) {
        console.error(dirError);
    }

    return dataArray;
}

function loadGamesFromDatabase(name) {
    return loadGames(join('.', 'databases', name));
}

function getGenres(game) {
    // Fix bugs in DosBox DB export

    return game.genre.split('/').map(genre => genre.replace('][', '').replace('!', ''));
}

module.exports = {
    loadGames,
    loadGamesFromDatabase
};