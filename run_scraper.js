const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const oldExcelFolder = path.join(__dirname, 'old_excel_files');
const disciplines = ['psychologie', 'informatique', 'physique', 'mathématiques', 'mécanique des fluides', 'physique marine']

// 1️⃣ Supprimer tous les fichiers dans le dossier "old_excel_files"
function cleanOldFiles() {
    if (!fs.existsSync(oldExcelFolder)) {
        fs.mkdirSync(oldExcelFolder); 
    }

    fs.readdirSync(oldExcelFolder).forEach(file => {
        const filePath = path.join(oldExcelFolder, file);
        fs.unlinkSync(filePath);
    });

    console.log('✅ Dossier old_excel_files nettoyé.');
}

// 2️⃣ Déplacer tous les fichiers .xlsx de la racine vers "old_excel_files"
function moveExcelFiles() {
    const rootFiles = fs.readdirSync(__dirname);

    rootFiles.forEach(file => {
        if (file.endsWith('.xlsx')) {
            const oldPath = path.join(__dirname, file);
            const newPath = path.join(oldExcelFolder, file);
            fs.renameSync(oldPath, newPath);
        }
    });

    console.log('✅ Fichiers Excel déplacés dans old_excel_files.');
}

// 3️⃣ Exécuter `scrap.js` avec plusieurs disciplines
async function runScraping() {
    for (const discipline of disciplines) {
        console.log(`🚀 Lancement de node scrap.js ${discipline}...`);
        await new Promise((resolve, reject) => {
            exec(`node scrap.js ${discipline}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`❌ Erreur pour ${discipline}:`, error.message);
                    return reject(error);
                }
                if (stderr) {
                    console.error(`⚠️ Avertissement pour ${discipline}:`, stderr);
                }
                console.log(stdout);
                resolve();
            });
        });
    }

    console.log('✅ Tous les scrapers ont été exécutés.');
}

// Exécution du script
(async () => {
    cleanOldFiles();
    moveExcelFiles();
    await runScraping();
})();
