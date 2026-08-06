const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

function normalizar(texto) {
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

async function extraerOnces() {
    let datosGlobales = {
        actualizado: new Date().toISOString(),
        players: {}
    };

    console.log("⏳ Buscando equipos actualizados en FútbolFantasy...");

    try {
        // 1. Obtener la lista de equipos dinámica
        let resLista = await axios.get('https://www.futbolfantasy.com/laliga/equipos', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        let $ = cheerio.load(resLista.data);
        let slugs = new Set();
        
        $('a[href^="/laliga/equipos/"]').each((_, el) => {
            let href = $(el).attr('href');
            let parts = href.split('/');
            let slug = parts[parts.length - 1];
            if (slug && slug !== 'equipos') slugs.add(slug);
        });

        let equipos = Array.from(slugs);
        console.log(`✅ ${equipos.length} equipos detectados: ${equipos.join(', ')}`);

        // 2. Extraer jugadores de cada equipo
        for (let equipo of equipos) {
            try {
                let url = `https://www.futbolfantasy.com/laliga/equipos/${equipo}`;
                let respuesta = await axios.get(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                let $eq = cheerio.load(respuesta.data);

                $eq('.camiseta-wrapper').each((_, element) => {
                    let nombreAttr = $eq(element).attr('data-nombre');
                    let probAttr = $eq(element).attr('data-probabilidad');

                    if (!nombreAttr) {
                        let spanNombre = $eq(element).find('.nombre, .truncate-name').first().text().trim();
                        if (spanNombre) nombreAttr = spanNombre;
                    }

                    if (!probAttr) {
                        let spanProb = $eq(element).find('[class*="prob-"]').first().text().trim();
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
                console.log(`✅ Procesado: ${equipo}`);
            } catch (err) {
                console.error(`❌ Error en ${equipo}:`, err.message);
            }
        }

        fs.writeFileSync('lineups.json', JSON.stringify(datosGlobales, null, 2), 'utf8');
        console.log("\n🎉 ¡Archivo generado con todos los equipos reales!");

    } catch (error) {
        console.error("❌ Error al obtener los equipos:", error.message);
    }
}

extraerOnces();