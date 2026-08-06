const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function extraerOnces() {
    console.log("🛡️ Iniciando Motor Chakal App...");
    const chakalData = { players: {} };

    try {
        // En los próximos pasos cambiaremos esto para extraer el HTML real de FútbolFantasy
        // y mapear sus nombres con los IDs de Biwenger.
        chakalData.players["99999"] = {
            prob: "90%",
            titular: true
        };

        // Guardamos el resultado
        fs.writeFileSync('lineups.json', JSON.stringify(chakalData, null, 2));
        console.log("✅ Archivo lineups.json generado con éxito.");

    } catch (error) {
        console.error("❌ Error en el motor de extracción:", error.message);
    }
}

extraerOnces();