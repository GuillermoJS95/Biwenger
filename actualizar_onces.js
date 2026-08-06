const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

function normalizar(texto) {
    let sinSimbolos = texto.replace(/[^\p{L}\p{N}\s]/gu, '');
    return sinSimbolos.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Función para pausar el robot medio segundo y evitar bloqueos
const delay = ms => new Promise(res => setTimeout(res, ms));

async function extraerOnces() {
    let datosGlobales = { actualizado: new Date().toISOString(), players: {} };
    console.log("⏳ Buscando equipos (Limpiando emojis y solucionando URLs y bloqueos)...");

    // Hemos añadido las variantes oficiales que usa FútbolFantasy para los que fallaban
    const equipos = [
        'alaves', 'athletic', 'atletico', 'barcelona', 'betis', 'celta', 'deportivo', 
        'espanyol', 'getafe', 'girona', 'las-palmas', 'ud-las-palmas', 'leganes', 'cd-leganes', 
        'mallorca', 'rcd-mallorca', 'osasuna', 'rayo-vallecano', 'real-madrid', 
        'real-sociedad', 'sevilla', 'valencia', 'real-valladolid', 'villarreal'
    ];

    let procesados = [];

    for (let equipo of equipos) {
        let exito = false;
        let urlsAProbar = [
            `https://www.futbolfantasy.com/laliga/equipos/${equipo}`,
            `https://www.futbolfantasy.com/equipos/${equipo}`
        ];

        for (let url of urlsAProbar) {
            if (exito) break;
            try {
                let respuesta = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
                let $ = cheerio.load(respuesta.data);
                let contador = 0;

                $('.camiseta-wrapper').each((_, element) => {
                    let prob = $(element).attr('data-probabilidad') || $(element).find('[class*="prob-"], .prob').first().text().trim();
                    let probNum = parseInt(prob.replace('%', ''), 10);
                    if (isNaN(probNum)) return;

                    let nombresRaw = [];
                    $(element).find('.nombre, .jugador').each((i, el) => {
                        let innerHtml = $(el).html() || '';
                        let textConSeparador = innerHtml.replace(/<br\s*[\/]?>/gi, " | ");
                        let textLimpioHTML = cheerio.load(textConSeparador).text();
                        textLimpioHTML.split('|').forEach(n => nombresRaw.push(n.trim()));
                    });

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
                    console.log(`✅ Procesado: ${equipo} (${contador} jugadores detectados)`);
                    procesados.push(equipo);
                    exito = true;
                }
            } catch (e) {
                // Silencioso para intentar la siguiente variante
            }
        }
        // Dormimos al robot 0.5 segundos para que la web no lo bloquee por ir muy rápido
        if(exito) await delay(500); 
    }

    fs.writeFileSync('lineups.json', JSON.stringify(datosGlobales, null, 2), 'utf8');
    console.log(`\n🎉 ¡Completado! ${procesados.length} equipos extraídos de forma segura.`);
}

extraerOnces();