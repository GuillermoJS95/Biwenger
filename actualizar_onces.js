const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const equipos = [
    'athletic', 'atletico', 'barcelona', 'betis', 'celta', 'espanyol',
    'getafe', 'real-madrid', 'real-sociedad', 'sevilla', 'valencia',
    'valladolid', 'villarreal', 'alaves', 'osasuna', 'mallorca',
    'leganes', 'las-palmas', 'rayo-vallecano', 'girona'
];

function normalizar(texto) {
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

async function extraerOnces() {
    let datosGlobales = {
        actualizado: new Date().toISOString(),
        players: {}
    };

    console.log("⏳ Descargando onces probables de FútbolFantasy con estructura real...");

    for (let equipo of equipos) {
        try {
            let url = `https://www.futbolfantasy.com/laliga/equipos/${equipo}`;
            let respuesta = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            let $ = cheerio.load(respuesta.data);

            // Cada jugador en el campo viene envuelto en un div con la clase camiseta-wrapper
            $('.camiseta-wrapper').each((_, element) => {
                let nombreAttr = $(element).attr('data-nombre');
                let probAttr = $(element).attr('data-probabilidad');

                // Si no los coge de los atributos, los busca en los textos internos de la tarjeta
                if (!nombreAttr) {
                    let spanNombre = $(element).find('.nombre, .truncate-name').first().text().trim();
                    if (spanNombre) nombreAttr = spanNombre;
                }

                if (!probAttr) {
                    let spanProb = $(element).find('[class*="prob-"]').first().text().trim();
                    if (spanProb) probAttr = spanProb;
                }

                if (nombreAttr && probAttr) {
                    let nombreLimpio = normalizar(nombreAttr);
                    let probNum = parseInt(probAttr.replace('%', ''), 10) || 0;

                    datosGlobales.players[nombreLimpio] = {
                        titular: probNum >= 60,
                        prob: `${probNum}%`,
                        equipo: equipo
                    };
                }
            });

            console.log(`✅ Procesado equipo con éxito: ${equipo}`);
        } catch (error) {
            console.error(`❌ Error al procesar ${equipo}:`, error.message);
        }
    }

    fs.writeFileSync('lineups.json', JSON.stringify(datosGlobales, null, 2), 'utf8');
    console.log("\n🎉 ¡Archivo 'lineups.json' generado correctamente con los datos de los jugadores!");
}

extraerOnces();