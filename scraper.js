const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function extraerOnces() {
    console.log("🛡️ Iniciando Motor Chakal App...");
    const chakalData = { players: {} };

    try {
        // Apuntamos a la página general de partidos
        const url = 'https://www.futbolfantasy.com/partidos';
        console.log(`📡 Descargando datos de: ${url}`);
        
        // Nos camuflamos como un navegador real avanzado
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
            }
        });

        const $ = cheerio.load(data);
        let jugadoresEncontrados = 0;

        $('.jugador, .player-name, .titular, .suplente, .player').each((i, el) => {
            let nombre = $(el).find('.nombre, .name').text().trim();
            let probTexto = $(el).find('.probabilidad, .prob, .porcentaje').text().trim();
            
            if (!nombre) {
                const textoCompleto = $(el).text().trim();
                const match = textoCompleto.match(/([a-zA-ZáéíóúÁÉÍÓÚñÑ\s-]+)\s*(\d+)%/);
                if (match) {
                    nombre = match[1].trim();
                    probTexto = match[2] + "%";
                }
            }

            if (nombre && probTexto) {
                let probNum = parseInt(probTexto.replace('%', ''), 10);
                let nombreLimpio = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

                chakalData.players[nombreLimpio] = {
                    prob: probNum + "%",
                    titular: probNum >= 60,
                    nombreOriginal: nombre
                };
                jugadoresEncontrados++;
            }
        });

        fs.writeFileSync('lineups.json', JSON.stringify(chakalData, null, 2));
        console.log(`✅ Archivo lineups.json generado.`);
        console.log(`⚽ Total de jugadores extraídos: ${jugadoresEncontrados}`);

    } catch (error) {
        console.error("❌ Error en el motor de extracción:", error.message);
    }
}

extraerOnces();