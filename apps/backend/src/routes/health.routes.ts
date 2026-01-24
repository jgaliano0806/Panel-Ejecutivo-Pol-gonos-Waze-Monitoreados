/**
 * Rutas de Health Checks
 * Extraído de server.ts siguiendo nodejs-backend-patterns
 *
 * Endpoints:
 * - GET /health - Health check completo
 * - GET /health/live - Liveness probe (Kubernetes/Docker)
 * - GET /health/ready - Readiness probe (Kubernetes/Docker)
 */

import { FastifyInstance, FastifyPluginOptions } from "fastify";

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

/**
 * Verifica la salud de la conexión a base de datos
 */
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const { dbService } = await import("../database/dbService");
    await dbService.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifica la salud de servicios externos
 */
async function checkServicesHealth(): Promise<boolean> {
  // Por ahora retorna true, se puede expandir para verificar Waze, Redis, etc.
  return true;
}

/**
 * Formatea el uptime en formato legible
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}

// =============================================================================
// PLUGIN DE RUTAS
// =============================================================================

async function healthRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
): Promise<void> {
  // GET /health - Health check completo
  fastify.get("/health", async (_request, reply) => {
    const startTime = Date.now();

    try {
      const dbHealthy = await checkDatabaseHealth();
      const servicesHealthy = await checkServicesHealth();
      const uptime = process.uptime();

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
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
        },
      };

      const statusCode = health.status === "healthy" ? 200 : 503;
      reply.code(statusCode).send(health);
    } catch (error) {
      fastify.log.error({ msg: "Health check failed", error });
      reply.code(503).send({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      });
    }
  });

  // GET /health/live - Liveness probe
  fastify.get("/health/live", async (_request, reply) => {
    reply.code(200).send({
      status: "alive",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // GET /health/ready - Readiness probe
  fastify.get("/health/ready", async (_request, reply) => {
    try {
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
    } catch {
      reply.code(503).send({
        status: "not ready",
        timestamp: new Date().toISOString(),
        error: "Readiness check failed",
      });
    }
  });

  // GET /health/detailed - Diagnóstico completo del sistema
  fastify.get("/health/detailed", async (_request, reply) => {
    try {
      const { dbService } = await import("../database/dbService");

      // 1. Verificar conexión a DB
      const dbHealthy = await checkDatabaseHealth();

      // 2. Obtener estadísticas de eventos activos
      let activeAlerts = 0;
      let activeJams = 0;
      let lastAlertTime = null;
      let historicalCount = 0;

      if (dbHealthy) {
        try {
          // Contar alertas activas
          const alertsResult = await dbService.query(
            "SELECT COUNT(*) as count FROM waze_alerts WHERE is_active = true",
          );
          activeAlerts = parseInt(alertsResult.rows[0]?.count || "0");

          // Contar jams activos
          const jamsResult = await dbService.query(
            "SELECT COUNT(*) as count FROM waze_jams WHERE is_active = true",
          );
          activeJams = parseInt(jamsResult.rows[0]?.count || "0");

          // Obtener última actualización de datos
          const lastAlertResult = await dbService.query(
            "SELECT MAX(pub_millis) as last_update FROM waze_alerts WHERE is_active = true",
          );
          const lastPubMillis = lastAlertResult.rows[0]?.last_update;
          if (lastPubMillis) {
            lastAlertTime = new Date(parseInt(lastPubMillis)).toISOString();
          }

          // Contar snapshots históricos de últimas 24h
          const historicalResult = await dbService.query(
            "SELECT COUNT(*) as count FROM historical_snapshots WHERE timestamp > NOW() - INTERVAL '24 hours'",
          );
          historicalCount = parseInt(historicalResult.rows[0]?.count || "0");
        } catch (error) {
          fastify.log.warn({ msg: "Error getting detailed stats", error });
        }
      }

      // 3. Calcular tiempo desde última actualización
      let lastUpdateAge = null;
      if (lastAlertTime) {
        const ageMs = Date.now() - new Date(lastAlertTime).getTime();
        const ageMinutes = Math.floor(ageMs / 60000);
        lastUpdateAge = {
          milliseconds: ageMs,
          minutes: ageMinutes,
          message:
            ageMinutes < 5
              ? "Datos muy recientes"
              : ageMinutes < 15
                ? "Datos recientes"
                : "Datos antiguos - verificar servicio de polling",
        };
      }

      const diagnostic = {
        status: dbHealthy ? "operational" : "degraded",
        timestamp: new Date().toISOString(),
        uptime: {
          seconds: process.uptime(),
          formatted: formatUptime(process.uptime()),
        },

        // Estado de servicios
        services: {
          database: {
            status: dbHealthy ? "connected" : "disconnected",
            healthy: dbHealthy,
          },
          wazePolling: {
            status:
              lastAlertTime &&
              lastUpdateAge &&
              lastUpdateAge.minutes !== undefined &&
              lastUpdateAge.minutes < 15
                ? "active"
                : lastAlertTime
                  ? "stale"
                  : "no_data",
            lastUpdate: lastAlertTime,
            ageMinutes: lastUpdateAge?.minutes || null,
            message: lastUpdateAge?.message || "Sin datos recientes",
          },
        },

        // Datos actuales
        data: {
          activeAlerts: activeAlerts,
          activeJams: activeJams,
          totalActiveIncidents: activeAlerts + activeJams,
          historicalSnapshots24h: historicalCount,
          hasData: activeAlerts + activeJams > 0,
        },

        // Métricas del sistema
        system: {
          memory: {
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            heapTotal: Math.round(
              process.memoryUsage().heapTotal / 1024 / 1024,
            ),
            external: Math.round(process.memoryUsage().external / 1024 / 1024),
            unit: "MB",
          },
          nodeVersion: process.version,
          platform: process.platform,
          environment: process.env.NODE_ENV || "development",
        },

        // Recomendaciones
        recommendations: [] as { severity: string; message: string }[],
      };

      // Agregar recomendaciones basadas en el estado
      if (!dbHealthy) {
        diagnostic.recommendations.push({
          severity: "critical",
          message:
            "Base de datos PostgreSQL no disponible - verificar conexión",
        });
      }

      if (activeAlerts === 0 && activeJams === 0) {
        diagnostic.recommendations.push({
          severity: "info",
          message: lastAlertTime
            ? "No hay incidentes activos - las rutas están fluidas"
            : "Sin datos de Waze - verificar servicio de polling",
        });
      }

      if (lastUpdateAge && lastUpdateAge.minutes > 15) {
        diagnostic.recommendations.push({
          severity: "warning",
          message:
            "Datos desactualizados - verificar que el servicio de polling esté ejecutándose",
        });
      }

      if (historicalCount === 0) {
        diagnostic.recommendations.push({
          severity: "info",
          message:
            "Sin datos históricos - los snapshots se generarán automáticamente",
        });
      }

      reply.code(200).send(diagnostic);
    } catch (error) {
      fastify.log.error({ msg: "Detailed health check failed", error });
      reply.code(503).send({
        status: "error",
        timestamp: new Date().toISOString(),
        error: "Failed to perform detailed health check",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

export default healthRoutes;
