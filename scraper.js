const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function extraerOnces() {
    console.log("🛡️ Iniciando Motor Chakal App...");
    const chakalData = { players: {} };

    try {
        const url = 'https://www.futbolfantasy.com/laliga/alineaciones-probables';
        console.log(`📡 Descargando datos de: ${url}`);
        
        // Nos hacemos pasar por un navegador real para que no nos bloqueen
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        let jugadoresEncontrados = 0;

        // Buscamos todos los elementos que contengan a los jugadores en la web
        // (Buscamos clases genéricas que suelen usar como .jugador, .player, .name...)
        $('.jugador, .player-name, .titular, .suplente, .player').each((i, el) => {
            
            // Extraemos el texto del nombre y el porcentaje
            let nombre = $(el).find('.nombre, .name').text().trim();
            let probTexto = $(el).find('.probabilidad, .prob, .porcentaje').text().trim();
            
            // Si el HTML no tiene esa estructura exacta, intentamos extraer del texto completo del elemento
            if (!nombre) {
                const textoCompleto = $(el).text().trim();
                // A veces el texto es "Vinícius 90%"
                const match = textoCompleto.match(/([a-zA-ZáéíóúÁÉÍÓÚñÑ\s-]+)\s*(\d+)%/);
                if (match) {
                    nombre = match[1].trim();
                    probTexto = match[2] + "%";
                }
            }

            if (nombre && probTexto) {
                let probNum = parseInt(probTexto.replace('%', ''), 10);
                
                // Normalizamos el nombre: minúsculas y sin tildes para cruzarlo con Biwenger
                let nombreLimpio = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

                chakalData.players[nombreLimpio] = {
                    prob: probNum + "%",
                    titular: probNum >= 60,
                    nombreOriginal: nombre
                };
                jugadoresEncontrados++;
            }
        });

        // Guardamos el resultado en el archivo json
        fs.writeFileSync('lineups.json', JSON.stringify(chakalData, null, 2));
        console.log(`✅ Archivo lineups.json generado.`);
        console.log(`⚽ Total de jugadores extraídos: ${jugadoresEncontrados}`);

    } catch (error) {
        console.error("❌ Error en el motor de extracción:", error.message);
    }
}

extraerOnces();