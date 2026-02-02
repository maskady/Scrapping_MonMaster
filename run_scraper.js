import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const oldExcelFolder = path.join(__dirname, 'old_excel_files');
const disciplines = ['psychologie']

/**
 * Deletes all files in the "old_excel_files" folder.
 * Creates the folder if it doesn't exist.
 * @returns {void}
 */
function cleanOldFiles() {
    if (!fs.existsSync(oldExcelFolder)) {
        fs.mkdirSync(oldExcelFolder); 
    }

    fs.readdirSync(oldExcelFolder).forEach(file => {
        const filePath = path.join(oldExcelFolder, file);
        fs.unlinkSync(filePath);
    });

    console.log('old_excel_files folder cleaned.');
}

/**
 * Moves all .xlsx files from the root directory to the "old_excel_files" folder.
 * @returns {void}
 */
function moveExcelFiles() {
    const rootFiles = fs.readdirSync(__dirname);

    rootFiles.forEach(file => {
        if (file.endsWith('.xlsx')) {
            const oldPath = path.join(__dirname, file);
            const newPath = path.join(oldExcelFolder, file);
            fs.renameSync(oldPath, newPath);
        }
    });

    console.log('Excel files moved to old_excel_files.');
}

/**
 * Executes scrap.js for each discipline in the disciplines array.
 * Runs each scraping process sequentially and waits for completion.
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If the scraping process fails for any discipline
 */
async function runScraping() {
    for (const discipline of disciplines) {
        console.log(`Starting node scrap.js ${discipline}...`);
        await new Promise((resolve, reject) => {
            exec(`node scrap.js ${discipline}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error for ${discipline}:`, error.message);
                    return reject(error);
                }
                if (stderr) {
                    console.error(`Warning for ${discipline}:`, stderr);
                }
                console.log(stdout);
                resolve();
            });
        });
    }

    console.log('All scrapers have been executed.');
}

/**
 * Main execution function.
 * Cleans old files, moves existing Excel files, and runs the scraping process.
 * @async
 * @returns {Promise<void>}
 */
(async () => {
    cleanOldFiles();
    moveExcelFiles();
    await runScraping();
})();
