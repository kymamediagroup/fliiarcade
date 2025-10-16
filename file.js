const { readdirSync, readFileSync, statSync, unlinkSync } = require('fs');
const { join, extname } = require('path');

function deleteFiles(directoryPath, extension) {
    try {
        const files = readdirSync(directoryPath);

        for (const file of files) {
            const filePath = join(directoryPath, file);
            const stats = statSync(filePath);

            if (stats.isFile() && extname(file) == '.' + extension) {
                unlinkSync(filePath);
            }
        }

        return true;
    } catch (err) {
        console.error(err);

        return false;
    }
}

function getAllFilePaths(dirPath, extensions = ['html'], recursive = true) {
    let htmlFiles = [];

    try {
        // Read all items in the directory with their file type info synchronously

        const items = readdirSync(dirPath, { withFileTypes: true });

        for (const item of items) {
            const fullPath = join(dirPath, item.name);

            if (item.isDirectory()) {
                // If it's a directory, recursively call the function and add the results

                if (recursive) {
                    htmlFiles = htmlFiles.concat(getAllFilePaths(fullPath, extensions, true));
                }
            } else if (item.isFile() && extensions.includes(extname(item.name).toLowerCase().replace(/^\./, ''))) {
                // If it's an HTML file, add its path to the array

                htmlFiles.push(fullPath);
            }
        }
    } catch (err) {
        console.error(`Error reading directory ${dirPath}:`, err);
    }

    return htmlFiles;
}

function getAllFileNames(dirPath, extensions = ['html'], includeExtensions = true, recursive = true) {
    let files = [];

    try {
        // Read all items in the directory with their file type info synchronously

        const items = readdirSync(dirPath, { withFileTypes: true });

        for (const item of items) {
            const { name } = item;

            if (item.isDirectory()) {
                // If it's a directory, recursively call the function and add the results

                if (recursive) {
                    files = files.concat(getAllFileNames(name, extensions, includeExtensions, true));
                }
            } else if (item.isFile() && (extensions.includes('*') || extensions.includes(extname(name).toLowerCase().replace(/^\./, '')))) {
                // If it's a file of the indicated type, add its path to the array

                if (includeExtensions) {
                    files.push(name);
                } else {
                    files.push(name.replace(/\.[^.]*$/, ''));
                }
            }
        }
    } catch (err) {
        console.error(`Error reading directory ${dirPath}:`, err);
    }

    return files;
}

function getAllImageNames(dirPath, extensions = ['png', 'gif'], includeExtensions = true, recursive = true) {
    return getAllFileNames(dirPath, extensions, includeExtensions, recursive);
}

function loadTextFile(path) {
    return readFileSync(path).toString();
}

function loadJson(path) {
    return JSON.parse(loadTextFile(path));
}

function loadConfig(name) {
    return loadJson(join('.', `${ name }.json`));
}

module.exports = {
    deleteFiles,
    getAllFilePaths,
    getAllFileNames,
    getAllImageNames,
    loadTextFile,
    loadJson,
    loadConfig
};