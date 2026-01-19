import Fastify from "fastify";
import cors from "@fastify/cors";
import { repositories } from "./repositories";
import { toLegacyAlert, toLegacyJam } from "./utils";
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
import { roadAccidentService } from "./services/roadAccidentService";
import { catalogSyncService } from "./services/catalogSyncService";
import { wazePollingService } from "./services/wazePollingService";
import { openMeteoService } from "./services/openMeteoService";
import { wazeAnalyticsService } from "./services/WazeAnalyticsService";
import { websocketService } from "./services/websocketService";
import rateLimit from "@fastify/rate-limit";
import {
  globalRateLimitConfig,
  rateLimitLoggingHook,
} from "./middleware/rateLimiter";
import axios from "axios";
import { runMigrations } from "./database/migrations/runMigrations";

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

// Configurar CORS
server.register(cors, {
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
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

// Hook global de manejo de errores
server.setErrorHandler((error: Error, request, reply) => {
  server.log.error(
    {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    },
    "Error en servidor"
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

// ============================================================================
// 🔧 FUNCIONES DE SERIALIZACIÓN
// ============================================================================

/**
 * Serializa objetos Date a strings ISO para evitar errores de serialización JSON
 */
function serializeDate(date: Date | undefined | null): string | null {
  if (!date) return null;
  if (!(date instanceof Date)) return null;
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Serializa un array de alertas convirtiendo Date a ISO string
 */
function serializeAlerts(alerts: any[]): any[] {
  return alerts.map((alert) => ({
    ...alert,
    timestamp: serializeDate(alert.timestamp),
  }));
}

/**
 * Serializa un array de jams convirtiendo Date a ISO string
 */
function serializeJams(jams: any[]): any[] {
  return jams.map((jam) => ({
    ...jam,
    timestamp: serializeDate(jam.timestamp),
  }));
}

/**
 * Serializa cualquier objeto recursivamente convirtiendo Date a ISO string
 */
function serializeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Date) {
    return serializeDate(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeObject(item));
  }

  if (typeof obj === "object") {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeObject(obj[key]);
      }
    }
    return serialized;
  }

  // Para valores NaN, convertirlos a null
  if (typeof obj === "number" && isNaN(obj)) {
    return null;
  }

  return obj;
}

// =====================================================
// 🎨 ENDPOINT DE PROXY DE ICONOS DE WAZE
// =====================================================

// GET /api/icons/:iconName - Proxy para iconos de Waze con autenticación
server.get("/api/icons/:iconName", async (request, reply) => {
  const { iconName } = request.params as { iconName: string };
  const wazeIconBase =
    "https://web-assets.waze.com/webapps/partnerhub-web/1.1.1333/assets/icons/alerts";

  try {
    // Construir URL del icono
    const iconUrl = `${wazeIconBase}/${iconName}.svg`;

    // Intentar obtener el icono con autenticación si está configurada
    const axiosConfig: any = {
      responseType: "arraybuffer",
      timeout: 5000,
      headers: {
        Referer: "https://www.waze.com/partnerhub",
        "User-Agent": "Mozilla/5.0 (compatible; WazeMonitor/1.0)",
      },
    };

    // Agregar cookie de sesión si está configurada
    if (process.env.WAZE_SESSION_COOKIE) {
      axiosConfig.headers["Cookie"] = process.env.WAZE_SESSION_COOKIE;
    }

    // Agregar headers de autenticación si están disponibles
    if (process.env.WAZE_PARTNER_ID) {
      axiosConfig.headers["X-Partner-ID"] = process.env.WAZE_PARTNER_ID;
    }

    console.log(`🔄 Solicitando icono: ${iconName} desde ${iconUrl}`);

    const response = await axios.get(iconUrl, axiosConfig);

    // Configurar headers de respuesta
    reply.header("Content-Type", "image/svg+xml");
    reply.header("Cache-Control", "public, max-age=3600"); // Cache 1 hora
    reply.header("Access-Control-Allow-Origin", "*");

    console.log(
      `✅ Icono ${iconName} obtenido exitosamente (${response.data.length} bytes)`
    );
    return Buffer.from(response.data);
  } catch (error: any) {
    console.warn(`⚠️ Error obteniendo icono ${iconName}:`, error.message);

    // Intentar con iconos locales como fallback
    try {
      // Si el icono falla, intentar obtener hazard.svg como fallback
      if (iconName !== "hazard") {
        const fallbackUrl = `${wazeIconBase}/hazard.svg`;
        console.log(`🔄 Intentando fallback con hazard.svg para ${iconName}`);

        const fallbackResponse = await axios.get(fallbackUrl, {
          responseType: "arraybuffer",
          timeout: 3000,
          headers: {
            Referer: "https://www.waze.com/partnerhub",
          },
        });

        reply.header("Content-Type", "image/svg+xml");
        reply.header("Cache-Control", "public, max-age=3600");
        reply.header("Access-Control-Allow-Origin", "*");

        console.log(`✅ Fallback exitoso: hazard.svg usado para ${iconName}`);
        return Buffer.from(fallbackResponse.data);
      }
    } catch (fallbackError) {
      console.error(
        `❌ Fallback también falló para ${iconName}:`,
        (fallbackError as any)?.message || fallbackError
      );
    }

    // Si todo falla, devolver un SVG inline simple
    const fallbackSvg = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="20" fill="#6b7280"/>
            <text x="24" y="30" text-anchor="middle" fill="white" font-size="16" font-family="Arial">${iconName
              .charAt(0)
              .toUpperCase()}</text>
        </svg>`;

    reply.header("Content-Type", "image/svg+xml");
    reply.header("Cache-Control", "public, max-age=300");
    reply.header("Access-Control-Allow-Origin", "*");

    console.log(`📝 Usando SVG inline como último fallback para ${iconName}`);
    return fallbackSvg;
  }
});

// =====================================================
// 📤 ENDPOINT DE CARGA DE ICONOS SVG
// =====================================================

// POST /api/upload/icon - Upload SVG icon file
server.post("/api/upload/icon", async (request, reply) => {
  try {
    const data = await request.file();

    if (!data) {
      reply.code(400).send({ error: "No file uploaded" });
      return;
    }

    // Validar que sea SVG
    if (data.mimetype !== "image/svg+xml") {
      reply.code(400).send({
        error: "Invalid file type",
        message: "Only SVG files are allowed",
      });
      return;
    }

    // Usar el nombre original del archivo (sin path traversal)
    const originalFilename = data.filename.replace(/^.*[\\\/]/, "");

    // Validar que el nombre sea seguro
    if (!/^[a-z0-9_-]+\.svg$/i.test(originalFilename)) {
      reply.code(400).send({
        error: "Invalid filename",
        message:
          "Filename must contain only letters, numbers, underscores, hyphens and .svg extension",
      });
      return;
    }

    // Carpeta de iconos precargados en el frontend
    const iconsDir = path.join(
      __dirname,
      "../../frontend/public/icons/waze/iconos_svg"
    );

    // Crear directorio si no existe
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    // Guardar archivo (reemplazará si ya existe)
    const filepath = path.join(iconsDir, originalFilename);
    const buffer = await data.toBuffer();
    fs.writeFileSync(filepath, buffer);

    // Retornar la ruta relativa que se usará en el frontend
    const publicUrl = `/icons/waze/iconos_svg/${originalFilename}`;

    server.log.info(
      `✅ Icon uploaded/updated: ${originalFilename} -> ${publicUrl}`
    );

    reply.send({
      success: true,
      url: publicUrl,
      filename: originalFilename,
      message:
        "Icon uploaded successfully. It will be available after page reload.",
    });
  } catch (error: any) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error uploading icon"
    );
    reply.code(500).send({
      error: "Failed to upload icon",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Endpoint de prueba simple
server.get("/api/test", async () => {
  return {
    message: "Backend is running!",
    timestamp: new Date().toISOString(),
  };
});

// =====================================================
// 🏥 HEALTH CHECKS PARA MONITOREO Y ORQUESTACIÓN
// =====================================================

// GET /health - Health check completo para monitoreo
server.get("/health", async (request, reply) => {
  const startTime = Date.now();

  try {
    // Verificar conexión a base de datos
    const dbHealthy = await checkDatabaseHealth();

    // Verificar servicios externos (Waze, clima)
    const servicesHealthy = await checkServicesHealth();

    // Calcular uptime
    const uptime = process.uptime();

    // Información del sistema
    const health = {
      status: dbHealthy && servicesHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: uptime,
      uptimeFormatted: formatUptime(uptime),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      checks: {
        database: {
          status: dbHealthy ? "healthy" : "unhealthy",
          responseTime: Date.now() - startTime,
        },
        services: {
          status: servicesHealthy ? "healthy" : "unhealthy",
          responseTime: Date.now() - startTime,
        },
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
        external: Math.round(process.memoryUsage().external / 1024 / 1024), // MB
      },
    };

    const statusCode = health.status === "healthy" ? 200 : 503;
    reply.code(statusCode).send(health);
  } catch (error) {
    server.log.error({ msg: "Health check failed", error });
    reply.code(503).send({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
    });
  }
});

// GET /health/live - Liveness probe (Kubernetes/Docker)
server.get("/health/live", async (request, reply) => {
  reply.code(200).send({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// GET /health/ready - Readiness probe (Kubernetes/Docker)
server.get("/health/ready", async (request, reply) => {
  try {
    // Verificar base de datos
    const dbReady = await checkDatabaseHealth();

    if (dbReady) {
      reply.code(200).send({
        status: "ready",
        timestamp: new Date().toISOString(),
        database: "connected",
      });
    } else {
      reply.code(503).send({
        status: "not ready",
        timestamp: new Date().toISOString(),
        database: "disconnected",
      });
    }
  } catch (error) {
    reply.code(503).send({
      status: "not ready",
      timestamp: new Date().toISOString(),
      error: "Readiness check failed",
    });
  }
});

// =====================================================
// 📋 ENDPOINTS DE GESTIÓN DE CATÁLOGOS
// =====================================================

// POST /api/catalogs/sync - Sincronizar catálogos desde feeds de Waze
server.post("/api/catalogs/sync", async (request, reply) => {
  try {
    console.log("🔄 Iniciando sincronización de catálogos desde Waze...");
    const result = await catalogSyncService.syncFromWazeFeeds();

    reply.send({
      success: true,
      message: "Sincronización completada exitosamente",
      data: result,
    });

    console.log(
      `✅ Sincronización completada: ${result.newTypes} nuevos tipos, ${result.newSubtypes} nuevos subtipos`
    );
  } catch (error) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error sincronizando catálogos"
    );
    reply.code(500).send({
      error: "Failed to sync catalogs",
      message: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

// GET /api/catalogs - Obtener todos los tipos de incidentes con subtipos
server.get("/api/catalogs", async (request, reply) => {
  try {
    const catalogs = await catalogSyncService.getAllIncidentTypes();
    reply.send(serializeObject(catalogs));
  } catch (error) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error obteniendo catálogos"
    );
    reply.code(500).send({ error: "Failed to get catalogs" });
  }
});

// GET /api/catalogs/stats - Estadísticas de uso de catálogos
server.get("/api/catalogs/stats", async (request, reply) => {
  try {
    const stats = await catalogSyncService.getCatalogUsageStats();
    reply.send(serializeObject(stats));
  } catch (error) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error obteniendo estadísticas de catálogos"
    );
    reply.code(500).send({ error: "Failed to get catalog stats" });
  }
});

// POST /api/catalogs/types - Crear nuevo tipo de incidente
server.post("/api/catalogs/types", async (request, reply) => {
  try {
    const { code, name, description, icon, color } = request.body as any;

    if (!code || !name) {
      reply.code(400).send({ error: "Code and name are required" });
      return;
    }

    // Verificar que no exista
    const existing = await dbService.query(
      "SELECT id FROM incident_types WHERE code = $1",
      [code]
    );
    if (existing.rows.length > 0) {
      reply.code(409).send({ error: "Type code already exists" });
      return;
    }

    const result = await dbService.query(
      `
            INSERT INTO incident_types (code, name, description, icon, color, is_active, created_at, updated_at, icon_url)
            VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6)
            RETURNING *
        `,
      [
        code,
        name,
        description || "",
        icon || "alert-triangle",
        color || "#6b7280",
        (request.body as any).icon_url || null,
      ]
    );

    reply.send(serializeObject(result.rows[0]));
  } catch (error) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error creando tipo de incidente"
    );
    reply.code(500).send({ error: "Failed to create incident type" });
  }
});

// PUT /api/catalogs/types/:id - Actualizar tipo de incidente
server.put("/api/catalogs/types/:id", async (request, reply) => {
  try {
    const id = parseInt((request.params as any).id);
    const { code, name, description, icon, color, is_active, icon_url } =
      request.body as any;

    // Log para debug
    server.log.info(
      {
        id,
        code,
        name,
        description,
        icon,
        color,
        is_active,
        icon_url,
      },
      "Actualizando tipo de incidente"
    );

    // Validar campos requeridos
    if (!name) {
      reply.code(400).send({ error: "Name is required" });
      return;
    }

    const result = await dbService.query(
      `
            UPDATE incident_types
            SET code = $1, name = $2, description = $3, icon = $4, color = $5, is_active = $6, icon_url = $7, updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `,
      [
        code || null,
        name,
        description || null,
        icon || null,
        color || null,
        is_active !== undefined ? is_active : true,
        icon_url || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      reply.code(404).send({ error: "Incident type not found" });
      return;
    }

    reply.send(serializeObject(result.rows[0]));
  } catch (error) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error actualizando tipo de incidente"
    );
    reply.code(500).send({ error: "Failed to update incident type" });
  }
});

// POST /api/catalogs/subtypes - Crear nuevo subtipo de incidente
server.post("/api/catalogs/subtypes", async (request, reply) => {
  try {
    const { type_id, code, name, description, severity } = request.body as any;

    if (!type_id || !code || !name) {
      reply.code(400).send({ error: "type_id, code and name are required" });
      return;
    }

    // Verificar que el tipo existe
    const typeExists = await dbService.query(
      "SELECT id FROM incident_types WHERE id = $1",
      [type_id]
    );
    if (typeExists.rows.length === 0) {
      reply.code(400).send({ error: "Invalid type_id" });
      return;
    }

    // Verificar que no exista el subtipo
    const existing = await dbService.query(
      "SELECT id FROM incident_subtypes WHERE type_id = $1 AND code = $2",
      [type_id, code]
    );
    if (existing.rows.length > 0) {
      reply
        .code(409)
        .send({ error: "Subtype code already exists for this type" });
      return;
    }

    const result = await dbService.query(
      `
            INSERT INTO incident_subtypes (type_id, code, name, description, severity, is_active, created_at, updated_at, icon_url)
            VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6)
            RETURNING *
        `,
      [
        type_id,
        code,
        name,
        description || "",
        severity || "MEDIUM",
        (request.body as any).icon_url || null,
      ]
    );

    reply.send(serializeObject(result.rows[0]));
  } catch (error) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error creando subtipo de incidente"
    );
    reply.code(500).send({ error: "Failed to create incident subtype" });
  }
});

// PUT /api/catalogs/subtypes/:id - Actualizar subtipo de incidente
server.put("/api/catalogs/subtypes/:id", async (request, reply) => {
  try {
    const id = parseInt((request.params as any).id);
    const { name, description, severity, is_active, icon_url } =
      request.body as any;

    const result = await dbService.query(
      `
            UPDATE incident_subtypes
            SET name = $1, description = $2, severity = $3, is_active = $4, icon_url = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `,
      [name, description, severity, is_active, icon_url, id]
    );

    if (result.rows.length === 0) {
      reply.code(404).send({ error: "Incident subtype not found" });
      return;
    }

    reply.send(serializeObject(result.rows[0]));
  } catch (error) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error actualizando subtipo de incidente"
    );
    reply.code(500).send({ error: "Failed to update incident subtype" });
  }
});

// DELETE /api/catalogs/types/:id - Eliminar tipo de incidente
server.delete("/api/catalogs/types/:id", async (request, reply) => {
  try {
    const id = parseInt((request.params as any).id);

    // Verificar si hay subtipos asociados
    const subtypes = await dbService.query(
      "SELECT COUNT(*) as count FROM incident_subtypes WHERE type_id = $1",
      [id]
    );
    if (subtypes.rows[0].count > 0) {
      reply.code(400).send({
        error: "Cannot delete type with associated subtypes",
        message: `This type has ${subtypes.rows[0].count} subtypes. Delete them first.`,
      });
      return;
    }

    const result = await dbService.query(
      "DELETE FROM incident_types WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      reply.code(404).send({ error: "Incident type not found" });
      return;
    }

    reply.send({
      success: true,
      message: "Incident type deleted successfully",
    });
  } catch (error) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error eliminando tipo de incidente"
    );
    reply.code(500).send({ error: "Failed to delete incident type" });
  }
});

// DELETE /api/catalogs/subtypes/:id - Eliminar subtipo de incidente
server.delete("/api/catalogs/subtypes/:id", async (request, reply) => {
  try {
    const id = parseInt((request.params as any).id);
    const result = await dbService.query(
      "DELETE FROM incident_subtypes WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      reply.code(404).send({ error: "Incident subtype not found" });
      return;
    }

    reply.send({
      success: true,
      message: "Incident subtype deleted successfully",
    });
  } catch (error) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error eliminando subtipo de incidente"
    );
    reply.code(500).send({ error: "Failed to delete incident subtype" });
  }
});

// =====================================================
// 🚗 ENDPOINTS DE ACCIDENTES RAC (Road Accidents)
// =====================================================

/**
 * GET /api/road-accidents/map
 * Obtiene accidentes RAC para visualización en el mapa con filtros de fecha
 * Query params: startDate, endDate, polygonId (opcional)
 */
server.get("/api/road-accidents/map", async (request, reply) => {
  try {
    const { startDate, endDate, polygonId } = request.query as {
      startDate?: string;
      endDate?: string;
      polygonId?: string;
    };

    // Validar parámetros requeridos
    if (!startDate || !endDate) {
      reply.code(400).send({
        error: "startDate and endDate are required",
        message: "Please provide both startDate and endDate in ISO format",
      });
      return;
    }

    // Construir query con filtros
    let query = `
      SELECT
        id,
        location_lat,
        location_lng,
        severity,
        occurred_at,
        description,
        media_urls,
        polygon_id,
        created_at
      FROM road_accidents
      WHERE occurred_at BETWEEN $1 AND $2
        AND location_lat IS NOT NULL
        AND location_lng IS NOT NULL
    `;

    const params: any[] = [startDate, endDate];

    // Filtro opcional por polígono
    if (polygonId) {
      query += ` AND polygon_id = $3`;
      params.push(polygonId);
    }

    // Ordenar por fecha más reciente y limitar resultados
    query += ` ORDER BY occurred_at DESC LIMIT 500`;

    const result = await dbService.query(query, params);

    // Transformar datos para el mapa
    const accidents = result.rows.map((row) => ({
      id: row.id,
      lat: parseFloat(row.location_lat),
      lng: parseFloat(row.location_lng),
      severity: row.severity,
      occurredAt: row.occurred_at,
      description: row.description,
      mediaUrls: row.media_urls || [],
      polygonId: row.polygon_id,
      createdAt: row.created_at,
    }));

    reply.send(serializeObject(accidents));

    server.log.info(
      `📍 Accidentes RAC obtenidos: ${accidents.length} (${startDate} - ${endDate})`
    );
  } catch (error) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error obteniendo accidentes RAC para mapa"
    );
    reply.code(500).send({
      error: "Failed to get road accidents for map",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// --- Endpoints de Polígonos (Gestión) ---

/**
 * GET /api/polygons
 * Obtiene todos los polígonos desde la base de datos
 */
server.get("/api/polygons", async (request, reply) => {
  try {
    const polygons = await repositories().polygons.findAll();
    reply.send(serializeObject(polygons));
  } catch (error) {
    server.log.error({ error }, "Error al obtener polígonos");
    reply.code(500).send({ error: "Failed to get polygons" });
  }
});

/**
 * POST /api/polygons/sync
 * Sincroniza los polígonos iniciales desde el archivo estático a la base de datos
 */
server.post("/api/polygons/sync", async (request, reply) => {
  try {
    console.log("🔄 Sincronizando polígonos desde configuración estática...");
    let added = 0;
    let updated = 0;

    for (const poly of REAL_POLYGONS) {
      const existing = await repositories().polygons.findById(poly.id);
      if (existing) {
        await repositories().polygons.update(poly.id, poly);
        updated++;
      } else {
        await repositories().polygons.create(poly);
        added++;
      }
    }

    reply.send({
      success: true,
      message: `Sincronización completada: ${added} añadidos, ${updated} actualizados`,
      data: { added, updated },
    });
  } catch (error) {
    server.log.error({ error }, "Error al sincronizar polígonos");
    reply.code(500).send({
      error: "Sync failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/polygons
 * Crea un nuevo polígono
 */
server.post("/api/polygons", async (request, reply) => {
  try {
    const data = request.body as Partial<RealPolygonConfig>;
    if (!data.id || !data.name || !data.feedUrl) {
      reply.code(400).send({ error: "id, name and feedUrl are required" });
      return;
    }

    const result = await repositories().polygons.create(data);
    reply.send(serializeObject(result));
  } catch (error) {
    server.log.error({ error }, "Error al crear polígono");
    reply.code(500).send({ error: "Failed to create polygon" });
  }
});

/**
 * PUT /api/polygons/:id
 * Actualiza un polígono existente
 */
server.put("/api/polygons/:id", async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const data = request.body as Partial<RealPolygonConfig>;

    const result = await repositories().polygons.update(id, data);
    if (!result) {
      reply.code(404).send({ error: "Polygon not found" });
      return;
    }

    reply.send(serializeObject(result));
  } catch (error) {
    server.log.error({ error }, "Error al actualizar polígono");
    reply.code(500).send({ error: "Failed to update polygon" });
  }
});

/**
 * DELETE /api/polygons/:id
 * Elimina (soft delete) un polígono
 */
server.delete("/api/polygons/:id", async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const success = await repositories().polygons.delete(id);

    if (!success) {
      reply.code(404).send({ error: "Polygon not found" });
      return;
    }

    reply.send({ success: true, message: "Polygon deleted successfully" });
  } catch (error) {
    server.log.error({ error }, "Error al eliminar polígono");
    reply.code(500).send({ error: "Failed to delete polygon" });
  }
});

server.get("/api/kpis/global", async (request, reply) => {
  try {
    const kpis = await apiService.getGlobalKPIs();
    return serializeObject(kpis);
  } catch (error) {
    server.log.error({ error, url: request.url }, "Error en /api/kpis/global");
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    reply.code(500).send({
      error: "Failed to get global KPIs",
      message:
        process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
});

server.get("/api/traffic-metrics", async (request, reply) => {
  try {
    const metrics = await apiService.getAllTrafficMetrics();
    return serializeObject(metrics);
  } catch (error) {
    server.log.error(
      { error, url: request.url },
      "Error en /api/traffic-metrics"
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    reply.code(500).send({
      error: "Failed to get traffic metrics",
      message:
        process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
});

server.get("/api/traffic-metrics/:polygonId", async (request, reply) => {
  try {
    const { polygonId } = request.params as { polygonId: string };
    const metrics = await apiService.getTrafficMetricsByPolygon(polygonId);

    if (!metrics) {
      reply.code(404).send({ error: "Polygon not found" });
      return;
    }

    return metrics;
  } catch (error) {
    server.log.error(
      { error, url: request.url },
      "Error en /api/traffic-metrics/:polygonId"
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    reply.code(500).send({
      error: "Failed to get polygon traffic metrics",
      message:
        process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
});

// --- Endpoints de Alertas ---

server.get("/api/alerts", async (request, reply) => {
  try {
    const alerts = alertService.getActiveAlerts();
    return serializeObject(alerts || []);
  } catch (error) {
    server.log.error({ error, url: request.url }, "Error en /api/alerts");
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    reply.code(500).send({
      error: "Failed to get alerts",
      message:
        process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
});

server.get("/api/alerts/stats", async (request, reply) => {
  try {
    const stats = alertService.getAlertStats();
    return serializeObject(stats);
  } catch (error) {
    server.log.error({ error, url: request.url }, "Error en /api/alerts/stats");
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    reply.code(500).send({
      error: "Failed to get alert stats",
      message:
        process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
});

server.get("/api/alerts/severity/:severity", async (request, reply) => {
  try {
    const { severity } = request.params as { severity: string };
    return alertService.getAlertsBySeverity(
      severity as "critical" | "high" | "medium" | "low"
    );
  } catch (_error) {
    reply.code(500).send({ error: "Failed to get alerts by severity" });
  }
});

server.get("/api/alerts/polygon/:polygonId", async (request, reply) => {
  try {
    const { polygonId } = request.params as { polygonId: string };
    return alertService.getAlertsByPolygon(polygonId);
  } catch (_error) {
    reply.code(500).send({ error: "Failed to get alerts by polygon" });
  }
});

server.post("/api/alerts/:alertId/acknowledge", async (request, reply) => {
  try {
    const { alertId } = request.params as { alertId: string };
    const body = request.body as { acknowledgedBy?: string };

    const success = alertService.acknowledgeAlert(alertId, body.acknowledgedBy);

    if (!success) {
      reply.code(404).send({ error: "Alert not found" });
      return;
    }

    return { success: true, message: "Alert acknowledged" };
  } catch (error) {
    reply.code(500).send({ error: "Failed to acknowledge alert" });
  }
});

// --- Endpoints de Métricas Agregadas ---

server.get("/api/metrics/global", async (request, reply) => {
  try {
    const jams = await repositories().wazeJams.findAllActive();
    const alerts = await repositories().wazeAlerts.findAllActive();
    const trafficMetrics = await apiService.getAllTrafficMetrics(); // Now async

    const globalMetrics = aggregationService.calculateGlobalMetrics(
      jams,
      alerts,
      trafficMetrics
    );
    return globalMetrics;
  } catch (error) {
    reply.code(500).send({ error: "Failed to get global metrics" });
  }
});

server.get("/api/metrics/top-critical", async (request, reply) => {
  try {
    const limit = parseInt(
      (request.query as { limit?: string })?.limit || "10"
    );
    const jams = await repositories().wazeJams.findAllActive();
    const alerts = await repositories().wazeAlerts.findAllActive();

    const topCritical = aggregationService.getTopCriticalPolygons(
      jams,
      alerts,
      limit
    );
    return topCritical;
  } catch (error) {
    reply.code(500).send({ error: "Failed to get top critical polygons" });
  }
});

// --- Endpoints de Histórico ---

server.get("/api/historical/global", async (request, reply) => {
  try {
    const hours = parseInt(
      (request.query as { hours?: string })?.hours || "24"
    );
    const snapshots = await historicalService.getGlobalSnapshots(hours);
    return serializeObject(snapshots || []);
  } catch (error) {
    server.log.error(
      { error, url: request.url },
      "Error en /api/historical/global"
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    reply.code(500).send({
      error: "Failed to get historical data",
      message:
        process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
});

server.get("/api/historical/polygon/:polygonId", async (request, reply) => {
  try {
    const { polygonId } = request.params as { polygonId: string };
    const hours = parseInt(
      (request.query as { hours?: string })?.hours || "24"
    );
    const snapshots = await historicalService.getPolygonSnapshots(
      polygonId,
      hours
    );
    return snapshots;
  } catch (_error) {
    reply.code(500).send({ error: "Failed to get polygon historical data" });
  }
});

server.get("/api/historical/trends", async (request, reply) => {
  try {
    const [totalJams, avgSpeed, criticalKm, avgDelay] = await Promise.all([
      historicalService.calculateTrends("totalJams"),
      historicalService.calculateTrends("avgSpeed"),
      historicalService.calculateTrends("criticalKm"),
      historicalService.calculateTrends("avgDelay"),
    ]);
    return serializeObject({
      totalJams: totalJams || { current: 0, trend: "stable", percentChange: 0 },
      avgSpeed: avgSpeed || { current: 0, trend: "stable", percentChange: 0 },
      criticalKm: criticalKm || {
        current: 0,
        trend: "stable",
        percentChange: 0,
      },
      avgDelay: avgDelay || { current: 0, trend: "stable", percentChange: 0 },
    });
  } catch (error) {
    server.log.error(
      { error, url: request.url },
      "Error en /api/historical/trends"
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    reply.code(500).send({
      error: "Failed to get trends",
      message:
        process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
});

server.get("/api/historical/availability", async (request, reply) => {
  try {
    return await historicalService.getDataAvailability();
  } catch (error) {
    reply.code(500).send({ error: "Failed to get data availability" });
  }
});

// --- Endpoints de Calidad de Datos ---

/**
 * GET /api/data-quality/report
 * Genera reporte completo de calidad de datos
 */
server.get("/api/data-quality/report", async (request, reply) => {
  try {
    const alerts = await repositories().wazeAlerts.findAllActive();
    const incidents = alerts.map(toLegacyAlert);
    const report = dataQualityService.generateQualityReport(incidents);

    // Convertir Map a objeto para JSON
    const reportJson = {
      timestamp: report.timestamp,
      metrics: report.metrics,
      byPolygon: Object.fromEntries(report.byPolygon),
      lowQualityIncidents: report.lowQualityIncidents,
    };

    return reportJson;
  } catch (error) {
    reply.code(500).send({ error: "Failed to generate quality report" });
  }
});

/**
 * GET /api/data-quality/metrics
 * Obtiene métricas globales de calidad
 */
server.get("/api/data-quality/metrics", async (request, reply) => {
  try {
    const alerts = await repositories().wazeAlerts.findAllActive();
    const incidents = alerts.map(toLegacyAlert);
    const metrics = dataQualityService.calculateQualityMetrics(incidents);
    return metrics;
  } catch (error) {
    reply.code(500).send({ error: "Failed to get quality metrics" });
  }
});

/**
 * GET /api/data-quality/incidents/high-quality
 * Obtiene solo incidentes de alta calidad
 */
server.get(
  "/api/data-quality/incidents/high-quality",
  async (request, reply) => {
    try {
      const alerts = await repositories().wazeAlerts.findAllActive();
      const incidents = alerts.map(toLegacyAlert);
      const highQuality = dataQualityService.getHighQualityIncidents(incidents);
      return highQuality;
    } catch (error) {
      reply.code(500).send({ error: "Failed to get high quality incidents" });
    }
  }
);

/**
 * GET /api/data-quality/incidents/prioritized
 * Obtiene incidentes priorizados por calidad y severidad
 */
server.get(
  "/api/data-quality/incidents/prioritized",
  async (request, reply) => {
    try {
      const alerts = await repositories().wazeAlerts.findAllActive();
      const incidents = alerts.map(toLegacyAlert);
      const prioritized = dataQualityService.prioritizeIncidents(incidents);
      return prioritized;
    } catch (error) {
      reply.code(500).send({ error: "Failed to prioritize incidents" });
    }
  }
);

/**
 * GET /api/data-quality/incidents/stale
 * Detecta incidentes que probablemente ya no son válidos
 */
server.get("/api/data-quality/incidents/stale", async (request, reply) => {
  try {
    const maxAge = parseInt(
      (request.query as { maxAge?: string })?.maxAge || "30"
    ); // minutos
    const alerts = await repositories().wazeAlerts.findAllActive();
    const incidents = alerts.map(toLegacyAlert);
    const stale = dataQualityService.detectStaleIncidents(incidents, maxAge);
    return stale;
  } catch (_error) {
    reply.code(500).send({ error: "Failed to detect stale incidents" });
  }
});

/**
 * GET /api/data-quality/feed-status
 * Verifica si se alcanzó el límite de eventos de Waze (5000)
 */
server.get("/api/data-quality/feed-status", async (request, reply) => {
  try {
    const alerts = await repositories().wazeAlerts.findAllActive();
    const jamsData = await repositories().wazeJams.findAllActive();
    const incidents = alerts.map(toLegacyAlert);
    const jams = jamsData.map(toLegacyJam);
    const status = dataQualityService.checkFeedLimit(incidents, jams);
    return status;
  } catch (error) {
    reply.code(500).send({ error: "Failed to check feed status" });
  }
});

/**
 * GET /api/data-quality/thresholds
 * Obtiene los umbrales configurados actualmente
 */
server.get("/api/data-quality/thresholds", async (request, reply) => {
  try {
    return dataQualityService.getThresholds();
  } catch (error) {
    reply.code(500).send({ error: "Failed to get thresholds" });
  }
});

/**
 * POST /api/data-quality/thresholds
 * Actualiza umbrales de calidad dinámicamente
 */
server.post("/api/data-quality/thresholds", async (request, reply) => {
  try {
    const updates = request.body as any;
    dataQualityService.updateThresholds(updates);
    return {
      success: true,
      message: "Thresholds updated",
      current: dataQualityService.getThresholds(),
    };
  } catch (error) {
    reply.code(500).send({ error: "Failed to update thresholds" });
  }
});

// --- Endpoints de Datos Raw para Mapa ---

/**
 * GET /api/incidents/all
 * Obtiene todos los incidentes activos formateados para el mapa
 */
server.get("/api/incidents/all", async (request, reply) => {
  try {
    const alertsData = await repositories().wazeAlerts.findAllActive();
    const incidents = alertsData.map(toLegacyAlert);
    return incidents;
  } catch (error) {
    server.log.error({ error }, "Error retrieving all incidents");
    reply.code(500).send({
      error: "Failed to retrieve incidents",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
});

/**
 * GET /api/jams/all
 * Obtiene todos los jams activos formateados para el mapa
 */
server.get("/api/jams/all", async (request, reply) => {
  try {
    const jamsData = await repositories().wazeJams.findAllActive();
    const jams = jamsData.map(toLegacyJam);
    return jams;
  } catch (error) {
    server.log.error({ error }, "Error retrieving all jams");
    reply.code(500).send({ error: "Failed to retrieve jams" });
  }
});

// --- Endpoints de Estadísticas de Incidentes ---

/**
 * GET /api/incidents/stats/global
 * Obtiene estadísticas globales de tipos y subtipos de incidentes
 */
server.get("/api/incidents/stats/global", async (request, reply) => {
  try {
    const alertsData = await repositories().wazeAlerts.findAllActive();
    const jamsData = await repositories().wazeJams.findAllActive();
    const alerts = alertsData.map(toLegacyAlert);
    const jams = jamsData.map(toLegacyJam);
    const stats = incidentStatsService.getGlobalStats(alerts, jams);
    return stats;
  } catch (error) {
    reply.code(500).send({ error: "Failed to get global incident stats" });
  }
});

/**
 * GET /api/incidents/stats/polygon/:polygonId
 * Obtiene estadísticas detalladas de incidentes para un polígono específico
 */
server.get(
  "/api/incidents/stats/polygon/:polygonId",
  async (request, reply) => {
    try {
      const { polygonId } = request.params as { polygonId: string };
      const polygon = REAL_POLYGONS.find((p) => p.id === polygonId);

      if (!polygon) {
        reply.code(404).send({ error: "Polygon not found" });
        return;
      }

      const alertsData = await repositories().wazeAlerts.findAllActive();
      const jamsData = await repositories().wazeJams.findAllActive();
      const alerts = alertsData.map(toLegacyAlert);
      const jams = jamsData.map(toLegacyJam);
      const stats = incidentStatsService.getPolygonStats(
        polygonId,
        polygon.name,
        alerts,
        jams
      );

      return stats;
    } catch (error) {
      reply.code(500).send({ error: "Failed to get polygon incident stats" });
    }
  }
);

/**
 * GET /api/incidents/types-summary
 * Resumen rápido de tipos de incidentes activos
 */
server.get("/api/incidents/types-summary", async (request, reply) => {
  try {
    const alertsData = await repositories().wazeAlerts.findAllActive();
    const alerts = alertsData.map(toLegacyAlert);

    // Agrupar por tipo
    const typeCounts = new Map<string, number>();
    for (const alert of alerts) {
      const count = typeCounts.get(alert.type) || 0;
      typeCounts.set(alert.type, count + 1);
    }

    const summary = Array.from(typeCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        emoji: incidentStatsService.getIncidentEmoji(type),
      }))
      .sort((a, b) => b.count - a.count);

    return summary;
  } catch (error) {
    reply.code(500).send({ error: "Failed to get incident types summary" });
  }
});

// --- Endpoints de Cálculo Mejorado de Demoras ---

/**
 * GET /api/incidents/delay/:incidentId
 * Calcula la demora mejorada para un incidente específico
 * Usa: proximidad geográfica, estimación de desvío, y datos históricos
 */
server.get("/api/incidents/delay/:incidentId", async (request, reply) => {
  try {
    const { incidentId } = request.params as { incidentId: string };

    const alertsData = await repositories().wazeAlerts.findAllActive();
    const jamsData = await repositories().wazeJams.findAllActive();
    const alerts = alertsData.map(toLegacyAlert);
    const jams = jamsData.map(toLegacyJam);
    const incident = alerts.find((a) => a.id === incidentId);

    if (!incident) {
      reply.code(404).send({ error: "Incident not found" });
      return;
    }

    // Obtener datos históricos si están disponibles
    const historicalData = await historicalService.getGlobalSnapshots(24);

    const delayResult = delayCalculationService.calculateIncidentDelay(
      incident,
      jams,
      historicalData
    );

    return {
      incidentId,
      incidentType: incident.type,
      incidentSubtype: incident.subtype,
      location: incident.location,
      street: incident.street,
      ...delayResult,
    };
  } catch (error) {
    server.log.error({ error }, "Error calculating incident delay");
    reply.code(500).send({ error: "Failed to calculate incident delay" });
  }
});

/**
 * GET /api/incidents/delays/all
 * Calcula demoras mejoradas para todos los incidentes activos
 */
server.get("/api/incidents/delays/all", async (request, reply) => {
  try {
    const alertsData = await repositories().wazeAlerts.findAllActive();
    const jamsData = await repositories().wazeJams.findAllActive();
    const alerts = alertsData.map(toLegacyAlert);
    const jams = jamsData.map(toLegacyJam);
    const historicalData = await historicalService.getGlobalSnapshots(24);

    const delayResults = delayCalculationService.calculateBatchDelays(
      alerts,
      jams,
      historicalData
    );

    // Convertir Map a objeto para la respuesta JSON
    const results: any[] = [];
    delayResults.forEach((delay, incidentId) => {
      const incident = alerts.find((a) => a.id === incidentId);
      if (incident) {
        results.push({
          incidentId,
          incidentType: incident.type,
          incidentSubtype: incident.subtype,
          street: incident.street,
          polygonId: incident.polygonId,
          ...delay,
        });
      }
    });

    // Ordenar por demora total descendente
    results.sort((a, b) => b.totalDelaySeconds - a.totalDelaySeconds);

    return {
      count: results.length,
      totalNetworkDelay: results.reduce(
        (sum, r) => sum + r.totalDelaySeconds,
        0
      ),
      incidents: results,
    };
  } catch (error) {
    server.log.error({ error }, "Error calculating batch delays");
    reply.code(500).send({ error: "Failed to calculate batch delays" });
  }
});

/**
 * Calcula la distancia entre dos puntos geográficos (Haversine) en metros
 */
function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
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
  proximityThreshold: number = 200
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

      const sameStreet =
        incident.street &&
        other.street &&
        incident.street.toLowerCase() === other.street.toLowerCase();

      const distance = calculateDistanceMeters(
        incident.location.lat,
        incident.location.lng,
        other.location.lat,
        other.location.lng
      );

      const sameType = incident.type.toLowerCase() === other.type.toLowerCase();

      // Agrupar si: (misma calle Y mismo tipo) O (muy cerca Y mismo tipo)
      if (sameType && (sameStreet || distance <= proximityThreshold)) {
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
          a.type.toLowerCase().includes(t.toLowerCase())
        ) || a.severity >= 4
    );

    // Agrupar incidentes para evitar duplicados
    const groupedIncidents = groupIncidentsByProximity(
      potentialBlockingIncidents,
      200
    );

    const analyses = groupedIncidents.map((group) => {
      const incident = group.primary;
      const delayResult = delayCalculationService.calculateIncidentDelay(
        incident,
        jams,
        historicalData
      );

      // Encontrar jams relacionados directamente (de todos los incidentes del grupo)
      const allIncidentIds = [incident.id, ...group.related.map((r) => r.id)];
      const linkedJams = jams.filter((j) =>
        allIncidentIds.includes(j.blockingAlertUuid || "")
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
          j.location.lng
        );
        return distance <= 300; // Radio de 300 metros
      });

      // Obtener calles afectadas de jams vinculados y cercanos
      const affectedStreets = [
        ...new Set(
          [
            ...linkedJams.map((j) => j.street),
            ...nearbyJams.map((j) => j.street),
          ].filter(Boolean)
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
        new Date(current) < new Date(oldest) ? current : oldest
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
            group.related.length * 5 // Bonus por múltiples reportes
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
      count: analyses.length,
      analyses: analyses.slice(0, 20), // Top 20
      summary: {
        totalIncidents: totalGroupedIncidents,
        totalReports: totalOriginalIncidents,
        duplicatesRemoved: totalOriginalIncidents - totalGroupedIncidents,
        totalDelayMinutes: analyses.reduce(
          (sum, a) => sum + a.delay.totalDelayMinutes,
          0
        ),
        avgConfidence:
          analyses.length > 0
            ? Math.round(
                analyses.reduce((sum, a) => sum + a.delay.confidence, 0) /
                  analyses.length
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
  polygonId: string
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
    const trafficMetrics = await apiService.getTrafficMetricsByPolygon(
      polygonId
    );
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
      wazeSpeed
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
      (request.query as { limit?: string })?.limit || "10"
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
            metrics.avgSpeed
          );
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          server.log.error(err, "Error getting speed for " + polygon.name);
          return null;
        }
      })
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
            "Usando datos de clima guardados"
          );
          reply.send(savedWeather);
          return;
        }

        // Si son más antiguos, obtener datos frescos
        server.log.info(
          { polygon_id, ageMinutes: Math.round(ageMinutes) },
          "Datos guardados muy antiguos, obteniendo datos frescos"
        );
      }
    } else {
      server.log.info({ polygon_id }, "Forzando actualización de clima");
    }

    // Obtener datos frescos del API (AccuWeather si está configurado, sino Open-Meteo)
    const weatherData = await weatherService.fetchWeatherForPolygon(
      polygon_id,
      centerLat,
      centerLon
    );

    if (!weatherData) {
      // Si falla obtener datos frescos, intentar usar datos guardados como fallback
      const savedWeather = await weatherService.getLatestWeather(polygon_id);
      if (savedWeather) {
        server.log.warn(
          { polygon_id },
          "No se pudo obtener clima fresco, usando datos guardados"
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
        "Clima obtenido y guardado"
      );
    } catch (saveError) {
      // Si falla el guardado, lo logueamos pero continuamos (no crítico)
      server.log.warn(
        {
          polygon_id,
          error:
            saveError instanceof Error ? saveError.message : String(saveError),
        },
        "No se pudo guardar clima en DB, retornando datos de API"
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
      toDate
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
        "Verificando polígono para historial"
      );

      if (polygon?.coordinates) {
        server.log.info(
          { polygon_id },
          "No hay historial en BD, obteniendo de Open-Meteo..."
        );

        // Obtener y guardar datos históricos
        history = await weatherService.fetchAndStoreHistorical24h(
          polygon_id,
          polygon.coordinates.lat,
          polygon.coordinates.lon
        );

        server.log.info(
          { polygon_id, count: history.length },
          "Historial obtenido y guardado"
        );
      } else {
        server.log.warn(
          { polygon_id },
          "Polígono no encontrado o sin coordenadas"
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
          centerLon
        );

        if (weather) {
          await weatherService.saveWeatherData(weather);
        }

        return {
          polygon_id: polygon.id,
          polygon_name: polygon.name,
          weather,
        };
      }
    );

    const results = await Promise.all(weatherPromises);
    reply.send(results);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    server.log.error(err, "Error getting all weather data");
    reply.code(500).send({ error: "Failed to get all weather data" });
  }
});

// ============================================================================
// 📊 ENDPOINTS DE RISK SCORING
// ============================================================================

import { riskScoringService } from "./services/riskScoringService";
import { getAllGroups } from "./config/realPolygons";

// Obtener lista de grupos disponibles
server.get("/api/risk/groups", async (request, reply) => {
  try {
    const groups = getAllGroups();
    return { groups };
  } catch (error: unknown) {
    console.error("Error obteniendo grupos:", error);
    if (error instanceof Error) {
      server.log.error(error.stack || error.message);
    }
    return reply.code(500).send({ error: "Error obteniendo grupos" });
  }
});

// Calcular scores para todos los polígonos (admin endpoint)
server.post("/api/risk/calculate", async (request, reply) => {
  try {
    await riskScoringService.calculateAllRiskScores();
    return { success: true, message: "Risk scores calculados exitosamente" };
  } catch (error: unknown) {
    console.error("Error calculando risk scores:", error);
    if (error instanceof Error) {
      server.log.error(error.stack || error.message);
    }
    return reply.code(500).send({ error: "Error calculando risk scores" });
  }
});

// Obtener resumen global de riesgos por grupo
server.get("/api/risk/summary", async (request, reply) => {
  try {
    const summaries = await riskScoringService.getGroupRiskSummaries();
    // Serializar correctamente asegurando que todos los valores numéricos sean válidos
    const serialized = summaries.map((s) => ({
      group_name: s.group_name,
      polygon_count: s.polygon_count || 0,
      avg_risk_score: isNaN(s.avg_risk_score)
        ? 0
        : Number(s.avg_risk_score.toFixed(2)),
      max_risk_score: isNaN(s.max_risk_score)
        ? 0
        : Number(s.max_risk_score.toFixed(2)),
      critical_polygons: s.critical_polygons || 0,
      risk_distribution: {
        low: s.risk_distribution.low || 0,
        moderate: s.risk_distribution.moderate || 0,
        high: s.risk_distribution.high || 0,
        critical: s.risk_distribution.critical || 0,
        severe: s.risk_distribution.severe || 0,
      },
    }));
    return reply.send({
      summaries: serialized,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Error obteniendo resumen de riesgos:", error);
    if (error instanceof Error) {
      server.log.error(error.stack || error.message);
    }
    return reply.code(500).send({
      error: "Error obteniendo resumen",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Obtener scores por grupo específico
server.get<{ Querystring: { group?: string } }>(
  "/api/risk/scores",
  async (request, reply) => {
    try {
      const { group } = request.query;
      const scores = await riskScoringService.getRiskScoresByGroup(group);
      return {
        scores,
        group: group || "all",
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      console.error("Error obteniendo scores por grupo:", error);
      if (error instanceof Error) {
        server.log.error(error.stack || error.message);
      }
      return reply.code(500).send({ error: "Error obteniendo scores" });
    }
  }
);

// POST /api/accidents/backfill-weather - Obtener clima histórico para todos los accidentes sin datos
server.post("/api/accidents/backfill-weather", async (request, reply) => {
  try {
    server.log.info("Iniciando backfill masivo de clima histórico");

    // Obtener todos los accidentes
    const allAccidents = await roadAccidentService.getAccidents({
      limit: 10000,
    });

    // Filtrar los que no tienen weather_data
    const accidentsWithoutWeather = allAccidents.filter((accident) => {
      if (!accident.weather_data) return true;
      if (typeof accident.weather_data !== "object") return true;
      return Object.keys(accident.weather_data).length === 0;
    });

    server.log.info(
      {
        total: allAccidents.length,
        withoutWeather: accidentsWithoutWeather.length,
      },
      "Accidentes a procesar"
    );

    // Filtrar los que están dentro de 92 días
    const now = new Date();
    const eligibleAccidents = accidentsWithoutWeather.filter((accident) => {
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
      { eligible: eligibleAccidents.length },
      "Accidentes elegibles (dentro de 92 días)"
    );

    if (eligibleAccidents.length === 0) {
      return {
        total: allAccidents.length,
        withoutWeather: accidentsWithoutWeather.length,
        eligible: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        message: "No hay accidentes elegibles para procesar",
      };
    }

    // Procesar en lotes con rate limiting (100ms entre cada uno)
    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const accident of eligibleAccidents) {
      try {
        const success = await roadAccidentService.backfillWeatherData(
          accident.id!
        );
        processed++;
        if (success) {
          successful++;
          server.log.info(
            {
              accidentId: accident.id,
              progress: `${processed}/${eligibleAccidents.length}`,
            },
            "Clima obtenido"
          );
        } else {
          failed++;
        }

        // Rate limiting: esperar 100ms entre requests para no saturar Open-Meteo
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        server.log.error(
          { accidentId: accident.id, error },
          "Error procesando accidente"
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
      message: `Procesados ${processed} accidentes: ${successful} exitosos, ${failed} fallidos`,
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
server.get<{ Params: { polygon_id: string } }>(
  "/api/risk/polygon/:polygon_id",
  async (request, reply) => {
    try {
      const { polygon_id } = request.params;
      const score = await riskScoringService.getPolygonRiskScore(polygon_id);

      if (!score) {
        return reply
          .code(404)
          .send({ error: "Score no encontrado para este polígono" });
      }

      return score;
    } catch (error: unknown) {
      console.error("Error obteniendo score de polígono:", error);
      if (error instanceof Error) {
        server.log.error(error.stack || error.message);
      }
      return reply.code(500).send({ error: "Error obteniendo score" });
    }
  }
);

// Recalcular score de un polígono específico
server.post<{ Params: { polygon_id: string } }>(
  "/api/risk/polygon/:polygon_id/recalculate",
  async (request, reply) => {
    try {
      const { polygon_id } = request.params;
      const score = await riskScoringService.calculatePolygonRiskScore(
        polygon_id
      );
      return score;
    } catch (error: unknown) {
      console.error("Error recalculando score:", error);
      if (error instanceof Error) {
        server.log.error(error.stack || error.message);
      }
      return reply.code(500).send({ error: "Error recalculando score" });
    }
  }
);

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

    const accidents = await roadAccidentService.getAccidents({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    return serializeObject(accidents);
  } catch (error) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error en /api/accidents"
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Si la tabla no existe, retornar array vacío en lugar de error 500
    if (error instanceof Error && error.message.includes("does not exist")) {
      server.log.warn(
        "Tabla road_accidents no existe. Retornando array vacío. Ejecutar: npx ts-node scripts/create-accidents-table.ts"
      );
      return serializeObject([]);
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
      "Error en /api/accidents/:id"
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
              data.polygonId
            );
            if (data.weather_data) {
              server.log.info(
                { polygonId: data.polygonId },
                "Clima obtenido de BD para polígono"
              );
            }
          } catch (polygonError) {
            server.log.warn(
              { polygonId: data.polygonId, error: polygonError },
              "No se pudo obtener clima del polígono"
            );
          }
        }

        // Si no hay clima del polígono, obtenerlo directamente de la API usando coordenadas
        if (!data.weather_data && data.location_lat && data.location_lng) {
          try {
            // Usar un polygonId temporal o el incident_id como identificador
            const tempPolygonId =
              data.polygonId || `accident-${data.incident_id || "temp"}`;
            const weatherData = await weatherService.fetchWeatherForPolygon(
              tempPolygonId,
              Number(data.location_lat),
              Number(data.location_lng)
            );

            if (weatherData) {
              data.weather_data = weatherData;
              server.log.info(
                {
                  lat: data.location_lat,
                  lng: data.location_lng,
                  provider: process.env.WEATHER_PROVIDER || "openmeteo",
                },
                "Clima obtenido de API para accidente"
              );
            } else {
              server.log.warn(
                { lat: data.location_lat, lng: data.location_lng },
                "No se pudo obtener clima de la API"
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
              "Error al obtener clima de la API para accidente"
            );
            data.weather_data = {};
          }
        } else if (!data.weather_data) {
          data.weather_data = {};
        }
      } catch (weatherError) {
        server.log.warn(
          { error: weatherError },
          "Error general al obtener clima para el accidente"
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
          (a) => a.incident_id === data.incident_id
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
      "Siniestro registrado manualmente"
    );
    return serializeObject(accident);
  } catch (error) {
    server.log.error(
      {
        error,
        url: request.url,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error en POST /api/accidents"
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
        part.file
      );

      // Determinar tipo de archivo
      const fileType = part.mimetype.startsWith("video/") ? "video" : "image";

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
server.patch("/api/accidents/:id", async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const updates = request.body as any;

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
      "Error en PATCH /api/accidents/:id"
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return reply.code(500).send({
      error: "Error actualizando siniestro",
      message:
        process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
});

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

    server.log.info(
      { accidentId: id },
      "Solicitando backfill de clima histórico"
    );

    const success = await roadAccidentService.backfillWeatherData(id);

    if (!success) {
      return reply.code(400).send({
        error: "No se pudo obtener clima histórico",
        message:
          "El accidente puede ser muy antiguo (>92 días), ya tiene datos climáticos, o no se pudo contactar con el servicio meteorológico",
      });
    }

    // Obtener accidente actualizado
    const accident = await roadAccidentService.getAccidentById(id);

    server.log.info(
      { accidentId: id },
      "Clima histórico obtenido exitosamente"
    );
    return serializeObject(accident);
  } catch (error) {
    server.log.error(
      { error, accidentId: (request.params as any).id },
      "Error obteniendo clima histórico"
    );
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

    // Iniciar polling de Waze (una sola vez)
    try {
      wazePollingService.startPolling();
      console.log("✓ WazePollingService iniciado (ingesta + persistencia)");
    } catch (pollingError) {
      console.error(
        "⚠️ Error al iniciar WazePollingService (continuando):",
        pollingError
      );
    }

    // Iniciar servicio de clima Open-Meteo
    try {
      openMeteoService.startPolling();
      console.log("✓ OpenMeteoService iniciado (clima cada hora)");
    } catch (weatherError) {
      console.error(
        "⚠️ Error al iniciar OpenMeteoService (continuando):",
        weatherError
      );
    }

    const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    await server.listen({ port, host: "0.0.0.0" });

    // Inicializar WebSocket después de que el servidor esté escuchando
    try {
      websocketService.initialize(server.server);
      // wazePollingService.setSocketIO(websocketService.getIO()); // REMOVED: Using SocketSubscriber
      // Initialize Socket Subscriber
      new SocketSubscriber(websocketService.getIO()); // Initialize here if not earlier

      // Initialize event listeners
      const { AccidentCaptureListener, IncidentsHistoryListener } =
        await import("./listeners");
      new AccidentCaptureListener();
      new IncidentsHistoryListener();
      console.log("✓ Event listeners initialized");

      // openMeteoService.setSocketIO(websocketService.getIO()); // Keep if openMeteoService still needs it or refactor later
      console.log("✓ WebSocket service initialized");
    } catch (wsError) {
      console.error("⚠️ Error al iniciar WebSocket (continuando):", wsError);
    }

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
          -64.1833
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
