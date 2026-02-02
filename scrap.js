import fetch from "node-fetch";
import xlsx from "xlsx";

const size = 1000;
const args = process.argv.slice(2);
const field = args.join(" ");
const fieldUnderscore = field.replace(/ /g, "_");
const fileName = "formations_" + fieldUnderscore + ".xlsx";

/**
 * Fetches formations (master's programs) from the MonMaster API.
 * @async
 * @returns {Promise<Array>} Array of formation objects from the API response
 * @throws {Error} If the HTTP request fails or returns a non-OK status
 */
async function fetchFormations() {
    const url = "https://monmaster.gouv.fr/api/candidat/mm1/formations?size=" + size + "&page=0";
    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": "https://monmaster.gouv.fr",
        "Referer": "https://monmaster.gouv.fr/formation?rechercheBrut=" + field,
        "User-Agent": "Mozilla/5.0"
    };
    
    const body = JSON.stringify({
        "recherche": field,
    });

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: body
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data.content; 
    } catch (error) {
        console.error("Error during request:", error);
    }
}

/**
 * Fetches establishment details from the MonMaster API with retry logic.
 * @async
 * @param {string} uai - University identifier (UAI code)
 * @param {string} inm - Mention identifier
 * @param {number} [retries=3] - Number of retry attempts
 * @param {number} [delay=3000] - Delay between retries in milliseconds
 * @returns {Promise<Object|null>} Establishment data or null if all retries fail
 * @throws {Error} If the request fails after all retry attempts
 */
async function fetchEtablissement(uai, inm, retries = 3, delay = 3000) {
    const lienApi = `https://monmaster.gouv.fr/api/candidat/mm1/etablissements/${uai}/mentions/${inm}`;
    for (let attempt = 1; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeout = 4000; // 4 seconds
        const timeoutId = setTimeout(() => controller.abort(), timeout);
    
        try {
            const response = await fetch(lienApi, { signal: controller.signal });
            clearTimeout(timeoutId);
    
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status} - ${response.statusText}`);
            }
    
            const data = await response.json();
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
    
            if (error.name === "AbortError") {
                console.error(`⏳ Timeout reached after ${timeout / 1000} seconds for ${lienApi}`);
            } else {
                console.error(`⚠️ Attempt ${attempt}/${retries} failed for ${lienApi}: ${error.message}`);
            }
    
            if (attempt < retries) {
                console.log(`🕐 Waiting ${delay / 1000} seconds before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`❌ Final failure after ${retries} attempts.`);
                return null;
            }
        }
    }
}

/**
 * Saves fetched formations data to an Excel file.
 * Fetches formations, enriches data with establishment details, and exports to Excel.
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If data fetching or file writing fails
 */
async function saveToExcel() {
    const formations = await fetchFormations();
    if (formations.length === 0) {
        console.log("No formations found.");
        return;
    }

    const dict = {}; 
    const etablissements = new Set();
    const pendingRequests = {};

    const formattedData = await Promise.all(formations.map(async (formation) => {
        let tauxAcces = formation.indicateursAnneeDerniere?.tauxAcces;
        tauxAcces = (typeof tauxAcces === "number") ? tauxAcces * 100 : null;

        if (!etablissements.has(formation.uai)) {
            if (!pendingRequests[formation.uai]) {
                pendingRequests[formation.uai] = fetchEtablissement(formation.uai, formation.inm)
                .then((data) => {
                    dict[formation.uai] = data;
                    etablissements.add(formation.uai);
                    delete pendingRequests[formation.uai];
                    return data;
                })
                .catch((error) => {
                    delete pendingRequests[formation.uai];
                    throw error;
                });
            }
            await pendingRequests[formation.uai];
        }
        
        const lienFicheUrl = `https://monmaster.gouv.fr/formation/${formation.uai}/${formation.ifc}/detail`;
        
        const lienFiche = {
            t: "s",
            v: "Lien Fiche",
            l: { Target: lienFicheUrl }
        };
        
        const lienMonMaster = {
            t: "s",
            v: "Lien MonMaster",
            l: { Target: `https://monmaster.gouv.fr/formation/${formation.uai}/${formation.ifc}/detail` }
        };
        
        return {
            "Ville": formation.lieux.length > 0 ? formation.lieux[0].ville : "N/A",
            "Code Postal": formation.lieux.length > 0 ? formation.lieux[0].codePostal : "N/A",
            "Région": formation.lieux.length > 0 && formation.lieux[0].regionEtDepartement ? formation.lieux[0].regionEtDepartement[0] : "N/A",
            "Département": formation.lieux.length > 0 && formation.lieux[0].regionEtDepartement ? formation.lieux[0].regionEtDepartement[1] : "N/A",
            "Etablissement": formation.lieux.length > 0 ? formation.lieux[0].site : "N/A",
            "Adresse": formation.lieux.length > 0 ? [formation.lieux[0].adresseChamp1, formation.lieux[0].adresseChamp2, formation.lieux[0].adresseChamp3].filter(Boolean).join(", ") : "N/A",
            "Intitulé Mention": formation.intituleMention,
            "Intitulé Parcours": formation.intituleParcours,
            "Modalités d'Enseignement": formation.modalitesEnseignement?.join(", ") || "N/A",
            "Candidatable": formation.candidatable ? "Oui" : "Non",
            "Alternance": formation.alternance ? "Vrai" : "Faux",
            "Formation Mixte": formation.mixte ? "Oui" : "Non",
            "Capacité d'Accueil": formation.col || "N/A",
            "Places Vacantes": formation.pvr || "N/A",
            "Taux d'Accès": tauxAcces,
            "Rang Dernier Appelé": formation.indicateursAnneeDerniere?.rangDernierAppele || "N/A",
            "Nombre de Candidatures Confirmées": formation.indicateursAnneeDerniere?.nbCandidaturesConfirmees || "N/A",
            "Alternance": formation.alternance ? "Vrai" : "Faux",
            "Jury Rectoral": formation.juryRectoral ? "Oui" : "Non",
            "Droits d'Inscription": formation.droitsInscription || "N/A",
            "URL Droits d'Inscription": formation.urlSiteDroitsInscription || "N/A",
            "Commentaire": formation.commentaire || "N/A",
            "M2 Inmps": formation.m2Inmps?.join(", ") || "N/A",
            "Dernière Modification": formation.lastModified || "N/A",
            "IFC": formation.ifc,
            "INM": formation.inm,
            "INMP": formation.inmp,
            "UAI": formation.uai,
            "Lien Fiche": lienFiche, 
            "Lien MonMaster": lienMonMaster
        };
    }));

    // Create Excel worksheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(formattedData);
    
    // Format the "Taux d'Accès" column as numeric
    const headers = Object.keys(formattedData[0]);
    const tauxAccesColIndex = headers.indexOf("Taux d'Accès");
    const tauxAccesCol = xlsx.utils.encode_col(tauxAccesColIndex);

    const range = xlsx.utils.decode_range(worksheet['!ref']);
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
        const cellAddress = tauxAccesCol + (row + 1);
        if (worksheet[cellAddress] && typeof worksheet[cellAddress].v === 'number') {
            worksheet[cellAddress].z = '0.00'; // Format with 2 decimals
            worksheet[cellAddress].t = 'n'; // Numeric type
        }
    }

    // Add worksheet to Excel file
    xlsx.utils.book_append_sheet(workbook, worksheet, "Formations");

    // Write Excel file
    const filePath = `./${fileName}`;
    xlsx.writeFile(workbook, filePath);
    
    console.log(`Excel file created: ${filePath}`);
}

saveToExcel();
