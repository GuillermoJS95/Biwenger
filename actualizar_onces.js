const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

function normalizar(texto) {
    let sinSimbolos = texto.replace(/[^\p{L}\p{N}\s]/gu, '');
    return sinSimbolos.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function extraerOnces() {
    // Añadimos "matches" para guardar el calendario de cada equipo
    let datosGlobales = { actualizado: new Date().toISOString(), players: {}, matches: {} };
    console.log("⏳ Extrayendo onces y próximos partidos...");

    const equipos = [
        'alaves', 'athletic', 'atletico', 'barcelona', 'betis', 'celta', 'deportivo', 
        'elche', 'espanyol', 'getafe', 'levante', 'malaga', 'osasuna', 'racing', 
        'rayo-vallecano', 'real-madrid', 'real-sociedad', 'sevilla', 'valencia', 'villarreal'
    ];

    let totalJugadores = 0;

    for (let equipo of equipos) {
        let url = `https://www.futbolfantasy.com/laliga/equipos/${equipo}`;
        try {
            let respuesta = await axios.get(url, { 
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
            });
            let $ = cheerio.load(respuesta.data);
            let contador = 0;

            // 1. EXTRAER PRÓXIMO PARTIDO (Tu HTML)
            let matchSpans = $('.ts-control .item span');
            if (matchSpans.length >= 2) {
                let homeTeam = $(matchSpans[0]).text().trim();
                let awayTeam = $(matchSpans[1]).text().trim();
                let isHome = true;
                let opponent = awayTeam;
                
                // Comprobamos si nuestro equipo es el visitante comparando las letras
                let eqNorm = equipo.replace(/-/g, '');
                let awayNorm = normalizar(awayTeam).replace(/ /g, '');
                if (awayNorm.length > 3 && eqNorm.includes(awayNorm.substring(0, 4))) {
                    isHome = false;
                    opponent = homeTeam;
                }
                
                datosGlobales.matches[equipo] = { opponent: opponent, isHome: isHome };
            }

            // 2. EXTRAER JUGADORES
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
                            // Asignamos el equipo a cada jugador para poder saber qué partido juega
                            datosGlobales.players[nombreLimpio] = { prob: `${probNum}%`, team: equipo };
                            contador++;
                        }
                    }
                });
            });

            console.log(`✅ ${equipo}: ${contador} jugadores. Rival: ${datosGlobales.matches[equipo] ? datosGlobales.matches[equipo].opponent : 'S.D.'}`);
            totalJugadores += contador;
            await delay(400); 
        } catch (e) {
            console.error(`❌ Error en equipo ${equipo}: ${e.message}`);
        }
    }

    fs.writeFileSync('lineups.json', JSON.stringify(datosGlobales, null, 2), 'utf8');
    console.log(`\n🎉 ¡Archivo generado con éxito! Total de registros: ${totalJugadores}`);
}

extraerOnces();