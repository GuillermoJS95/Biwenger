const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// Diccionario: Key de tu JSON -> ID de escudo oficial de Biwenger
const TEAM_IDS = {
    'alaves': 91, 'athletic': 1, 'atletico': 2, 'barcelona': 3, 'betis': 87,
    'celta': 5, 'deportivo': 6, 'elche': 75, 'espanyol': 7, 'getafe': 8,
    'levante': 10, 'malaga': 65, 'osasuna': 93, 'racing': 812, 'rayo-vallecano': 70,
    'real-madrid': 15, 'real-sociedad': 13, 'sevilla': 17, 'valencia': 18, 'villarreal': 19
};

// Calendario de Jornada 1 (Key: ID del equipo, Valor: {opponent, oppId, isHome})
const CALENDARIO = {
    "91": { oppName: "Getafe", oppId: 8, isHome: true },
    "8":  { oppName: "Alavés", oppId: 91, isHome: false },
    "17": { oppName: "Rayo Vallecano", oppId: 70, isHome: true },
    "70": { oppName: "Sevilla", oppId: 17, isHome: false },
    "812":{ oppName: "Villarreal", oppId: 19, isHome: true },
    "19": { oppName: "Racing", oppId: 812, isHome: false },
    "7":  { oppName: "Levante", oppId: 10, isHome: true },
    "10": { oppName: "Espanyol", oppId: 7, isHome: false },
    "5":  { oppName: "Osasuna", oppId: 93, isHome: true },
    "93": { oppName: "Celta", oppId: 5, isHome: false },
    "6":  { oppName: "Elche", oppId: 75, isHome: true },
    "75": { oppName: "Deportivo", oppId: 6, isHome: false },
    "2":  { oppName: "Málaga", oppId: 65, isHome: true },
    "65": { oppName: "Atlético", oppId: 2, isHome: false },
    "18": { oppName: "Betis", oppId: 87, isHome: true },
    "87": { oppName: "Valencia", oppId: 18, isHome: false },
    "15": { oppName: "Real Sociedad", oppId: 13, isHome: true },
    "13": { oppName: "Real Madrid", oppId: 15, isHome: false },
    "3":  { oppName: "Athletic", oppId: 1, isHome: true },
    "1":  { oppName: "Barcelona", oppId: 3, isHome: false }
};

function normalizar(texto) {
    let sinSimbolos = texto.replace(/[^\p{L}\p{N}\s]/gu, '');
    return sinSimbolos.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function extraerOnces() {
    let datosGlobales = { 
        actualizado: new Date().toISOString(), 
        players: {}, 
        matches: CALENDARIO,
        teamIds: TEAM_IDS
    };

    console.log("⏳ Extrayendo jugadores...");

    const equipos = Object.keys(TEAM_IDS);

    for (let equipo of equipos) {
        let url = `https://www.futbolfantasy.com/laliga/equipos/${equipo}`;
        try {
            let respuesta = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            let $ = cheerio.load(respuesta.data);
            
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
                        // Guardamos team como el ID numérico del escudo para cruzarlo directo con el calendario
                        datosGlobales.players[nombreLimpio] = { 
                            prob: `${probNum}%`, 
                            teamId: TEAM_IDS[equipo] 
                        };
                    }
                });
            });

            console.log(`✅ ${equipo} procesado.`);
            await delay(400); 
        } catch (e) {
            console.error(`❌ Error en equipo ${equipo}`);
        }
    }

    fs.writeFileSync('lineups.json', JSON.stringify(datosGlobales, null, 2), 'utf8');
    console.log(`\n🎉 ¡Archivo JSON generado con calendario integrado!`);
}

extraerOnces();