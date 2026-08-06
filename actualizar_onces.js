const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

function normalizar(texto) {
    let sinSimbolos = texto.replace(/[^\p{L}\p{N}\s]/gu, '');
    return sinSimbolos.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function extraerOnces() {
    let datosGlobales = { actualizado: new Date().toISOString(), players: {} };
    console.log("⏳ Extrayendo onces con tu lista EXACTA de equipos...");

    // Tu lista definitiva, sin inventos míos
    const equipos = [
        'alaves', 'athletic', 'atletico', 'barcelona', 'betis', 'celta', 'deportivo', 
        'elche', 'espanyol', 'getafe', 'levante', 'malaga', 'osasuna', 'racing', 
        'rayo-vallecano', 'real-madrid', 'real-sociedad', 'sevilla', 'valencia', 'villarreal'
    ];

    let totalJugadores = 0;

    for (let equipo of equipos) {
        // Usamos directamente la estructura de URL que me has pasado
        let url = `https://www.futbolfantasy.com/laliga/equipos/${equipo}`;
        
        try {
            let respuesta = await axios.get(url, { 
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
            });
            let $ = cheerio.load(respuesta.data);
            let contador = 0;

            $('.camiseta-wrapper, [data-nombre], .player-row').each((_, element) => {
                let prob = $(element).attr('data-probabilidad') || $(element).find('[class*="prob-"], .prob').first().text().trim();
                let probNum = parseInt(prob.replace('%', ''), 10);
                
                if (isNaN(probNum)) return;

                let nombresRaw = [];
                let nombreDirecto = $(element).attr('data-nombre');
                
                if (nombreDirecto) {
                    nombresRaw.push(nombreDirecto);
                } else {
                    $(element).find('.nombre, .jugador, .truncate-name').each((i, el) => {
                        let innerHtml = $(el).html() || '';
                        let textConSeparador = innerHtml.replace(/<br\s*[\/]?>/gi, " | ");
                        let textLimpioHTML = cheerio.load(textConSeparador).text();
                        textLimpioHTML.split('|').forEach(n => nombresRaw.push(n.trim()));
                    });
                }

                nombresRaw.forEach(nombre => {
                    let nombreLimpio = normalizar(nombre);
                    if (nombreLimpio.length > 2 && !nombreLimpio.includes('%')) {
                        let probActual = datosGlobales.players[nombreLimpio] ? parseInt(datosGlobales.players[nombreLimpio].prob) : 0;
                        if (probNum > probActual) {
                            datosGlobales.players[nombreLimpio] = { prob: `${probNum}%` };
                            contador++;
                        }
                    }
                });
            });

            if (contador > 0) {
                console.log(`✅ ${equipo}: ${contador} jugadores encontrados.`);
                totalJugadores += contador;
            } else {
                console.log(`⚠️ ${equipo}: Revisar estructura (0 encontrados).`);
            }

        } catch (e) {
            console.error(`❌ Error en equipo ${equipo}: ${e.message}`);
        }

        // Freno de medio segundo para que la web no nos bloquee
        await delay(500); 
    }

    fs.writeFileSync('lineups.json', JSON.stringify(datosGlobales, null, 2), 'utf8');
    console.log(`\n🎉 ¡Archivo generado con éxito! Total de registros: ${totalJugadores}`);
}

extraerOnces();