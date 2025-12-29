/**
 * Script para obtener datos meteorológicos de todos los polígonos
 */

import { WeatherService } from '../src/services/weatherService';
import { REAL_POLYGONS } from '../src/config/realPolygons';

const weatherService = new WeatherService();

// Coordenadas aproximadas de centros de polígonos (puedes ajustarlas)
const POLYGON_LOCATIONS: Record<string, { lat: number; lon: number }> = {
    // Autovía A-019 (Villa Carlos Paz - Córdoba)
    'P001': { lat: -31.4167, lon: -64.4833 },
    'P002': { lat: -31.4200, lon: -64.4900 },
    'P056': { lat: -31.4100, lon: -64.4700 },
    'P057': { lat: -31.4250, lon: -64.4950 },
    'P058': { lat: -31.4300, lon: -64.5000 },
    'P060': { lat: -31.4350, lon: -64.5050 },
    'P063': { lat: -31.4400, lon: -64.5100 },
    'P064': { lat: -31.4450, lon: -64.5150 },

    // Ruta Nacional 36 (Córdoba - Río Cuarto)
    'P006': { lat: -32.4000, lon: -63.9000 },
    'P009': { lat: -32.8000, lon: -64.1000 },
    'P010': { lat: -32.5000, lon: -63.9500 },
    'P011': { lat: -32.3000, lon: -63.8500 },
    'P012': { lat: -32.2000, lon: -63.8000 },
    'P023': { lat: -32.6000, lon: -63.9800 },
    'P024': { lat: -32.7000, lon: -64.0500 },
    'P025': { lat: -32.4500, lon: -63.9200 },
    'P026': { lat: -32.8500, lon: -64.1500 },
    'P031': { lat: -31.9500, lon: -63.7500 },
    'P032': { lat: -31.8500, lon: -63.7000 },
    'P033': { lat: -31.7500, lon: -63.6500 },
    'P034': { lat: -31.6500, lon: -63.6000 },
    'P035': { lat: -32.1500, lon: -63.7800 },
    'P037': { lat: -33.0000, lon: -64.2000 },
    'P038': { lat: -33.1000, lon: -64.2500 },
    'P039': { lat: -31.6000, lon: -63.5800 },
    'P040': { lat: -31.7000, lon: -63.6300 },
    'P041': { lat: -31.8000, lon: -63.6800 },
    'P042': { lat: -32.0500, lon: -63.7600 },
    'P043': { lat: -32.1000, lon: -63.7700 },

    // Ruta Nacional 9 (Córdoba - Rosario)
    'P028': { lat: -31.3500, lon: -64.2500 },
    'P029': { lat: -31.3000, lon: -64.2000 },
    'P048': { lat: -31.4500, lon: -64.2800 },
    'P051': { lat: -31.2500, lon: -64.1500 },
    'P052': { lat: -31.2000, lon: -64.1000 },
    'P053': { lat: -31.1500, lon: -64.0500 },
    'P066': { lat: -31.1000, lon: -64.0000 },

    // Ruta Nacional 19
    'P044': { lat: -31.3800, lon: -64.3500 },
    'P045': { lat: -31.3600, lon: -64.3300 },
    'P046': { lat: -31.3400, lon: -64.3100 },
    'P055': { lat: -31.3200, lon: -64.2900 },

    // Rutas Provinciales
    'P003': { lat: -31.4600, lon: -64.3000 }, // E53
    'P050': { lat: -31.4700, lon: -64.3100 }, // E53
    'P004': { lat: -31.3900, lon: -64.5200 }, // E55
    'P005': { lat: -31.3800, lon: -64.5100 }, // E55
    'P020': { lat: -31.3700, lon: -64.5000 }, // E55
    'P021': { lat: -31.3600, lon: -64.4900 }, // E55
    'P022': { lat: -31.3500, lon: -64.4800 }, // E55
    'P007': { lat: -31.5000, lon: -64.3500 }, // C45
    'P008': { lat: -31.5100, lon: -64.3600 }, // C45
    'P016': { lat: -31.3000, lon: -64.4500 }, // RP 5
    'P017': { lat: -31.3100, lon: -64.4600 }, // RP 5
    'P018': { lat: -31.3200, lon: -64.4700 }, // RP 5
    'P019': { lat: -31.3300, lon: -64.4800 }, // RP 5

    // Área Capital y urbanas
    'P047': { lat: -31.4200, lon: -64.1900 }, // APC
    'P054': { lat: -31.4100, lon: -64.2000 }, // Luchesse
    'P061': { lat: -31.4000, lon: -64.2100 }, // Luchesse
    'P059': { lat: -31.4300, lon: -64.1800 }, // Anillo
    'P062': { lat: -31.4400, lon: -64.1700 }, // AJC
    'P065': { lat: -31.4500, lon: -64.1600 }, // Anillo

    // R20-38 y Alt. 38
    'P013': { lat: -31.5200, lon: -64.2000 },
    'P014': { lat: -31.5300, lon: -64.2100 },
    'P015': { lat: -31.5400, lon: -64.2200 },
    'P027': { lat: -31.5500, lon: -64.2300 },
    'P030': { lat: -31.5600, lon: -64.2400 },
    'P036': { lat: -31.5700, lon: -64.2500 },
    'P049': { lat: -31.5800, lon: -64.2600 },
};

async function fetchWeatherForAllPolygons() {
    console.log('🌤️ Obteniendo datos meteorológicos para todos los polígonos...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const polygon of REAL_POLYGONS) {
        const location = POLYGON_LOCATIONS[polygon.id];

        if (!location) {
            console.log(`⚠️ ${polygon.id} (${polygon.name}): Sin coordenadas configuradas`);
            errorCount++;
            continue;
        }

        try {
            const weatherData = await weatherService.fetchWeatherForPolygon(
                polygon.id,
                location.lat,
                location.lon
            );

            if (weatherData) {
                await weatherService.saveWeatherData(weatherData);
                console.log(`✅ ${polygon.id} (${polygon.name}): ${weatherData.temperature_celsius}°C, ${weatherData.weather_description}`);
                successCount++;
            } else {
                console.log(`❌ ${polygon.id} (${polygon.name}): Error obteniendo datos`);
                errorCount++;
            }

            // Pausa para no sobrecargar la API
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
            console.error(`❌ ${polygon.id}: Error:`, error);
            errorCount++;
        }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Exitosos: ${successCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   Total: ${REAL_POLYGONS.length}`);
}

fetchWeatherForAllPolygons()
    .then(() => {
        console.log('\n✅ Proceso completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    });

