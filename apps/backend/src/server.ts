import Fastify from "fastify";
import cors from "@fastify/cors";
import { repositories } from "./repositories";
import { toLegacyAlert, toLegacyJam } from "./utils";
import {
  serializeDate,
  serializeAlerts,
  serializeJams,
  serializeObject,
} from "./utils/serialization";
import { alertService } from "./services/alertService";
import { aggregationService } from "./services/aggregationService";
import { historicalService } from "./services/historicalService";
import { dbService } from "./database/dbService";
import { SocketSubscriber } from "./subscribers/SocketSubscriber";
import { RepositoryFactory } from "./repositories";
import { dataQualityService } from "./services/dataQualityService";

// =====================================================
// 🔧 CONFIGURACIÓN DE FASTIFY CON PLUGINS
// =====================================================
import { incidentStatsService } from "./services/incidentStatsService";
import { externalTrafficService } from "./services/externalTrafficService";
import { delayCalculationService } from "./services/delayCalculationService";
import { incidentsHistoryService } from "./services/incidentsHistoryService";
import { dailyStatsService } from "./services/dailyStatsService";
import { weatherService } from "./services/weatherService";
import { apiService } from "./services/apiService";
import { REAL_POLYGONS, RealPolygonConfig } from "./config/realPolygons";

import dotenv from "dotenv";
import path from "path";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import fs from "fs";
import {
  roadAccidentService,
  type WeatherBackfillFailureReason,
} from "./services/roadAccidentService";

function weatherBackfillUserMessage(
  reason: WeatherBackfillFailureReason,
): string {
  switch (reason) {
    case "not_found":
      return "No se encontró el siniestro. Use el ID del registro (no solo el incident_id de Waze) o verifique que exista en la lista.";
    case "already_has_weather":
      return "El siniestro ya tiene datos climáticos. Use «Actualizar» con recarga forzada (force=true).";
    case "too_old":
      return "El siniestro es anterior a 92 días. Open-Meteo no provee clima histórico más allá de ese plazo.";
    case "future_date":
      return "La fecha del siniestro es futura. Corrija accident_at en el registro.";
    case "invalid_coordinates":
      return "El siniestro no tiene coordenadas válidas para consultar el clima.";
    case "open_meteo_unavailable":
      return "Open-Meteo no respondió (límite de consultas 429 o error temporal 502). Espere 1–2 minutos y vuelva a intentar.";
    default:
      return "No se pudo obtener el clima histórico.";
  }
}
import { catalogSyncService } from "./services/catalogSyncService";
import { wazePollingService } from "./services/wazePollingService";
import { openMeteoService } from "./services/openMeteoService";
import { incidentSimulationService } from "./services/incidentSimulationService";
import { wazeAnalyticsService } from "./services/WazeAnalyticsService";
import { websocketService } from "./services/websocketService";
import rateLimit from "@fastify/rate-limit";
import {
  globalRateLimitConfig,
  rateLimitLoggingHook,
} from "./middleware/rateLimiter";
import axios from "axios";
import { runMigrations } from "./database/migrations/runMigrations";
import { registerRoutes } from "./routes";
// Tipos inline para endpoints - más flexible que tipos externos fijos
type AccidentUpdate = Partial<{
  status: "active" | "inactive";
  description: string;
  severity: number;
  notes: string;
  resolution_notes: string;
}>;

dotenv.config();

// Instancia del servicio de API (evita problemas de import/export en TS runtime)
// const apiService = new ApiService(); // Removed: now imported as singleton
// const incidentsHistoryService = new IncidentsHistoryService(); // Removed: now imported as singleton
// const dailyStatsService = new DailyStatsService(); // Removed: now imported as singleton
// const weatherService = new WeatherService(); // Removed: now imported as singleton

const server = Fastify({
  logger: true,
  // Optimizaciones de rendimiento
  requestIdLogLabel: "reqId",
  disableRequestLogging: false,
  trustProxy: true,
});

// Configurar CORS - permitir FRONTEND_URL, mismo host sin puerto (nginx :80) y variantes
const frontendUrl = process.env.FRONTEND_URL;
const isDev = process.env.NODE_ENV !== "production";
const corsOrigin: (string | RegExp)[] | true = frontendUrl
  ? [
      frontendUrl,
      frontendUrl.replace(/:\d+$/, ""), // http://10.1.0.136
      /^https?:\/\/10\.1\.0\.136(:\d+)?$/, // cualquier puerto en 10.1.0.136
      // En desarrollo también permitir localhost / 127.0.0.1
      ...(isDev
        ? [
            /^https?:\/\/localhost(:\d+)?$/,
            /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
          ]
        : []),
    ]
  : true;

server.register(cors, {
  origin: corsOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// Registrar multipart para subida de archivos
server.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// Rate Limiting - protección contra abuso
server.register(rateLimit, globalRateLimitConfig);

// Configurar compresión GZIP/Brotli para optimización de rendimiento
server.register(require("@fastify/compress"), {
  global: true,
  encodings: ["gzip", "deflate", "br"],
  threshold: 1024, // Comprimir respuestas mayores a 1KB
  brotliOptions: {
    quality: 6, // Calidad Brotli (1-11, 6 es buen balance)
  },
  zlibOptions: {
    level: 6, // Nivel de compresión GZIP (1-9, 6 es buen balance)
  },
  // Excluir ciertos tipos de contenido de compresión
  skip: (request: any, reply: any) => {
    const getHeader = (name: string): unknown => {
      if (reply && typeof reply.getHeader === "function")
        return reply.getHeader(name);
      if (reply?.raw && typeof reply.raw.getHeader === "function")
        return reply.raw.getHeader(name);
      return undefined;
    };

    // No comprimir respuestas pequeñas
    const contentLength = getHeader("content-length");
    if (contentLength && parseInt(String(contentLength), 10) < 512) {
      return true;
    }

    // No comprimir imágenes SVG (ya están comprimidas)
    const contentType = getHeader("content-type");
    if (contentType && String(contentType).includes("image/svg+xml")) {
      return true;
    }

    return false;
  },
});

// Registrar static para servir archivos multimedia
server.register(fastifyStatic, {
  root: path.join(__dirname, "../public"),
  prefix: "/public/",
});

// =====================================================
// 📦 REGISTRO DE RUTAS MODULARIZADAS
// =====================================================
// Las rutas de catálogos y health están en /routes/
server.register(async (app) => {
  await registerRoutes(app);
});

// Hook global de manejo de errores
server.setErrorHandler((error: Error, request, reply) => {
  server.log.error(
    {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    },
    "Error en servidor",
  );

  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  const errorStack = error instanceof Error ? error.stack : undefined;

  reply.status(500).send({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? errorMessage
        : "Something went wrong",
    ...(process.env.NODE_ENV === "development" && errorStack
      ? { stack: errorStack }
      : {}),
  });
});

// Hook para agregar headers de cache
server.addHook("onSend", async (request, reply, payload) => {
  // Cache de 30 segundos para datos de Waze (se actualizan cada 2 min)
  if (request.url.startsWith("/api/")) {
    reply.header("Cache-Control", "public, max-age=30");
  }

  return payload;
});

// Funciones de serialización movidas a ./utils/serialization.ts

// Endpoint proxy de iconos movido a ./routes/iconProxy.routes.ts

// =====================================================
// 📤 NOTA: Endpoint /api/upload/icon modularizado
// =====================================================
// Ver: /routes/iconUploadRoute.ts

// Endpoint de prueba simple
server.get("/api/test", async () => {
  return {
    message: "Backend is running!",
    timestamp: new Date().toISOString(),
  };
});

// Nota: Los endpoints de catálogos CRUD están definidos más abajo (~línea 816)
// GET/POST/PUT/DELETE /api/catalogs/*

// =====================================================
// 📝 NOTA: Las siguientes rutas fueron modularizadas
// =====================================================
// - Health checks: /routes/health.routes.ts
// - Catalogs CRUD: /routes/catalogs.routes.ts
// Para agregar nuevas rutas, crear módulo en /routes/ y registrar en /routes/index.ts

// =====================================================
// 🚗 ENDPOINTS DE ACCIDENTES RAC (Road Accidents)
// =====================================================

/**
 * GET /api/road-accidents/map
 * Obtiene accidentes RAC para visualización en el mapa con filtros de fecha
 * Query params: startDate, endDate, polygonId (opcional)
 */


// =====================================================
// 📦 RUTAS DE POLÍGONOS MODULARIZADAS
// =====================================================
// Las rutas de polígonos (GET/POST/PUT/DELETE) fueron movidas a:
// /routes/polygons.routes.ts
// Registrado vía registerRoutes() en línea 144







// --- Endpoints de TVT (Traffic View Technology) Waze ---
// Referencia oficial: https://support.google.com/waze/partners/answer/13658466





// --- Endpoints de Alertas ---











// --- Endpoints de Métricas Agregadas ---





// --- Endpoints de Histórico ---









// --- Endpoints de Calidad de Datos ---

/**
 * GET /api/data-quality/report
 * Genera reporte completo de calidad de datos
 */


/**
 * GET /api/data-quality/metrics
 * Obtiene métricas globales de calidad
 */


/**
 * GET /api/data-quality/incidents/high-quality
 * Obtiene solo incidentes de alta calidad
 */


/**
 * GET /api/data-quality/incidents/prioritized
 * Obtiene incidentes priorizados por calidad y severidad
 */


/**
 * GET /api/data-quality/incidents/stale
 * Detecta incidentes que probablemente ya no son válidos
 */


/**
 * GET /api/data-quality/feed-status
 * Verifica si se alcanzó el límite de eventos de Waze (5000)
 */


/**
 * GET /api/data-quality/thresholds
 * Obtiene los umbrales configurados actualmente
 */


// POST /api/data-quality/thresholds → movida a routes/dataQuality.routes.ts

// --- Endpoints de Datos Raw para Mapa ---

/**
 * GET /api/incidents/all
 * Obtiene todos los incidentes activos formateados para el mapa
 */
// server.get("/api/incidents/all", async (request, reply) => {
//   try {
//     const alertsData = await repositories().wazeAlerts.findAllActive();
//     const incidents = alertsData.map(toLegacyAlert);
//     return incidents;
//   } catch (error) {
//     server.log.error({ error }, "Error retrieving all incidents");
//     reply.code(500).send({
//       error: "Failed to retrieve incidents",
//       details: error instanceof Error ? error.message : String(error),
//       stack: error instanceof Error ? error.stack : undefined,
//     });
//   }
// });

/**
 * GET /api/jams/all
 * Obtiene todos los jams activos formateados para el mapa
 */
// server.get("/api/jams/all", async (request, reply) => {
//   try {
//     const jamsData = await repositories().wazeJams.findAllActive();
//     const jams = jamsData.map(toLegacyJam);
//     return jams;
//   } catch (error) {
//     server.log.error({ error }, "Error retrieving all jams");
//     reply.code(500).send({ error: "Failed to retrieve jams" });
//   }
// });

// --- Endpoints de Estadísticas de Incidentes ---

/**
 * GET /api/incidents/stats/global
 * Obtiene estadísticas globales de tipos y subtipos de incidentes
 */


/**
 * GET /api/incidents/stats/polygon/:polygonId
 * Obtiene estadísticas detalladas de incidentes para un polígono específico
 */


/**
 * GET /api/incidents/types-summary
 * Resumen rápido de tipos de incidentes activos
 */


// --- Endpoints de Cálculo Mejorado de Demoras ---

/**
 * GET /api/incidents/delay/:incidentId
 * Calcula la demora mejorada para un incidente específico
 * Usa: proximidad geográfica, estimación de desvío, y datos históricos
 */


/**
 * GET /api/incidents/delays/all
 * Calcula demoras mejoradas para todos los incidentes activos
 */


/**
 * Calcula la distancia entre dos puntos geográficos (Haversine) en metros
 */
function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Agrupa incidentes por calle y proximidad geográfica para evitar duplicados
 */
import { InternalAlert } from "./types"; // Ensure imported if not already. Actually InternalAlert is redundant if using module scope but let's see.
// Use 'any' or correct type for now to avoid import issues, then refine.
// Or better: import { InternalAlert } from './types'; is assumed to be available or added?
// Looking at imports in server.ts, types are not imported directly mostly.
// But 'server.ts' imports from './utils' which might export types?
// No, utils exports functions.
// Let's use `any[]` or better define `{ location: {lat: number, lng: number}, ... }[]`
function groupIncidentsByProximity(
  incidents: any[],
  proximityThreshold: number = 200,
) {
  const groups: Array<{
    primary: (typeof incidents)[0];
    related: (typeof incidents)[0][];
    allLocations: Array<{ lat: number; lng: number; id: string }>;
  }> = [];

  const processed = new Set<string>();

  for (const incident of incidents) {
    if (processed.has(incident.id)) continue;

    // Buscar incidentes relacionados (misma calle O proximidad geográfica)
    const related: (typeof incidents)[0][] = [];
    const allLocations: Array<{ lat: number; lng: number; id: string }> = [
      {
        lat: incident.location.lat,
        lng: incident.location.lng,
        id: incident.id,
      },
    ];

    for (const other of incidents) {
      if (other.id === incident.id || processed.has(other.id)) continue;

      const distance = calculateDistanceMeters(
        incident.location.lat,
        incident.location.lng,
        other.location.lat,
        other.location.lng,
      );

      const sameType = incident.type.toLowerCase() === other.type.toLowerCase();
      const sameSubtype =
        incident.subtype &&
        other.subtype &&
        incident.subtype.toLowerCase() === other.subtype.toLowerCase();

      // CORREGIDO: Solo agrupar por proximidad geográfica estricta
      // No agrupar solo por nombre de calle (puede haber múltiples incidentes en la misma ruta)
      // Agrupar si: mismo tipo + mismo subtipo + muy cerca (< 50 metros)
      const isNearDuplicate =
        sameType && sameSubtype && distance <= proximityThreshold;

      if (isNearDuplicate) {
        related.push(other);
        allLocations.push({
          lat: other.location.lat,
          lng: other.location.lng,
          id: other.id,
        });
        processed.add(other.id);
      }
    }

    processed.add(incident.id);

    // Elegir el incidente "primario" (el más reciente o con más confianza)
    const allIncidents = [incident, ...related];
    const primary = allIncidents.reduce((best, current) => {
      const bestScore = (best.confidence || 0) + (best.reliability || 0);
      const currentScore =
        (current.confidence || 0) + (current.reliability || 0);
      return currentScore > bestScore ? current : best;
    }, incident);

    groups.push({ primary, related, allLocations });
  }

  return groups;
}

/**
 * GET /api/incidents/blocking-analysis
 * Análisis completo de incidentes bloqueantes con cálculo mejorado de demora
 * Incluye deduplicación por calle y proximidad geográfica
 */
server.get("/api/incidents/blocking-analysis", async (request, reply) => {
  try {
    const limit = Math.min(
      500,
      Math.max(1, parseInt((request.query as { limit?: string })?.limit || "200", 10)),
    );

    const alertsData = await repositories().wazeAlerts.findAllActive();
    const jamsData = await repositories().wazeJams.findAllActive();
    const alerts = alertsData.map(toLegacyAlert);
    const jams = jamsData.map(toLegacyJam);
    const historicalData = await historicalService.getGlobalSnapshots(24);

    // Filtrar solo incidentes que podrían ser bloqueantes
    const blockingTypes = [
      "ROAD_CLOSED",
      "road_closed",
      "ACCIDENT",
      "accident",
      "HAZARD",
      "hazard",
      "POLICE",
      "police",
      "CONSTRUCTION",
      "construction",
      "MISC",
      "misc",
      "JAM",
      "jam",
      "WEATHERHAZARD",
      "weatherhazard",
    ];
    const potentialBlockingIncidents = alerts.filter(
      (a) =>
        blockingTypes.some((t) =>
          a.type.toLowerCase().includes(t.toLowerCase()),
        ) || a.severity >= 4,
    );

    // Agrupar incidentes para evitar duplicados (umbral reducido a 50m)
    const groupedIncidents = groupIncidentsByProximity(
      potentialBlockingIncidents,
      50, // Reducido de 200m a 50m para evitar agrupar incidentes diferentes
    );

    const analyses = groupedIncidents.map((group) => {
      const incident = group.primary;
      const delayResult = delayCalculationService.calculateIncidentDelay(
        incident,
        jams,
        historicalData,
      );

      // Encontrar jams relacionados directamente (de todos los incidentes del grupo)
      const allIncidentIds = [incident.id, ...group.related.map((r) => r.id)];
      const linkedJams = jams.filter((j) =>
        allIncidentIds.includes(j.blockingAlertUuid || ""),
      );
      const totalLength = linkedJams.reduce((sum, j) => sum + j.length, 0);

      // Encontrar jams cercanos (excluyendo los vinculados)
      const linkedJamIds = new Set(linkedJams.map((j) => j.id));
      const nearbyJams = jams.filter((j) => {
        if (linkedJamIds.has(j.id)) return false;
        const distance = calculateDistanceMeters(
          incident.location.lat,
          incident.location.lng,
          j.location.lat,
          j.location.lng,
        );
        return distance <= 300; // Radio de 300 metros
      });

      // Obtener calles afectadas de jams vinculados y cercanos
      const affectedStreets = [
        ...new Set(
          [
            ...linkedJams.map((j) => j.street),
            ...nearbyJams.map((j) => j.street),
          ].filter(Boolean),
        ),
      ] as string[];

      // Obtener info del polígono
      const polygon = incident.polygonId
        ? REAL_POLYGONS.find((p) => p.id === incident.polygonId)
        : null;

      // Calcular antigüedad más antigua del grupo
      const allTimestamps = [
        incident.timestamp,
        ...group.related.map((r) => r.timestamp),
      ];
      const oldestTimestamp = allTimestamps.reduce((oldest, current) =>
        new Date(current) < new Date(oldest) ? current : oldest,
      );

      return {
        incident: {
          id: incident.id,
          type: incident.type,
          subtype: incident.subtype,
          description: incident.description, // Contiene reportDescription si está disponible
          street: incident.street,
          city: incident.city,
          severity: incident.severity,
          polygonId: incident.polygonId,
          location: incident.location,
          timestamp: oldestTimestamp, // Usar la fecha más antigua
        },
        delay: delayResult,
        linkedJams: linkedJams.length,
        affectedLength: totalLength,
        affectedLengthKm: (totalLength / 1000).toFixed(2),
        impactScore: Math.round(
          delayResult.totalDelayMinutes * 0.4 +
            linkedJams.length * 10 +
            totalLength / 100 +
            group.related.length * 5, // Bonus por múltiples reportes
        ),
        // Información del grupo para deduplicación
        reportCount: 1 + group.related.length,
        allLocations: group.allLocations,
        relatedIncidentIds: group.related.map((r) => r.id),
        // Nuevos campos: grupo y tramos afectados
        nearbyJams: nearbyJams.length,
        polygonName: polygon?.name || null,
        polygonGroup: polygon?.group || null,
        affectedStreets: affectedStreets,
      };
    });

    // Ordenar por impacto
    analyses.sort((a, b) => b.impactScore - a.impactScore);

    const totalOriginalIncidents = potentialBlockingIncidents.length;
    const totalGroupedIncidents = analyses.length;

    return {
      count: Math.min(analyses.length, limit),
      analyses: analyses.slice(0, limit),
      summary: {
        totalIncidents: totalGroupedIncidents,
        totalReports: totalOriginalIncidents,
        duplicatesRemoved: totalOriginalIncidents - totalGroupedIncidents,
        totalDelayMinutes: analyses.reduce(
          (sum, a) => sum + a.delay.totalDelayMinutes,
          0,
        ),
        avgConfidence:
          analyses.length > 0
            ? Math.round(
                analyses.reduce((sum, a) => sum + a.delay.confidence, 0) /
                  analyses.length,
              )
            : 0,
      },
    };
  } catch (error) {
    server.log.error({ error }, "Error in blocking analysis");
    reply.code(500).send({ error: "Failed to get blocking analysis" });
  }
});

// --- Endpoints de Velocidad Externa ---

/**
 * Calcula el centro aproximado de un polígono desde los datos de Waze
 * Si el polígono tiene coordenadas configuradas, las usa.
 * Si no, calcula el centro desde los incidentes y jams activos del polígono.
 * Si no hay datos, usa las coordenadas por defecto de Córdoba.
 */
async function calculatePolygonCenter(
  polygonId: string,
): Promise<{ lat: number; lon: number }> {
  const polygon = REAL_POLYGONS.find((p) => p.id === polygonId);

  // Si el polígono tiene coordenadas configuradas, usarlas
  if (polygon?.coordinates?.lat && polygon?.coordinates?.lon) {
    return {
      lat: polygon.coordinates.lat,
      lon: polygon.coordinates.lon,
    };
  }

  // Intentar calcular desde los datos de Waze
  const allAlerts = await repositories().wazeAlerts.findAllActive();
  const allJams = await repositories().wazeJams.findAllActive();

  const alerts = allAlerts.filter((a) => a.polygon_id === polygonId);
  const jams = allJams.filter((j) => j.polygon_id === polygonId);

  const locations: Array<{ lat: number; lon: number }> = [];

  // Agregar ubicaciones de alertas
  alerts.forEach((alert) => {
    if (alert.location?.x && alert.location?.y) {
      locations.push({ lat: alert.location.y, lon: alert.location.x });
    }
  });

  // Agregar ubicaciones de jams
  jams.forEach((jam) => {
    // Extract start point from polyline
    let line: any[] = [];
    if (Array.isArray(jam.polyline)) {
      line = jam.polyline;
    } else if (typeof jam.polyline === "string") {
      try {
        line = JSON.parse(jam.polyline);
      } catch {}
    }

    if (line.length > 0 && line[0].y && line[0].x) {
      locations.push({ lat: Number(line[0].y), lon: Number(line[0].x) });
    }
  });

  // Si hay ubicaciones, calcular el centro promedio
  if (locations.length > 0) {
    const avgLat =
      locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
    const avgLon =
      locations.reduce((sum, loc) => sum + loc.lon, 0) / locations.length;
    return { lat: avgLat, lon: avgLon };
  }

  // Fallback: coordenadas por defecto de Córdoba
  return { lat: -31.4173, lon: -64.1833 };
}

/**
 * GET /api/speed/comparison/:polygonId
 * Compara velocidad de Waze con fuentes externas
 */
server.get("/api/speed/comparison/:polygonId", async (request, reply) => {
  try {
    const { polygonId } = request.params as { polygonId: string };
    const polygon = REAL_POLYGONS.find((p) => p.id === polygonId);

    if (!polygon) {
      reply.code(404).send({ error: "Polygon not found" });
      return;
    }

    // Obtener velocidad de Waze
    const trafficMetrics =
      await apiService.getTrafficMetricsByPolygon(polygonId);
    const wazeSpeed = trafficMetrics?.avgSpeed || null;

    // Calcular centro del polígono (desde config, datos de Waze, o fallback)
    const center = await calculatePolygonCenter(polygonId);
    const centerLat = center.lat;
    const centerLon = center.lon;

    const comparison = await externalTrafficService.getSpeedComparison(
      polygonId,
      polygon.name,
      centerLat,
      centerLon,
      wazeSpeed,
    );

    return comparison;
  } catch (error) {
    server.log.error(error);
    reply.code(500).send({ error: "Failed to get speed comparison" });
  }
});

/**
 * GET /api/speed/comparison/all
 * Obtiene comparación de velocidades para todos los polígonos críticos
 */
server.get("/api/speed/comparison/all", async (request, reply) => {
  try {
    const limit = parseInt(
      (request.query as { limit?: string })?.limit || "10",
    );

    // Obtener polígonos con tráfico
    const allMetrics = await apiService.getAllTrafficMetrics();
    const topPolygons = allMetrics
      .filter((m) => m.totalJams > 0)
      .slice(0, limit);

    // Obtener comparaciones en paralelo (con límite para no sobrecargar)
    const comparisons = (await Promise.all(
      topPolygons.map(async (metrics) => {
        const polygon = REAL_POLYGONS.find((p) => p.id === metrics.polygonId);
        if (!polygon) return null;

        // Calcular centro del polígono (desde config, datos de Waze, o fallback)
        const center = await calculatePolygonCenter(metrics.polygonId);
        const centerLat = center.lat;
        const centerLon = center.lon;

        try {
          return await externalTrafficService.getSpeedComparison(
            polygon.id,
            polygon.name,
            centerLat,
            centerLon,
            metrics.avgSpeed,
          );
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          server.log.error(err, "Error getting speed for " + polygon.name);
          return null;
        }
      }),
    )) as Array<any>;

    return comparisons.filter((c) => c !== null);
  } catch (error) {
    server.log.error(error);
    reply.code(500).send({ error: "Failed to get speed comparisons" });
  }
});

// ===========================================
// ENDPOINTS: HISTORIAL DE INCIDENTES
// ===========================================

// GET /api/historical/incidents - Obtener historial de incidentes
server.get("/api/historical/incidents", async (request, reply) => {
  try {
    const { polygon_id, type, from, to, limit } = request.query as {
      polygon_id?: string;
      type?: string;
      from?: string;
      to?: string;
      limit?: string;
    };

    const incidents = await incidentsHistoryService.getIncidents({
      polygon_id,
      type,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit) : 100,
    });

    reply.send(incidents);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    server.log.error(err, "Error getting incidents history");
    reply.code(500).send({ error: "Failed to get incidents history" });
  }
});

// GET /api/historical/incidents/hotspots - Puntos negros
server.get("/api/historical/incidents/hotspots", async (request, reply) => {
  try {
    const { min_incidents, radius_meters, from, to, limit } = request.query as {
      min_incidents?: string;
      radius_meters?: string;
      from?: string;
      to?: string;
      limit?: string;
    };

    const hotspots = await incidentsHistoryService.getHotspots({
      min_incidents: min_incidents ? parseInt(min_incidents) : 5,
      radius_meters: radius_meters ? parseInt(radius_meters) : 500,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit) : 10,
    });

    reply.send(hotspots);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    server.log.error(err, "Error getting hotspots");
    reply.code(500).send({ error: "Failed to get hotspots" });
  }
});

// GET /api/historical/incidents/stats - Estadísticas de incidentes
server.get("/api/historical/incidents/stats", async (request, reply) => {
  try {
    const { polygon_id, group_by, from, to } = request.query as {
      polygon_id?: string;
      group_by?: "type" | "hour" | "day";
      from?: string;
      to?: string;
    };

    if (!group_by || !["type", "hour", "day"].includes(group_by)) {
      reply
        .code(400)
        .send({ error: "group_by must be one of: type, hour, day" });
      return;
    }

    const stats = await incidentsHistoryService.getIncidentStats({
      polygon_id,
      group_by,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });

    reply.send(stats);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    server.log.error(err, "Error getting incident stats");
    reply.code(500).send({ error: "Failed to get incident stats" });
  }
});

// ===========================================
// ENDPOINTS: ESTADÍSTICAS DIARIAS
// ===========================================

// GET /api/stats/daily - Estadísticas diarias
server.get("/api/stats/daily", async (request, reply) => {
  try {
    const { from, to } = request.query as {
      from?: string;
      to?: string;
    };

    const fromDate = from
      ? new Date(from)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const stats = await dailyStatsService.getDailyStats(fromDate, toDate);
    reply.send(stats);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    server.log.error(err, "Error getting daily stats");
    reply.code(500).send({ error: "Failed to get daily stats" });
  }
});

// GET /api/stats/weekly - Estadísticas semanales
server.get("/api/stats/weekly", async (request, reply) => {
  try {
    const { from, to } = request.query as {
      from?: string;
      to?: string;
    };

    const fromDate = from
      ? new Date(from)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const stats = await dailyStatsService.getWeeklyStats(fromDate, toDate);
    reply.send(stats);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    server.log.error(err, "Error getting weekly stats");
    reply.code(500).send({ error: "Failed to get weekly stats" });
  }
});

// GET /api/stats/monthly - Estadísticas mensuales
server.get("/api/stats/monthly", async (request, reply) => {
  try {
    const { from, to } = request.query as {
      from?: string;
      to?: string;
    };

    const fromDate = from
      ? new Date(from)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const stats = await dailyStatsService.getMonthlyStats(fromDate, toDate);
    reply.send(stats);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    server.log.error(err, "Error getting monthly stats");
    reply.code(500).send({ error: "Failed to get monthly stats" });
  }
});

// ===========================================
// ENDPOINTS: CLIMA (POC)
// ===========================================

// GET /api/weather/:polygon_id - Obtener clima actual de un polígono
server.get("/api/weather/:polygon_id", async (request, reply) => {
  try {
    const { polygon_id } = request.params as { polygon_id: string };
    const { force_refresh } = request.query as { force_refresh?: string };

    // Buscar el polígono en la configuración
    const polygon = REAL_POLYGONS.find((p) => p.id === polygon_id);
    if (!polygon) {
      reply.code(404).send({ error: "Polygon not found" });
      return;
    }

    // Si no tiene coordenadas, retornar datos por defecto
    if (!polygon.coordinates) {
      reply.send({
        polygon_id,
        timestamp: new Date(),
        temperature_celsius: null,
        weather_description: "Sin datos disponibles",
        precipitation_mm: 0,
        wind_speed_kmh: null,
        visibility_meters: 10000,
        is_freezing_risk: false,
        has_weather_alert: false,
      });
      return;
    }

    const centerLat = polygon.coordinates.lat;
    const centerLon = polygon.coordinates.lon;

    // Si no se fuerza refresh, intentar obtener datos guardados recientes (menos de 30 minutos)
    if (!force_refresh) {
      const savedWeather = await weatherService.getLatestWeather(polygon_id);
      if (savedWeather && savedWeather.timestamp) {
        const savedTime = new Date(savedWeather.timestamp);
        const now = new Date();
        const ageMinutes = (now.getTime() - savedTime.getTime()) / (1000 * 60);

        // Si los datos tienen menos de 30 minutos, usarlos
        if (ageMinutes < 30) {
          server.log.info(
            { polygon_id, ageMinutes: Math.round(ageMinutes) },
            "Usando datos de clima guardados",
          );
          reply.send(savedWeather);
          return;
        }

        // Si son más antiguos, obtener datos frescos
        server.log.info(
          { polygon_id, ageMinutes: Math.round(ageMinutes) },
          "Datos guardados muy antiguos, obteniendo datos frescos",
        );
      }
    } else {
      server.log.info({ polygon_id }, "Forzando actualización de clima");
    }

    // Obtener datos frescos del API (AccuWeather si está configurado, sino Open-Meteo)
    const weatherData = await weatherService.fetchWeatherForPolygon(
      polygon_id,
      centerLat,
      centerLon,
    );

    if (!weatherData) {
      // Si falla obtener datos frescos, intentar usar datos guardados como fallback
      const savedWeather = await weatherService.getLatestWeather(polygon_id);
      if (savedWeather) {
        server.log.warn(
          { polygon_id },
          "No se pudo obtener clima fresco, usando datos guardados",
        );
        reply.send(savedWeather);
        return;
      }

      reply.code(503).send({ error: "Weather service unavailable" });
      return;
    }

    // Intentar guardar en base de datos (no crítico - si falla, igual retornamos los datos)
    try {
      await weatherService.saveWeatherData(weatherData);
      server.log.info(
        {
          polygon_id,
          provider: process.env.WEATHER_PROVIDER || "openmeteo",
          temperature: weatherData.temperature_celsius,
        },
        "Clima obtenido y guardado",
      );
    } catch (saveError) {
      // Si falla el guardado, lo logueamos pero continuamos (no crítico)
      server.log.warn(
        {
          polygon_id,
          error:
            saveError instanceof Error ? saveError.message : String(saveError),
        },
        "No se pudo guardar clima en DB, retornando datos de API",
      );
    }

    reply.send(weatherData);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    server.log.error(err, "Error getting weather data");
    reply
      .code(500)
      .send({ error: "Failed to get weather data", details: err.message });
  }
});

// GET /api/weather/:polygon_id/history - Historial de clima
server.get("/api/weather/:polygon_id/history", async (request, reply) => {
  try {
    const { polygon_id } = request.params as { polygon_id: string };
    const { from, to } = request.query as {
      from?: string;
      to?: string;
    };

    const fromDate = from
      ? new Date(from)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    let history = await weatherService.getWeatherHistory(
      polygon_id,
      fromDate,
      toDate,
    );

    // Si no hay datos históricos, intentar obtenerlos de Open-Meteo
    if (history.length === 0) {
      const polygon = REAL_POLYGONS.find((p) => p.id === polygon_id);
      server.log.info(
        {
          polygon_id,
          found: !!polygon,
          hasCoords: !!polygon?.coordinates,
          coords: polygon?.coordinates,
        },
        "Verificando polígono para historial",
      );

      if (polygon?.coordinates) {
        server.log.info(
          { polygon_id },
          "No hay historial en BD, obteniendo de Open-Meteo...",
        );

        // Obtener y guardar datos históricos
        history = await weatherService.fetchAndStoreHistorical24h(
          polygon_id,
          polygon.coordinates.lat,
          polygon.coordinates.lon,
        );

        server.log.info(
          { polygon_id, count: history.length },
          "Historial obtenido y guardado",
        );
      } else {
        server.log.warn(
          { polygon_id },
          "Polígono no encontrado o sin coordenadas",
        );
      }
    }

    reply.send(history);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    server.log.error(err, "Error getting weather history");
    reply.code(500).send({ error: "Failed to get weather history" });
  }
});

// GET /api/weather/alerts - Alertas meteorológicas activas
server.get("/api/weather/alerts", async (request, reply) => {
  try {
    const alerts = await weatherService.getActiveWeatherAlerts();
    // Siempre retornar un array, incluso si está vacío
    reply.send(alerts || []);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    server.log.error(err, "Error getting weather alerts");
    // En caso de error, retornar array vacío en lugar de 500 para no romper el frontend
    reply.send([]);
  }
});

// GET /api/weather/all - Clima de todos los polígonos
server.get("/api/weather/all", async (request, reply) => {
  try {
    const weatherPromises = REAL_POLYGONS.filter((p) => p.coordinates).map(
      async (polygon) => {
        const centerLat = polygon.coordinates!.lat;
        const centerLon = polygon.coordinates!.lon;

        const weather = await weatherService.fetchWeatherForPolygon(
          polygon.id,
          centerLat,
          centerLon,
        );

        if (weather) {
          await weatherService.saveWeatherData(weather);
        }

        return {
          polygon_id: polygon.id,
          polygon_name: polygon.name,
          weather,
        };
      },
    );

    const results = await Promise.all(weatherPromises);
    reply.send(results);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    server.log.error(err, "Error getting all weather data");
    reply.code(500).send({ error: "Failed to get all weather data" });
  }
});

// Risk Scoring endpoints have been moved to routes/risk.routes.ts

// POST /api/accidents/backfill-weather - Clima histórico masivo (Open-Meteo)
server.post("/api/accidents/backfill-weather", async (request, reply) => {
  try {
    const body = (request.body as { force?: boolean }) || {};
    const query = request.query as { force?: string };
    const forceRefresh =
      body.force === true || query.force === "true" || query.force === "1";

    server.log.info(
      { forceRefresh },
      "Iniciando backfill masivo de clima histórico",
    );

    // Obtener todos los accidentes
    const allAccidents = await roadAccidentService.getAccidents({
      limit: 10000,
    });

    // Sin force: solo sin weather_data. Con force: todos (se reconsulta Open-Meteo).
    const accidentsWithoutWeather = allAccidents.filter((accident) => {
      if (!accident.weather_data) return true;
      if (typeof accident.weather_data !== "object") return true;
      return Object.keys(accident.weather_data).length === 0;
    });

    const candidateAccidents = forceRefresh
      ? allAccidents
      : accidentsWithoutWeather;

    server.log.info(
      {
        total: allAccidents.length,
        withoutWeather: accidentsWithoutWeather.length,
        forceRefresh,
        candidates: candidateAccidents.length,
      },
      "Accidentes a procesar",
    );

    // Filtrar los que están dentro de 92 días
    const now = new Date();
    const eligibleAccidents = candidateAccidents.filter((accident) => {
      const accidentDate = accident.accident_at
        ? new Date(accident.accident_at)
        : accident.created_at
          ? new Date(accident.created_at)
          : new Date();
      const daysDiff =
        (now.getTime() - accidentDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 92 && daysDiff >= 0;
    });

    server.log.info(
      { eligible: eligibleAccidents.length, forceRefresh },
      "Accidentes elegibles (dentro de 92 días)",
    );

    if (eligibleAccidents.length === 0) {
      return {
        total: allAccidents.length,
        withoutWeather: accidentsWithoutWeather.length,
        eligible: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        forceRefresh,
        message: forceRefresh
          ? "No hay accidentes elegibles en los últimos 92 días"
          : "No hay accidentes elegibles para procesar",
      };
    }

    // Procesar en lotes con rate limiting (100ms entre cada uno)
    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const accident of eligibleAccidents) {
      try {
        const result = await roadAccidentService.backfillWeatherData(
          accident.id!,
          { force: forceRefresh },
        );
        processed++;
        if (result.ok) {
          successful++;
          server.log.info(
            {
              accidentId: accident.id,
              progress: `${processed}/${eligibleAccidents.length}`,
              forceRefresh,
            },
            "Clima obtenido",
          );
        } else {
          failed++;
        }

        // Rate limiting: espaciar consultas a Open-Meteo (evitar 429)
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error) {
        failed++;
        server.log.error(
          { accidentId: accident.id, error },
          "Error procesando accidente",
        );
      }
    }

    const result = {
      total: allAccidents.length,
      withoutWeather: accidentsWithoutWeather.length,
      eligible: eligibleAccidents.length,
      processed,
      successful,
      failed,
      forceRefresh,
      message: forceRefresh
        ? `Actualizados ${successful} de ${processed} incidentes (${failed} fallidos)`
        : `Procesados ${processed} accidentes: ${successful} exitosos, ${failed} fallidos`,
    };

    server.log.info(result, "Backfill masivo completado");
    return result;
  } catch (error) {
    server.log.error({ error }, "Error en backfill masivo");
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return reply.code(500).send({
      error: "Error en backfill masivo",
      message:
        process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
});

// Obtener score de un polígono específico

// ============================================================================
// 🚗 ENDPOINTS DE SINIESTROS VIALES (ROAD ACCIDENTS)
// ============================================================================

// GET /api/accidents - Listar siniestros viales
server.get("/api/accidents", async (request, reply) => {
  try {
    const { from, to, limit, offset } = request.query as {
      from?: string;
      to?: string;
      limit?: string;
      offset?: string;
    };

    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;
    const filters = {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limitNum,
      offset: offsetNum,
    };

    const [accidents, total] = await Promise.all([
      roadAccidentService.getAccidents(filters),
      roadAccidentService.getAccidentsTotal({
        from: filters.from,
        to: filters.to,
      }),
    ]);

    return serializeObject({ data: accidents, total });
  } catch (error) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error en /api/accidents",
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Si la tabla no existe, retornar array vacío en lugar de error 500
    if (error instanceof Error && error.message.includes("does not exist")) {
      server.log.warn(
        "Tabla road_accidents no existe. Retornando array vacío. Ejecutar: npx ts-node scripts/create-accidents-table.ts",
      );
      return serializeObject({ data: [], total: 0 });
    }

    return reply.code(500).send({
      error: "Error obteniendo siniestros viales",
      message:
        process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
});

// GET /api/accidents/:id - Detalle de un siniestro
server.get("/api/accidents/:id", async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const accident = await roadAccidentService.getAccidentById(id);

    if (!accident) {
      return reply.code(404).send({ error: "Siniestro no encontrado" });
    }

    return serializeObject(accident);
  } catch (error) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error en /api/accidents/:id",
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return reply.code(500).send({
      error: "Error obteniendo detalle del siniestro",
      message:
        process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
});

// POST /api/accidents - Crear un nuevo registro de siniestro
server.post("/api/accidents", async (request, reply) => {
  try {
    const data = request.body as any;

    // Validar datos mínimos requeridos
    if (!data.location_lat || !data.location_lng) {
      return reply.code(400).send({
        error: "Datos inválidos",
        message: "Se requieren location_lat y location_lng",
      });
    }

    // Si no se provee clima, intentar obtenerlo usando las coordenadas
    if (!data.weather_data) {
      try {
        // Primero intentar obtener clima del polígono si existe
        if (data.polygonId) {
          try {
            data.weather_data = await weatherService.getLatestWeather(
              data.polygonId,
            );
            if (data.weather_data) {
              server.log.info(
                { polygonId: data.polygonId },
                "Clima obtenido de BD para polígono",
              );
            }
          } catch (polygonError) {
            server.log.warn(
              { polygonId: data.polygonId, error: polygonError },
              "No se pudo obtener clima del polígono",
            );
          }
        }

        // Si no hay clima del polígono, obtenerlo en el momento del incidente
        if (!data.weather_data && data.location_lat && data.location_lng) {
          try {
            const eventTime = data.accident_at
              ? new Date(data.accident_at)
              : new Date();
            const weatherData = await weatherService.fetchWeatherAtTimestamp(
              Number(data.location_lat),
              Number(data.location_lng),
              eventTime,
            );

            if (weatherData) {
              data.weather_data = weatherData;
              server.log.info(
                {
                  lat: data.location_lat,
                  lng: data.location_lng,
                  accident_at: eventTime.toISOString(),
                  provider: process.env.WEATHER_PROVIDER || "openmeteo",
                },
                "Clima histórico obtenido para accidente",
              );
            } else {
              server.log.warn(
                { lat: data.location_lat, lng: data.location_lng },
                "No se pudo obtener clima de la API",
              );
              data.weather_data = {};
            }
          } catch (apiError) {
            server.log.warn(
              {
                lat: data.location_lat,
                lng: data.location_lng,
                error: apiError,
              },
              "Error al obtener clima de la API para accidente",
            );
            data.weather_data = {};
          }
        } else if (!data.weather_data) {
          data.weather_data = {};
        }
      } catch (weatherError) {
        server.log.warn(
          { error: weatherError },
          "Error general al obtener clima para el accidente",
        );
        data.weather_data = {};
      }
    }

    // Verificar si ya existe un accidente con el mismo incident_id
    if (data.incident_id) {
      try {
        const existing = await roadAccidentService.getAccidents({
          limit: 1000,
        });
        const duplicate = existing.find(
          (a) => a.incident_id === data.incident_id,
        );
        if (duplicate) {
          return reply.code(409).send({
            error: "Accidente ya existe",
            message: `Ya existe un registro con incident_id: ${data.incident_id}`,
            accident: serializeObject(duplicate),
          });
        }
      } catch (checkError) {
        // Si falla la verificación, continuar de todas formas
        console.warn("No se pudo verificar duplicados:", checkError);
      }
    }

    const accident = await roadAccidentService.createAccident({
      incident_id: data.incident_id,
      waze_data: data.waze_data || {},
      weather_data: data.weather_data || {},
      type: data.type || "ACCIDENT",
      subtype: data.subtype,
      severity: data.severity,
      street: data.street,
      location_lat: data.location_lat,
      location_lng: data.location_lng,
      operator_notes: data.operator_notes,
      accident_at: data.accident_at ? new Date(data.accident_at) : new Date(),
    });

    server.log.info(
      { accidentId: accident.id, incidentId: data.incident_id },
      "Siniestro registrado manualmente",
    );
    return serializeObject(accident);
  } catch (error) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error en POST /api/accidents",
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return reply.code(500).send({
      error: "Error creando el registro de siniestro",
      message:
        process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
});

// POST /api/accidents/:id/media - Subir archivos multimedia para un siniestro
server.post("/api/accidents/:id/media", async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const accident = await roadAccidentService.getAccidentById(id);

    if (!accident) {
      return reply.code(404).send({ error: "Siniestro no encontrado" });
    }

    const parts = request.files();
    const uploadedMedia = [];

    for await (const part of parts) {
      const fileName = Date.now() + "-" + part.filename;

      // Subir usando el servicio (que ahora es agnóstico al almacenamiento)
      const publicPath = await roadAccidentService.uploadMediaFile(
        fileName,
        part.file,
      );

      const DOCUMENT_MIMES = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      const fileType: "image" | "video" | "document" = part.mimetype.startsWith("video/")
        ? "video"
        : DOCUMENT_MIMES.includes(part.mimetype)
          ? "document"
          : "image";

      // Registrar en base de datos
      const mediaRecord = await roadAccidentService.addMedia({
        accident_id: id,
        file_path: publicPath,
        file_type: fileType,
        original_name: part.filename,
        // Nota: ya no podemos usar fs.statSync fácilmente con streams
        // pero el database lo tiene como opcional
      });

      uploadedMedia.push(mediaRecord);
    }

    return { success: true, media: uploadedMedia };
  } catch (error) {
    server.log.error(error);
    return reply
      .code(500)
      .send({ error: "Error subiendo archivos multimedia" });
  }
});

// PATCH /api/accidents/:id - Actualizar notas de un siniestro
server.patch<{ Params: { id: string }; Body: AccidentUpdate }>(
  "/api/accidents/:id",
  async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;

      const updated = await roadAccidentService.updateAccident(id, updates);
      if (!updated) {
        return reply.code(404).send({ error: "Siniestro no encontrado" });
      }

      return serializeObject(updated);
    } catch (error) {
      server.log.error(
        {
          error,
          url: request.url,
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Error en PATCH /api/accidents/:id",
      );
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return reply.code(500).send({
        error: "Error actualizando siniestro",
        message:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  },
);

// DELETE /api/accidents/:id - Eliminar registro de siniestro
server.delete("/api/accidents/:id", async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    // Opcional: Podríamos eliminar los archivos físicos aquí también

    const success = await roadAccidentService.deleteAccident(id);
    if (!success) {
      return reply.code(404).send({ error: "Siniestro no encontrado" });
    }

    return { success: true, message: "Registro eliminado" };
  } catch (error) {
    server.log.error(error);
    return reply.code(500).send({ error: "Error eliminando siniestro" });
  }
});

// PATCH /api/accidents/:id/weather - Obtener clima histórico para un accidente
server.patch("/api/accidents/:id/weather", async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const { force } = request.query as { force?: string };
    const forceRefresh = force === "true" || force === "1";

    server.log.info(
      { accidentId: id, forceRefresh },
      "Solicitando backfill de clima histórico",
    );

    const result = await roadAccidentService.backfillWeatherData(id, {
      force: forceRefresh,
    });

    if (!result.ok) {
      return reply.code(400).send({
        error: "No se pudo obtener clima histórico",
        reason: result.reason,
        message: weatherBackfillUserMessage(result.reason),
      });
    }

    const accident = await roadAccidentService.getAccidentById(
      result.accidentId,
    );

    server.log.info(
      { accidentId: id },
      "Clima histórico obtenido exitosamente",
    );
    return serializeObject(accident);
  } catch (error) {
    const accidentId = (request.params as { id: string }).id;
    server.log.error({ error, accidentId }, "Error obteniendo clima histórico");
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return reply.code(500).send({
      error: "Error obteniendo clima histórico",
      message:
        process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
});

const start = async () => {
  try {
    console.log("🔧 Inicializando servicios...");

    // Verificar que los servicios estén inicializados
    console.log("✓ apiService inicializado");
    console.log("✓ alertService inicializado");

    // Inicializar Repositorios
    try {
      RepositoryFactory.initialize(dbService.getPool());
      console.log("✓ RepositoryFactory inicializado");
    } catch (repoError) {
      console.error("❌ Error fatal al inicializar repositorios:", repoError);
      process.exit(1);
    }

    // Ejecutar migraciones de base de datos
    try {
      await runMigrations();
      console.log("✓ Migraciones de base de datos completadas");
    } catch (migrationError) {
      console.warn("⚠️ Error en migraciones (continuando):", migrationError);
    }

    // Iniciar polling de Waze con delay para no competir con API (login, km) por conexiones DB.
    // Delays escalonados para que cada servicio tome su cuota del pool sin saturarlo:
    //   - Waze   → 90 s  (66 feeds, mayor consumo de pool)
    //   - OpenMeteo → 180 s (66 polígonos, arranca cuando Waze ya se estabilizó)
    // DISABLE_WAZE_POLLING=1 desactiva polling si el pool DB se satura.
    const disableWazePoll = process.env.DISABLE_WAZE_POLLING === "1" || process.env.DISABLE_WAZE_POLLING === "true";
    if (!disableWazePoll) {
      try {
        setTimeout(() => {
          wazePollingService.startPolling();
          console.log("✓ WazePollingService iniciado (delay 90s para priorizar API)");
        }, 90000);
      } catch (pollingError) {
        console.error(
          "⚠️ Error al iniciar WazePollingService (continuando):",
          pollingError,
        );
      }
    } else {
      console.log("⏭️ WazePollingService deshabilitado (DISABLE_WAZE_POLLING=1)");
    }

    // Iniciar servicio de clima Open-Meteo
    // 180 s después del arranque: da tiempo a que WazePolling complete su primera
    // tanda y libere conexiones antes de pedir clima para los 66 polígonos.
    if (!disableWazePoll) {
      try {
        setTimeout(() => {
          openMeteoService.startPolling();
          console.log("✓ OpenMeteoService iniciado (clima cada hora, delay 180s)");
        }, 180000);
      } catch (weatherError) {
        console.error(
          "⚠️ Error al iniciar OpenMeteoService (continuando):",
          weatherError,
        );
      }
    }

    // Inicializar Socket.IO ANTES de listen para que el evento 'upgrade' del
    // servidor HTTP esté registrado desde el primer momento. Si se inicializa
    // después de listen, existe una ventana donde clientes pueden conectar pero
    // Socket.IO aún no está adjunto al servidor HTTP.
    try {
      await server.ready(); // Asegurar que Fastify esté listo antes de adjuntar Socket.IO
      websocketService.initialize(server.server);
      // wazePollingService.setSocketIO(websocketService.getIO()); // REMOVED: Using SocketSubscriber
      // Initialize Socket Subscriber
      new SocketSubscriber(websocketService.getIO());

      // Initialize event listeners
      const {
        AccidentCaptureListener,
        IncidentsHistoryListener,
        NotificationListener,
      } = await import("./listeners");
      new AccidentCaptureListener();
      new IncidentsHistoryListener();
      new NotificationListener(websocketService.getIO()!);

      try {
        await incidentSimulationService.initialize();
      } catch (simError) {
        console.warn(
          "⚠️ Error al inicializar bot de simulación (continuando):",
          simError,
        );
      }

      const { isRiskScoringEnabled } = await import("./config/features");
      if (isRiskScoringEnabled) {
        const { initRiskScoringListener } = await import(
          "./listeners/RiskScoringListener"
        );
        initRiskScoringListener();
        console.log("✓ RiskScoringListener initialized (ENABLE_RISK_SCORING=1)");
      } else {
        console.log("⏭️ RiskScoringListener deshabilitado (solo group-kpis-display)");
      }
      console.log("✓ Event listeners initialized");
      console.log("✓ WebSocket service initialized");
    } catch (wsError) {
      console.error("⚠️ Error al iniciar WebSocket (continuando):", wsError);
    }

    const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;
    await server.listen({ port, host: "0.0.0.0" });

    console.log("Backend server running on http://localhost:" + port);
    console.log("Health check: http://localhost:" + port + "/health");
  } catch (err) {
    console.error("❌ Error fatal al iniciar servidor:", err);
    server.log.error(err);
    process.exit(1);
  }
};

// =====================================================
// 🔄 GRACEFUL SHUTDOWN PARA TERMINACIÓN ORDENADA
// =====================================================

// Función para cerrar conexiones de manera ordenada
async function gracefulShutdown(signal: string) {
  console.log(`🛑 ${signal} received, shutting down gracefully...`);

  try {
    // Cerrar servidor HTTP
    console.log("⏳ Closing HTTP server...");
    await server.close();
    console.log("✅ HTTP server closed");

    // Cerrar conexiones de base de datos
    console.log("⏳ Closing database connections...");
    await dbService.close();
    console.log("✅ Database connections closed");

    // Detener polling de Waze
    console.log("⏳ Stopping WazePollingService...");
    wazePollingService.stopPolling();
    console.log("✅ WazePollingService stopped");

    // Detener polling de clima
    console.log("⏳ Stopping OpenMeteoService...");
    openMeteoService.stopPolling();
    console.log("✅ OpenMeteoService stopped");

    console.log("✅ Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during graceful shutdown:", error);
    process.exit(1);
  }
}

// Manejar señales de terminación para graceful shutdown
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Manejar señales específicas de Windows
if (process.platform === "win32") {
  process.on("SIGBREAK", () => gracefulShutdown("SIGBREAK"));
  process.on("SIGHUP", () => gracefulShutdown("SIGHUP"));
}

// =====================================================
// 📊 ENDPOINTS DE ANALÍTICA OPERATIVA
// =====================================================

/**
 * GET /api/analytics/realtime
 * Obtiene análisis operativo en tiempo real (priorización, clusters, alertas)
 */
server.get("/api/analytics/realtime", async (request, reply) => {
  try {
    const analysis = await wazeAnalyticsService.getOperationalAnalysis();
    reply.send(analysis);
  } catch (error) {
    server.log.error({ error }, "Error calculating operational analytics");
    reply.code(500).send({ error: "Failed to calculate analytics" });
  }
});

// =====================================================
// 🏥 FUNCIONES AUXILIARES DE HEALTH CHECKS
// =====================================================

// Función auxiliar para verificar salud de base de datos
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await dbService.query("SELECT 1 as health_check");
    return result.rows[0].health_check === 1;
  } catch (error) {
    server.log.error({ msg: "Database health check failed", error });
    return false;
  }
}

// Función auxiliar para verificar salud de servicios externos
async function checkServicesHealth(): Promise<boolean> {
  try {
    // Verificar que podemos hacer una consulta básica a Waze
    const alerts = await repositories().wazeAlerts.findAllActive();
    const incidents = alerts.map(toLegacyAlert);
    const hasIncidents = Array.isArray(incidents);

    // Verificar clima (si hay configurado)
    let weatherOk = true;
    if (process.env.WEATHER_PROVIDER) {
      try {
        // Intentar obtener clima de un punto conocido (Córdoba)
        await weatherService.fetchWeatherForPolygon(
          "health-check",
          -31.4167,
          -64.1833,
        );
      } catch {
        weatherOk = false;
      }
    }

    return hasIncidents && weatherOk;
  } catch (error) {
    server.log.error({ msg: "Services health check failed", error });
    return false;
  }
}

// Función auxiliar para formatear uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${Math.floor(seconds % 60)}s`);

  return parts.join(" ");
}

// Manejar errores no capturados
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

start();
