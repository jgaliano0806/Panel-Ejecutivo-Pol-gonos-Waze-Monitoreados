/**
 * Script para obtener datos meteorológicos de todos los polígonos
 */

import { WeatherService } from "../src/services/weatherService";
import { REAL_POLYGONS } from "../src/config/realPolygons";

const weatherService = new WeatherService();

// Coordenadas aproximadas de centros de polígonos (puedes ajustarlas)
const POLYGON_LOCATIONS: Record<string, { lat: number; lon: number }> = {
  // Circunvalación (Villa Carlos Paz - Córdoba)
  P001: { lat: -31.4167, lon: -64.4833 },
  P002: { lat: -31.42, lon: -64.49 },
  P056: { lat: -31.41, lon: -64.47 },
  P057: { lat: -31.425, lon: -64.495 },
  P058: { lat: -31.43, lon: -64.5 },
  P060: { lat: -31.435, lon: -64.505 },
  P063: { lat: -31.44, lon: -64.51 },
  P064: { lat: -31.445, lon: -64.515 },

  // Ruta Nacional 36 (Córdoba - Río Cuarto)
  P006: { lat: -32.4, lon: -63.9 },
  P009: { lat: -32.8, lon: -64.1 },
  P010: { lat: -32.5, lon: -63.95 },
  P011: { lat: -32.3, lon: -63.85 },
  P012: { lat: -32.2, lon: -63.8 },
  P023: { lat: -32.6, lon: -63.98 },
  P024: { lat: -32.7, lon: -64.05 },
  P025: { lat: -32.45, lon: -63.92 },
  P026: { lat: -32.85, lon: -64.15 },
  P031: { lat: -31.95, lon: -63.75 },
  P032: { lat: -31.85, lon: -63.7 },
  P033: { lat: -31.75, lon: -63.65 },
  P034: { lat: -31.65, lon: -63.6 },
  P035: { lat: -32.15, lon: -63.78 },
  P037: { lat: -33.0, lon: -64.2 },
  P038: { lat: -33.1, lon: -64.25 },
  P039: { lat: -31.6, lon: -63.58 },
  P040: { lat: -31.7, lon: -63.63 },
  P041: { lat: -31.8, lon: -63.68 },
  P042: { lat: -32.05, lon: -63.76 },
  P043: { lat: -32.1, lon: -63.77 },

  // Ruta Nacional 9 (Córdoba - Rosario)
  P028: { lat: -31.35, lon: -64.25 },
  P029: { lat: -31.3, lon: -64.2 },
  P048: { lat: -31.45, lon: -64.28 },
  P051: { lat: -31.25, lon: -64.15 },
  P052: { lat: -31.2, lon: -64.1 },
  P053: { lat: -31.15, lon: -64.05 },
  P066: { lat: -31.1, lon: -64.0 },

  // Ruta Nacional 19
  P044: { lat: -31.38, lon: -64.35 },
  P045: { lat: -31.36, lon: -64.33 },
  P046: { lat: -31.34, lon: -64.31 },
  P055: { lat: -31.32, lon: -64.29 },

  // Rutas Provinciales
  P003: { lat: -31.46, lon: -64.3 }, // E53
  P050: { lat: -31.47, lon: -64.31 }, // E53
  P004: { lat: -31.39, lon: -64.52 }, // E55
  P005: { lat: -31.38, lon: -64.51 }, // E55
  P020: { lat: -31.37, lon: -64.5 }, // E55
  P021: { lat: -31.36, lon: -64.49 }, // E55
  P022: { lat: -31.35, lon: -64.48 }, // E55
  P007: { lat: -31.5, lon: -64.35 }, // C45
  P008: { lat: -31.51, lon: -64.36 }, // C45
  P016: { lat: -31.3, lon: -64.45 }, // RP 5
  P017: { lat: -31.31, lon: -64.46 }, // RP 5
  P018: { lat: -31.32, lon: -64.47 }, // RP 5
  P019: { lat: -31.33, lon: -64.48 }, // RP 5

  // Área Capital y urbanas
  P047: { lat: -31.42, lon: -64.19 }, // APC
  P054: { lat: -31.41, lon: -64.2 }, // Luchesse
  P061: { lat: -31.4, lon: -64.21 }, // Luchesse
  P059: { lat: -31.43, lon: -64.18 }, // Anillo
  P062: { lat: -31.44, lon: -64.17 }, // AJC
  P065: { lat: -31.45, lon: -64.16 }, // Anillo

  // R20-38 y Alt. 38
  P013: { lat: -31.52, lon: -64.2 },
  P014: { lat: -31.53, lon: -64.21 },
  P015: { lat: -31.54, lon: -64.22 },
  P027: { lat: -31.55, lon: -64.23 },
  P030: { lat: -31.56, lon: -64.24 },
  P036: { lat: -31.57, lon: -64.25 },
  P049: { lat: -31.58, lon: -64.26 },
};

async function fetchWeatherForAllPolygons() {
  console.log(
    "🌤️ Obteniendo datos meteorológicos para todos los polígonos...\n",
  );

  let successCount = 0;
  let errorCount = 0;

  for (const polygon of REAL_POLYGONS) {
    const location = POLYGON_LOCATIONS[polygon.id];

    if (!location) {
      console.log(
        `⚠️ ${polygon.id} (${polygon.name}): Sin coordenadas configuradas`,
      );
      errorCount++;
      continue;
    }

    try {
      const weatherData = await weatherService.fetchWeatherForPolygon(
        polygon.id,
        location.lat,
        location.lon,
      );

      if (weatherData) {
        await weatherService.saveWeatherData(weatherData);
        console.log(
          `✅ ${polygon.id} (${polygon.name}): ${weatherData.temperature_celsius}°C, ${weatherData.weather_description}`,
        );
        successCount++;
      } else {
        console.log(
          `❌ ${polygon.id} (${polygon.name}): Error obteniendo datos`,
        );
        errorCount++;
      }

      // Pausa para no sobrecargar la API
      await new Promise((resolve) => setTimeout(resolve, 100));
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
    console.log("\n✅ Proceso completado");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error fatal:", error);
    process.exit(1);
  });
