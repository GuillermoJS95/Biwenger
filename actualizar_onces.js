const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

function normalizar(texto) {
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

async function extraerOnces() {
    let datosGlobales = { actualizado: new Date().toISOString(), players: {} };
    console.log("⏳ Buscando equipos uno a uno (incluyendo ascendidos)...");

    // Lista blindada con todos los equipos posibles (adiós errores 404)
    const equipos = [
        'alaves', 'athletic', 'atletico', 'barcelona', 'betis', 'celta', 'deportivo', 
        'espanyol', 'getafe', 'girona', 'las-palmas', 'leganes', 'mallorca', 'osasuna', 
        'rayo', 'real-madrid', 'real-sociedad', 'sevilla', 'valencia', 'valladolid', 'villarreal'
    ];

    let procesados = 0;

    for (let equipo of equipos) {
        let exito = false;
        
        // El script probará ambas rutas por si FútbolFantasy cambia la URL
        let urlsAProbar = [
            `https://www.futbolfantasy.com/laliga/equipos/${equipo}`,
            `https://www.futbolfantasy.com/equipos/${equipo}`
        ];

        for (let url of urlsAProbar) {
            if (exito) break;
            try {
                let respuesta = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                let $ = cheerio.load(respuesta.data);
                let contador = 0;

                $('.camiseta-wrapper').each((_, element) => {
                    let nombre = $(element).attr('data-nombre') || $(element).find('.nombre, .truncate-name').first().text().trim();
                    let prob = $(element).attr('data-probabilidad') || $(element).find('[class*="prob-"]').first().text().trim();

                    if (nombre && prob) {
                        datosGlobales.players[normalizar(nombre)] = { prob: `${parseInt(prob.replace('%', '')) || 0}%` };
                        contador++;
                    }
                });

                if (contador > 0) {
                    console.log(`✅ Procesado: ${equipo} (${contador} jugadores)`);
                    procesados++;
                    exito = true;
                }
            } catch (e) {
                // Ignoramos el 404 de la primera ruta y probamos la segunda en silencio
            }
        }
    }

    fs.writeFileSync('lineups.json', JSON.stringify(datosGlobales, null, 2), 'utf8');
    console.log(`\n🎉 ¡Completado! ${procesados} equipos añadidos al archivo (Depor incluido).`);
}

extraerOnces();