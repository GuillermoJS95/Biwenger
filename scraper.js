const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function extraerOnces() {
    console.log("🛡️ Iniciando Motor Chakal App...");
    const chakalData = { players: {} };

    try {
        // La URL exacta de la sección de onces de LaLiga
        const url = 'https://www.futbolfantasy.com/laliga/alineaciones';
        console.log(`📡 Descargando datos de: ${url}`);
        
        // Nos camuflamos al máximo haciéndonos pasar por un usuario que viene desde Google
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                'Referer': 'https://www.google.com/'
            }
        });

        const $ = cheerio.load(data);
        let jugadoresEncontrados = 0;

        // FútbolFantasy suele usar estas clases para las tarjetas de los jugadores
        $('.player, .jugador, .player-name').each((i, el) => {
            let nombre = $(el).find('.name, .nombre').text().trim();
            let probTexto = $(el).find('.prob, .probabilidad, .porcentaje').text().trim();
            
            // Plan B: Extraer por fuerza bruta usando expresiones regulares si ocultan las clases
            if (!nombre) {
                const textoCompleto = $(el).text().trim();
                // Busca un patrón tipo: "Vinícius 90%"
                const match = textoCompleto.match(/([a-zA-ZáéíóúÁÉÍÓÚñÑ\s-]+?)\s*(\d{1,3})%/);
                if (match) {
                    nombre = match[1].trim();
                    probTexto = match[2] + "%";
                }
            }

            if (nombre && probTexto) {
                let probNum = parseInt(probTexto.replace('%', ''), 10);
                
                // Normalización de nivel profesional para que coincida con Biwenger
                let nombreLimpio = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

                chakalData.players[nombreLimpio] = {
                    prob: probNum, // Lo guardamos como número para poder hacer matemáticas luego
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