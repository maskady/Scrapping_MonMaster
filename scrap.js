import fetch from "node-fetch";
import xlsx from "xlsx";

const size = 1000;
const args = process.argv.slice(2);
const field = args.join(" ");
const fieldUnderscore = field.replace(/ /g, "_");
const fileName = "formations_" + fieldUnderscore + ".xlsx";

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
        console.error("Erreur lors de la requête :", error);
    }
}

async function fetchEtablissement(uai, inm, retries = 3, delay = 3000) {
    const lienApi = `https://monmaster.gouv.fr/api/candidat/mm1/etablissements/${uai}/mentions/${inm}`;
    for (let attempt = 1; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeout = 4000; // 4 secondes
        const timeoutId = setTimeout(() => controller.abort(), timeout); // Déclenche l'annulation après `timeout` ms
    
        try {
            const response = await fetch(lienApi, { signal: controller.signal });
            clearTimeout(timeoutId); // Annule le timeout si la requête réussit
    
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status} - ${response.statusText}`);
            }
    
            const data = await response.json();
            return data;
        } catch (error) {
            clearTimeout(timeoutId); // Assurez-vous d'annuler le timeout même en cas d'erreur
    
            if (error.name === "AbortError") {
                console.error(`⏳ Timeout atteint après ${timeout / 1000} secondes pour ${lienApi}`);
            } else {
                console.error(`⚠️ Tentative ${attempt}/${retries} échouée pour ${lienApi}: ${error.message}`);
            }
    
            if (attempt < retries) {
                console.log(`🕐 Attente de ${delay / 1000} secondes avant la prochaine tentative...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`❌ Échec final après ${retries} tentatives.`);
                return null; // Retourne `null` en cas d'échec total pour éviter un crash
            }
        }
    }
    
}



async function saveToExcel() {
    const formations = await fetchFormations();
    if (formations.length === 0) {
        console.log("Aucune formation trouvée.");
        return;
    }

    const dict = {}; 
    const etablissements = new Set();
    const pendingRequests = {};

    const formattedData = await Promise.all(formations.map(async (formation) => {
        let tauxAcces = formation.indicateursAnneeDerniere?.tauxAcces;
        tauxAcces = (typeof tauxAcces === "number") ? (tauxAcces * 100).toFixed(2) + "%" : "N/A";

        if (!etablissements.has(formation.uai)) {
            if (!pendingRequests[formation.uai]) {
                pendingRequests[formation.uai] = fetchEtablissement(formation.uai, formation.inm)
                .then((data) => {
                    dict[formation.uai] = data;
                    etablissements.add(formation.uai); // Marque l'établissement comme traité
                    delete pendingRequests[formation.uai]; // Supprime la requête en attente
                    return data;
                })
                .catch((error) => {
                    delete pendingRequests[formation.uai]; // Nettoie même en cas d'erreur
                    throw error;
                });
            }
            await pendingRequests[formation.uai];
        }
        const lienFormation = dict[formation.uai]?.s1Parcours?.map(parcours => {
            if (formation.inmp === parcours.inmp) {
                return parcours.lienFiche;
            }
        }).filter(Boolean) || [];

        if (lienFormation.length === 0) {
            lienFormation.push(dict[formation.uai]?.lienFiche);
        }

        let lienFiche = {
            t: "s",
            v: "Lien Fiche",
            l: { Target: lienFormation[0] || "" } // Prend le premier lien s'il existe
        };

        if (lienFormation.length === 0) {
            lienFiche = "N/A";
        }
        
        const lienMonMaster = {
            t: "s",
            v: "Lien MonMaster",
            l: { Target: `https://monmaster.gouv.fr/formation/${formation.uai}/${formation.ifc}/detail` }
        };
        

        return {
            "Ville": formation.lieux.length > 0 ? formation.lieux[0].ville : "N/A",
            "Etablissement": formation.lieux.length > 0 ? formation.lieux[0].site : "N/A",
            "Intitulé Mention": formation.intituleMention,
            "Intitulé Parcours": formation.intituleParcours,
            "Taux d'Accès": tauxAcces,
            "Rang Dernier Appelé": formation.indicateursAnneeDerniere?.rangDernierAppele || "N/A",
            "Nombre de Candidatures Confirmées": formation.indicateursAnneeDerniere?.nbCandidaturesConfirmees || "N/A",
            "Alternance": formation.alternance ? "Vrai" : "Faux",
            "Lien Fiche": lienFiche, 
            "Lien MonMaster": lienMonMaster
        };
    }));

    // Création d'une feuille Excel
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(formattedData);

    // Ajout de la feuille au fichier Excel
    xlsx.utils.book_append_sheet(workbook, worksheet, "Formations");

    // Écriture du fichier Excel
    const filePath = `./${fileName}`;
    xlsx.writeFile(workbook, filePath);
    
    console.log(`Fichier Excel créé : ${filePath}`);
}

saveToExcel();
