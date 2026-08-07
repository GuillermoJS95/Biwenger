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
    console.log("⏳ Extrayendo jugadores y onces...");

    const equipos = [
        'alaves', 'athletic', 'atletico', 'barcelona', 'betis', 'celta', 'deportivo', 
        'elche', 'espanyol', 'getafe', 'levante', 'malaga', 'osasuna', 'racing', 
        'rayo-vallecano', 'real-madrid', 'real-sociedad', 'sevilla', 'valencia', 'villarreal'
    ];

    let totalJugadores = 0;

    for (let equipo of equipos) {
        let url = `https://www.futbolfantasy.com/laliga/equipos/${equipo}`;
        try {
            let respuesta = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
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
                        let textLimpioHTML = cheerio.load($(el).html().replace(/<br\s*[\/]?>/gi, " | ")).text();
                        textLimpioHTML.split('|').forEach(n => nombresRaw.push(n.trim()));
                    });
                }

                nombresRaw.forEach(nombre => {
                    let nombreLimpio = normalizar(nombre);
                    if (nombreLimpio.length > 2 && !nombreLimpio.includes('%')) {
                        let probActual = datosGlobales.players[nombreLimpio] ? parseInt(datosGlobales.players[nombreLimpio].prob) : 0;
                        if (probNum > probActual) {
                            // Guardamos la probabilidad y la etiqueta de su equipo
                            datosGlobales.players[nombreLimpio] = { prob: `${probNum}%`, team: equipo };
                            contador++;
                        }
                    }
                });
            });

            console.log(`✅ ${equipo}: ${contador} jugadores extraídos.`);
            totalJugadores += contador;
            await delay(400); 
        } catch (e) {
            console.error(`❌ Error en equipo ${equipo}`);
        }
    }

    fs.writeFileSync('lineups.json', JSON.stringify(datosGlobales, null, 2), 'utf8');
    console.log(`\n🎉 ¡Completado! Total de registros: ${totalJugadores}`);
}

extraerOnces();