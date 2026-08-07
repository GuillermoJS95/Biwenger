const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

function normalizar(texto) {
    let sinSimbolos = texto.replace(/[^\p{L}\p{N}\s]/gu, '');
    return sinSimbolos.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Diccionario para traducir el nombre de FútbolFantasy a nuestro ID de equipo
function mapearEquipo(nombreFantasia) {
    const mapa = {
        'alaves': 'alaves', 'athletic': 'athletic', 'atletico': 'atletico', 'barcelona': 'barcelona',
        'betis': 'betis', 'celta': 'celta', 'deportivo': 'deportivo', 'elche': 'elche',
        'espanyol': 'espanyol', 'getafe': 'getafe', 'levante': 'levante', 'malaga': 'malaga',
        'osasuna': 'osasuna', 'racing': 'racing', 'rayo': 'rayo-vallecano', 'real madrid': 'real-madrid',
        'real sociedad': 'real-sociedad', 'sevilla': 'sevilla', 'valencia': 'valencia', 'villarreal': 'villarreal'
    };
    return mapa[normalizar(nombreFantasia)] || null;
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function extraerOnces() {
    let datosGlobales = { actualizado: new Date().toISOString(), players: {}, matches: {} };
    
    console.log("⏳ Extrayendo calendario global de la jornada...");
    try {
        let resMatches = await axios.get('https://www.futbolfantasy.com/laliga/posibles-alineaciones', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        let $m = cheerio.load(resMatches.data);
        
        // Recorremos todos los partidos de la vista general
        $m('.partido').each((i, el) => {
            let local = $m(el).find('.escudo.local').attr('alt');
            let visitante = $m(el).find('.escudo.visitante').attr('alt');
            
            if(local && visitante) {
                let keyLocal = mapearEquipo(local);
                let keyVisitante = mapearEquipo(visitante);
                
                if(keyLocal) datosGlobales.matches[keyLocal] = { opponent: visitante, isHome: true };
                if(keyVisitante) datosGlobales.matches[keyVisitante] = { opponent: local, isHome: false };
            }
        });
        console.log("✅ Calendario extraído correctamente.");
    } catch (e) {
        console.log("⚠️ Error extrayendo calendario:", e.message);
    }

    console.log("\n⏳ Extrayendo jugadores por equipo...");
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
                            // Ahora inyectamos la variable "team" al jugador
                            datosGlobales.players[nombreLimpio] = { prob: `${probNum}%`, team: equipo };
                            contador++;
                        }
                    }
                });
            });

            let rival = datosGlobales.matches[equipo] ? datosGlobales.matches[equipo].opponent : 'S.D.';
            console.log(`✅ ${equipo}: ${contador} jugadores. Rival: ${rival}`);
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