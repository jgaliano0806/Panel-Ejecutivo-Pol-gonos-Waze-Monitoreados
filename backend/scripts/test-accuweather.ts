/**
 * Script para probar la API de AccuWeather
 * Ejecutar: npx ts-node scripts/test-accuweather.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env') });

const ACCUWEATHER_API_KEY = process.env.ACCUWEATHER_API_KEY;
const ACCUWEATHER_BASE_URL = 'https://dataservice.accuweather.com';

// Coordenadas de Córdoba, Argentina (centro de la ciudad)
const CORDOBA_LAT = -31.4201;
const CORDOBA_LON = -64.1888;

async function testAccuWeather() {
    console.log('🧪 Probando API de AccuWeather...\n');

    if (!ACCUWEATHER_API_KEY) {
        console.error('❌ ERROR: ACCUWEATHER_API_KEY no está definida en el archivo .env');
        console.log('   Verifica que el archivo backend/.env contenga:');
        console.log('   ACCUWEATHER_API_KEY=tu_api_key');
        process.exit(1);
    }

    console.log(`✅ API Key encontrada: ${ACCUWEATHER_API_KEY.substring(0, 10)}...`);
    console.log(`📍 Probando con coordenadas de Córdoba: ${CORDOBA_LAT}, ${CORDOBA_LON}\n`);

    try {
        // Paso 1: Obtener location key
        console.log('1️⃣ Obteniendo location key...');
        const locationUrl = `${ACCUWEATHER_BASE_URL}/locations/v1/cities/geoposition/search`;
        const locationParams = new URLSearchParams({
            apikey: ACCUWEATHER_API_KEY,
            q: `${CORDOBA_LAT},${CORDOBA_LON}`,
            language: 'es-ar'
        });

        const locationResponse = await fetch(`${locationUrl}?${locationParams}`);

        if (!locationResponse.ok) {
            const errorText = await locationResponse.text();
            console.error(`❌ Error obteniendo location key: ${locationResponse.status}`);
            console.error(`   Respuesta: ${errorText}`);

            if (locationResponse.status === 401) {
                console.error('\n⚠️  Error 401: API Key inválida o expirada');
                console.error('   Verifica que tu API Key sea correcta y que tu cuenta esté activa');
            } else if (locationResponse.status === 503) {
                console.error('\n⚠️  Error 503: Servicio no disponible');
                console.error('   AccuWeather puede estar experimentando problemas');
            }

            process.exit(1);
        }

        const locationData = await locationResponse.json();
        const locationKey = locationData.Key;

        if (!locationKey) {
            console.error('❌ No se pudo obtener location key de la respuesta');
            console.error('   Respuesta:', JSON.stringify(locationData, null, 2));
            process.exit(1);
        }

        console.log(`✅ Location key obtenida: ${locationKey}`);
        console.log(`   Ubicación: ${locationData.LocalizedName}, ${locationData.Country?.LocalizedName || 'N/A'}\n`);

        // Paso 2: Obtener condiciones actuales
        console.log('2️⃣ Obteniendo condiciones actuales del clima...');
        const conditionsUrl = `${ACCUWEATHER_BASE_URL}/currentconditions/v1/${locationKey}`;
        const conditionsParams = new URLSearchParams({
            apikey: ACCUWEATHER_API_KEY,
            language: 'es-ar',
            details: 'true'
        });

        const conditionsResponse = await fetch(`${conditionsUrl}?${conditionsParams}`);

        if (!conditionsResponse.ok) {
            const errorText = await conditionsResponse.text();
            console.error(`❌ Error obteniendo condiciones: ${conditionsResponse.status}`);
            console.error(`   Respuesta: ${errorText}`);
            process.exit(1);
        }

        const conditionsData = await conditionsResponse.json();

        if (!conditionsData || conditionsData.length === 0) {
            console.error('❌ No se recibieron datos de condiciones');
            process.exit(1);
        }

        const current = conditionsData[0];

        console.log('✅ Datos del clima obtenidos exitosamente!\n');
        console.log('📊 Información del Clima:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   🌡️  Temperatura: ${current.Temperature?.Metric?.Value}°C`);
        console.log(`   🌡️  Sensación térmica: ${current.RealFeelTemperature?.Metric?.Value}°C`);
        console.log(`   📝 Descripción: ${current.WeatherText}`);
        console.log(`   💧 Humedad: ${current.RelativeHumidity}%`);
        console.log(`   ☁️  Cobertura de nubes: ${current.CloudCover || 'N/A'}%`);

        if (current.PrecipitationSummary) {
            const precip = current.PrecipitationSummary.Precipitation?.Metric?.Value || 0;
            const pastHour = current.PrecipitationSummary.PastHour?.Metric?.Value || 0;
            console.log(`   🌧️  Precipitación: ${precip}mm`);
            console.log(`   🌧️  Última hora: ${pastHour}mm`);
        }

        console.log(`   💨 Viento: ${current.Wind?.Speed?.Metric?.Value || 0} km/h`);
        console.log(`   💨 Ráfagas: ${current.WindGust?.Speed?.Metric?.Value || current.Wind?.Speed?.Metric?.Value || 0} km/h`);
        console.log(`   👁️  Visibilidad: ${current.Visibility?.Metric?.Value ? current.Visibility.Metric.Value + ' km' : 'N/A'}`);
        console.log(`   🌧️  Está lloviendo: ${current.HasPrecipitation ? 'SÍ ✅' : 'NO'}`);

        if (current.PrecipitationType) {
            console.log(`   🌧️  Tipo de precipitación: ${current.PrecipitationType}`);
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Validar datos críticos
        const hasValidData =
            current.Temperature?.Metric?.Value !== undefined &&
            current.WeatherText &&
            current.Temperature.Metric.Value > -50 &&
            current.Temperature.Metric.Value < 60;

        if (hasValidData) {
            console.log('✅ Validación: Los datos son válidos y coherentes');
        } else {
            console.warn('⚠️  Advertencia: Algunos datos pueden ser inválidos');
        }

        console.log('\n🎉 ¡API de AccuWeather funcionando correctamente!');
        console.log('   El sistema está listo para usar AccuWeather como proveedor de clima.\n');

    } catch (error) {
        console.error('❌ Error al probar AccuWeather:', error);
        if (error instanceof Error) {
            console.error('   Mensaje:', error.message);
            console.error('   Stack:', error.stack);
        }
        process.exit(1);
    }
}

testAccuWeather()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    });

