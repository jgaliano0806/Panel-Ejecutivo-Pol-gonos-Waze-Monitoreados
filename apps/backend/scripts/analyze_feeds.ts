import axios from "axios";
import * as fs from "fs";

/**
 * Script para analizar feeds de Waze y detectar tipos de eventos
 * Específicamente para P001 (A-019 -8) y P056 (A - 019 - 7) donde hay cámaras
 */

interface WazeFeedAnalysis {
  polygonId: string;
  polygonName: string;
  feedType: "traffic" | "tvt";
  totalEvents: number;
  eventTypes: Map<string, number>;
  eventSubtypes: Map<string, number>;
  typeSubtypeCombinations: Map<string, number>;
  sampleEvents: any[];
}

const POLYGONS_TO_ANALYZE = [
  {
    id: "P001",
    name: "A-019 -8",
    feedUrl:
      "https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/9d7b4de5-3e05-4416-b6f0-7608008c797c?format=1",
    tvtFeedUrl:
      "https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759846663785",
  },
  {
    id: "P056",
    name: "A - 019 - 7",
    feedUrl:
      "https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/dd560bec-baf6-4537-84f4-705f98bd0dd1?format=1",
    tvtFeedUrl:
      "https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804759756",
  },
];

async function analyzeFeed(
  url: string,
  polygonId: string,
  polygonName: string,
  feedType: "traffic" | "tvt"
): Promise<WazeFeedAnalysis> {
  console.log(
    `\n📥 Analizando ${feedType.toUpperCase()} feed de ${polygonName} (${polygonId})...`
  );
  console.log(`URL: ${url}`);

  const analysis: WazeFeedAnalysis = {
    polygonId,
    polygonName,
    feedType,
    totalEvents: 0,
    eventTypes: new Map(),
    eventSubtypes: new Map(),
    typeSubtypeCombinations: new Map(),
    sampleEvents: [],
  };

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        Accept: "application/json",
        "User-Agent": "Panel-Waze-Monitoreados/1.0",
      },
    });

    const data = response.data;

    // Analizar alerts
    if (data.alerts && Array.isArray(data.alerts)) {
      console.log(`\n✅ Encontrados ${data.alerts.length} alerts`);

      data.alerts.forEach((alert: any, index: number) => {
        analysis.totalEvents++;

        const type = alert.type || "UNKNOWN";
        const subtype = alert.subtype || null;

        // Contar types
        analysis.eventTypes.set(type, (analysis.eventTypes.get(type) || 0) + 1);

        // Contar subtypes
        if (subtype) {
          analysis.eventSubtypes.set(
            subtype,
            (analysis.eventSubtypes.get(subtype) || 0) + 1
          );
        }

        // Contar combinaciones
        const combination = `${type}${subtype ? "." + subtype : ""}`;
        analysis.typeSubtypeCombinations.set(
          combination,
          (analysis.typeSubtypeCombinations.get(combination) || 0) + 1
        );

        // Guardar muestras (primeros 3 de cada tipo)
        if (analysis.sampleEvents.length < 20) {
          analysis.sampleEvents.push({
            index,
            type,
            subtype,
            location: alert.location,
            street: alert.street,
            reliability: alert.reliability,
            confidence: alert.confidence,
            reportDescription: alert.reportDescription,
            nThumbsUp: alert.nThumbsUp,
          });
        }
      });
    }

    // Analizar jams
    if (data.jams && Array.isArray(data.jams)) {
      console.log(`✅ Encontrados ${data.jams.length} jams`);

      data.jams.forEach((jam: any) => {
        analysis.totalEvents++;
        const type = "JAM";
        const subtype = jam.type || null;

        analysis.eventTypes.set(type, (analysis.eventTypes.get(type) || 0) + 1);
        if (subtype) {
          analysis.eventSubtypes.set(
            subtype,
            (analysis.eventSubtypes.get(subtype) || 0) + 1
          );
        }
      });
    }

    // Analizar irregularities
    if (data.irregularities && Array.isArray(data.irregularities)) {
      console.log(
        `✅ Encontrados ${data.irregularities.length} irregularities`
      );
    }

    // Analizar TVT data
    if (feedType === "tvt" && data.usersOnJams) {
      console.log(
        `✅ Datos TVT encontrados: ${data.usersOnJams.length} segmentos`
      );
    }

    return analysis;
  } catch (error) {
    console.error(
      `❌ Error analizando feed:`,
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

function printAnalysis(analysis: WazeFeedAnalysis) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(
    `📊 ANÁLISIS COMPLETO - ${analysis.polygonName} (${analysis.polygonId})`
  );
  console.log(`Tipo de Feed: ${analysis.feedType.toUpperCase()}`);
  console.log(`${"=".repeat(80)}`);

  console.log(`\n📈 RESUMEN:`);
  console.log(`   Total de eventos: ${analysis.totalEvents}`);
  console.log(`   Tipos únicos: ${analysis.eventTypes.size}`);
  console.log(`   Subtipos únicos: ${analysis.eventSubtypes.size}`);

  console.log(`\n📋 TIPOS DE EVENTOS (type):`);
  const sortedTypes = Array.from(analysis.eventTypes.entries()).sort(
    (a, b) => b[1] - a[1]
  );
  sortedTypes.forEach(([type, count]) => {
    console.log(`   ${type.padEnd(30)} : ${count}`);
  });

  console.log(`\n📋 SUBTIPOS DE EVENTOS (subtype):`);
  const sortedSubtypes = Array.from(analysis.eventSubtypes.entries()).sort(
    (a, b) => b[1] - a[1]
  );
  if (sortedSubtypes.length > 0) {
    sortedSubtypes.forEach(([subtype, count]) => {
      console.log(`   ${subtype.padEnd(30)} : ${count}`);
    });
  } else {
    console.log(`   (No se encontraron subtipos)`);
  }

  console.log(`\n📋 COMBINACIONES TYPE.SUBTYPE:`);
  const sortedCombinations = Array.from(
    analysis.typeSubtypeCombinations.entries()
  ).sort((a, b) => b[1] - a[1]);
  sortedCombinations.forEach(([combination, count]) => {
    console.log(`   ${combination.padEnd(40)} : ${count}`);
  });

  console.log(
    `\n📝 MUESTRAS DE EVENTOS (primeros ${Math.min(
      5,
      analysis.sampleEvents.length
    )}):`
  );
  analysis.sampleEvents.slice(0, 5).forEach((event, i) => {
    console.log(`\n   Evento #${i + 1}:`);
    console.log(`      type: ${event.type}`);
    console.log(`      subtype: ${event.subtype || "null"}`);
    console.log(`      street: ${event.street || "N/A"}`);
    console.log(`      location: ${JSON.stringify(event.location)}`);
    if (event.reportDescription) {
      console.log(`      description: ${event.reportDescription}`);
    }
  });
}

async function main() {
  console.log("🚀 INICIANDO ANÁLISIS DE FEEDS DE WAZE");
  console.log("Objetivo: Detectar cómo vienen las cámaras en los datos\n");

  const allAnalyses: WazeFeedAnalysis[] = [];

  for (const polygon of POLYGONS_TO_ANALYZE) {
    try {
      // Analizar Traffic Feed
      const trafficAnalysis = await analyzeFeed(
        polygon.feedUrl,
        polygon.id,
        polygon.name,
        "traffic"
      );
      allAnalyses.push(trafficAnalysis);
      printAnalysis(trafficAnalysis);

      // Esperar un poco entre requests
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Analizar TVT Feed
      const tvtAnalysis = await analyzeFeed(
        polygon.tvtFeedUrl,
        polygon.id,
        polygon.name,
        "tvt"
      );
      allAnalyses.push(tvtAnalysis);
      printAnalysis(tvtAnalysis);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`\n❌ Error procesando ${polygon.name}:`, error);
    }
  }

  // Guardar resultados en archivo JSON
  const outputPath = "./feed_analysis_results.json";
  const results = {
    timestamp: new Date().toISOString(),
    polygons: allAnalyses.map((a) => ({
      polygonId: a.polygonId,
      polygonName: a.polygonName,
      feedType: a.feedType,
      totalEvents: a.totalEvents,
      types: Object.fromEntries(a.eventTypes),
      subtypes: Object.fromEntries(a.eventSubtypes),
      combinations: Object.fromEntries(a.typeSubtypeCombinations),
      samples: a.sampleEvents,
    })),
  };

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Resultados guardados en: ${outputPath}`);

  // Resumen final
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🎯 RESUMEN FINAL`);
  console.log(`${"=".repeat(80)}`);

  const allTypes = new Set<string>();
  const allSubtypes = new Set<string>();

  allAnalyses.forEach((analysis) => {
    analysis.eventTypes.forEach((_, type) => allTypes.add(type));
    analysis.eventSubtypes.forEach((_, subtype) => allSubtypes.add(subtype));
  });

  console.log(`\nTodos los TYPES encontrados (${allTypes.size}):`);
  Array.from(allTypes)
    .sort()
    .forEach((type) => console.log(`   - ${type}`));

  console.log(`\nTodos los SUBTYPES encontrados (${allSubtypes.size}):`);
  Array.from(allSubtypes)
    .sort()
    .forEach((subtype) => console.log(`   - ${subtype}`));

  // Buscar específicamente cámaras
  console.log(`\n🔍 BÚSQUEDA ESPECÍFICA DE CÁMARAS:`);
  const cameraTypes = Array.from(allTypes).filter((t) =>
    t.toLowerCase().includes("camera")
  );
  const cameraSubtypes = Array.from(allSubtypes).filter((s) =>
    s.toLowerCase().includes("camera")
  );

  if (cameraTypes.length > 0 || cameraSubtypes.length > 0) {
    console.log(`✅ CÁMARAS ENCONTRADAS:`);
    if (cameraTypes.length > 0) {
      console.log(`   Types: ${cameraTypes.join(", ")}`);
    }
    if (cameraSubtypes.length > 0) {
      console.log(`   Subtypes: ${cameraSubtypes.join(", ")}`);
    }
  } else {
    console.log(
      `❌ NO se encontraron eventos de tipo CAMERA en los feeds analizados`
    );
    console.log(
      `   Esto significa que las cámaras NO vienen en el Traffic Feed ni en el TVT Feed`
    );
    console.log(
      `   Requieren un feed separado (Cameras Feed) con acceso especial de Waze`
    );
  }
}

main().catch(console.error);
