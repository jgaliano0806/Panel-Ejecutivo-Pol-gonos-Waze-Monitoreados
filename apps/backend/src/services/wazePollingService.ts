import axios from "axios";
import { dbService } from "../database/dbService";
import { repositories } from "../repositories";
import { cacheService } from "./cacheService";
import { REAL_POLYGONS, RealPolygonConfig } from "../config/realPolygons";
import {
  WazeAlert,
  WazeJam,
  WazeIrregularity,
  WazeAlertDB,
  WazeJamDB,
  WazeFeedData,
  WazePollingResult,
} from "@panel-waze/types";

import { eventBus, SystemEvents } from "../events";
import { logger } from "../utils/logger";
import { notificationService } from "./notificationService";

/**
 * Servicio de Polling de Waze con persistencia PostgreSQL
 * - Fetch periódico cada 2 minutos
 * - Almacenamiento en PostgreSQL (waze_alerts, waze_jams, waze_irregularities)
 * - Emisión via WebSocket a rooms por polígono
 * - Cache invalidation
 */
export class WazePollingService {
  private static instance: WazePollingService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private lastPollTime: Date = new Date(0);

  // Configuración
  private readonly POLLING_INTERVAL_MS = 30000; // 30 segundos
  private readonly REQUEST_TIMEOUT_MS = 10000; // 10 segundos
  private readonly MAX_RETRIES = 3;
  private readonly INACTIVE_THRESHOLD_MINUTES = 30;
  private readonly RATE_LIMIT_DELAY_MS = 100; // 100ms entre requests para rate limiting

  private constructor() {
    logger.info("🔧 WazePollingService initialized");
  }

  /**
   * Singleton instance
   */
  public static getInstance(): WazePollingService {
    if (!WazePollingService.instance) {
      WazePollingService.instance = new WazePollingService();
    }
    return WazePollingService.instance;
  }

  /**
   * Inicia el ciclo de polling
   */
  public async startPolling(): Promise<void> {
    if (this.isPolling) {
      logger.warn("⚠️ WazePollingService already polling");
      return;
    }

    // Asegurar que las tablas existen
    await this.ensureTables();

    logger.info(
      `🚀 Starting Waze polling (every ${this.POLLING_INTERVAL_MS / 1000}s)`,
    );
    this.isPolling = true;

    // Ejecutar inmediatamente
    this.poll();

    // Programar polling periódico
    this.pollingInterval = setInterval(
      () => this.poll(),
      this.POLLING_INTERVAL_MS,
    );
  }

  /**
   * Asegura que las tablas de Waze existen en la base de datos
   */
  private async ensureTables(): Promise<void> {
    logger.info("🔧 Verificando tablas de Waze...");

    try {
      // Crear tabla waze_alerts
      await dbService.query(`
                CREATE TABLE IF NOT EXISTS waze_alerts (
                    uuid VARCHAR(100) PRIMARY KEY,
                    polygon_id VARCHAR(50) NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    subtype VARCHAR(100),
                    latitude DECIMAL(10,7) NOT NULL,
                    longitude DECIMAL(10,7) NOT NULL,
                    street VARCHAR(255),
                    city VARCHAR(100),
                    country VARCHAR(100),
                    pub_millis BIGINT NOT NULL,
                    reliability DECIMAL(3,1),
                    confidence DECIMAL(3,1),
                    report_description TEXT,
                    n_thumbs_up INTEGER DEFAULT 0,
                    report_rating INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            `);

      // Crear tabla waze_jams
      await dbService.query(`
                CREATE TABLE IF NOT EXISTS waze_jams (
                    uuid VARCHAR(100) PRIMARY KEY,
                    polygon_id VARCHAR(50) NOT NULL,
                    level INTEGER NOT NULL,
                    polyline JSONB NOT NULL,
                    speed_kmh DECIMAL(6,2),
                    delay_seconds INTEGER,
                    length_meters DECIMAL(10,2),
                    street VARCHAR(255),
                    city VARCHAR(100),
                    pub_millis BIGINT NOT NULL,
                    blocking_alert_uuid VARCHAR(100),
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            `);

      // Asegurar que las columnas existen para instalaciones previas
      await dbService.query(
        `ALTER TABLE waze_jams ADD COLUMN IF NOT EXISTS blocking_alert_uuid VARCHAR(100)`,
      );
      await dbService.query(
        `ALTER TABLE waze_jams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
      );
      await dbService.query(
        `ALTER TABLE waze_alerts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
      );
      await dbService.query(
        `ALTER TABLE waze_alerts ADD COLUMN IF NOT EXISTS n_thumbs_up INTEGER DEFAULT 0`,
      );
      await dbService.query(
        `ALTER TABLE waze_alerts ADD COLUMN IF NOT EXISTS report_rating INTEGER DEFAULT 0`,
      );
      await dbService.query(
        `ALTER TABLE waze_alerts ADD COLUMN IF NOT EXISTS report_by VARCHAR(100)`,
      );
      await dbService.query(
        `ALTER TABLE waze_alerts ADD COLUMN IF NOT EXISTS magvar INTEGER`,
      );

      // Crear tabla waze_irregularities
      await dbService.query(`
                CREATE TABLE IF NOT EXISTS waze_irregularities (
                    uuid VARCHAR(100) PRIMARY KEY,
                    polygon_id VARCHAR(50) NOT NULL,
                    type VARCHAR(50),
                    detection_date TIMESTAMPTZ,
                    street VARCHAR(255),
                    speed DECIMAL(6,2),
                    regular_speed DECIMAL(6,2),
                    delay_seconds INTEGER,
                    severity DECIMAL(3,1),
                    jam_level INTEGER,
                    trend INTEGER,
                    polyline JSONB,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            `);

      // Crear índices
      await dbService.query(
        `CREATE INDEX IF NOT EXISTS idx_alerts_polygon ON waze_alerts(polygon_id, is_active, created_at DESC)`,
      );
      await dbService.query(
        `CREATE INDEX IF NOT EXISTS idx_jams_polygon ON waze_jams(polygon_id, is_active, created_at DESC)`,
      );
      await dbService.query(
        `CREATE INDEX IF NOT EXISTS idx_irreg_polygon ON waze_irregularities(polygon_id, is_active, created_at DESC)`,
      );

      // Crear tabla waze_tvt_metrics (datos del TVT Feed oficial de Waze)
      // Referencia: https://support.google.com/waze/partners/answer/13658466
      await dbService.query(`
                CREATE TABLE IF NOT EXISTS waze_tvt_metrics (
                    id SERIAL PRIMARY KEY,
                    polygon_id VARCHAR(50) NOT NULL,
                    wazers_count INTEGER DEFAULT 0,
                    jam_level_counts JSONB,
                    length_of_jams JSONB,
                    update_time TIMESTAMPTZ,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            `);
      await dbService.query(
        `CREATE INDEX IF NOT EXISTS idx_tvt_polygon_time ON waze_tvt_metrics(polygon_id, created_at DESC)`,
      );
      // Agregar columna length_of_jams si no existe (migración)
      await dbService
        .query(
          `ALTER TABLE waze_tvt_metrics ADD COLUMN IF NOT EXISTS length_of_jams JSONB`,
        )
        .catch(() => {
          /* columna ya existe */
        });

      logger.info("✅ Tablas de Waze verificadas/creadas");
    } catch (error) {
      logger.error(
        "❌ Error creando tablas de Waze:",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Detiene el ciclo de polling (para graceful shutdown)
   */
  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    logger.info("🛑 Waze polling stopped");
  }

  /**
   * Ejecuta un ciclo de polling completo
   */
  private async poll(): Promise<void> {
    const startTime = Date.now();
    logger.info(`📥 Polling ${REAL_POLYGONS.length} Waze feeds...`);

    const results: WazePollingResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Procesar feeds con rate limiting
    for (const polygon of REAL_POLYGONS) {
      try {
        const result = await this.fetchAndStorePolygonData(polygon);
        results.push(result);

        if (result.success) {
          successCount++;

          // Emitir via WebSocket si hay datos
          if (result.alerts > 0 || result.jams > 0) {
            await this.emitUpdate(polygon.id);
          }
        } else {
          errorCount++;
        }

        // Rate limiting entre requests
        await this.sleep(this.RATE_LIMIT_DELAY_MS);
      } catch (error) {
        errorCount++;
        logger.error(
          `❌ Error polling ${polygon.name}:`,
          error instanceof Error ? error.message : String(error),
        );
      }

      // TVT Polling (si existe URL)
      if (polygon.tvtFeedUrl) {
        try {
          await this.processTvtFeed(polygon);
        } catch (error) {
          logger.error(
            `❌ Error TVT polling ${polygon.name}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    // Marcar datos antiguos como inactivos
    await this.markInactiveData();

    // Invalidar cache
    await this.invalidateCache();

    const duration = Date.now() - startTime;
    this.lastPollTime = new Date();

    const totalAlerts = results.reduce((sum, r) => sum + r.alerts, 0);
    const totalJams = results.reduce((sum, r) => sum + r.jams, 0);

    logger.info(
      `✅ Poll completed in ${duration}ms. Success: ${successCount}/${REAL_POLYGONS.length}, Alerts: ${totalAlerts}, Jams: ${totalJams}`,
    );
  }

  /**
   * Fetch y almacena datos de un polígono específico
   */
  private async fetchAndStorePolygonData(
    polygon: RealPolygonConfig,
  ): Promise<WazePollingResult> {
    const result: WazePollingResult = {
      polygonId: polygon.id,
      alerts: 0,
      jams: 0,
      irregularities: 0,
      success: false,
    };

    try {
      // Fetch con reintentos
      const data = await this.fetchFeedWithRetry(polygon.feedUrl);

      if (!data) {
        result.error = "No data received";
        return result;
      }

      // Almacenar alerts
      if (data.alerts && data.alerts.length > 0) {
        result.alerts = await this.storeAlerts(data.alerts, polygon.id);
      }

      // Almacenar jams
      if (data.jams && data.jams.length > 0) {
        result.jams = await this.storeJams(data.jams, polygon.id);
      }

      // Almacenar irregularities si existen
      if (data.irregularities && data.irregularities.length > 0) {
        result.irregularities = await this.storeIrregularities(
          data.irregularities,
          polygon.id,
        );
      }

      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Failed to fetch/store ${polygon.name}:`, result.error);
    }

    return result;
  }

  /**
   * Fetch del feed con lógica de reintentos
   */
  private async fetchFeedWithRetry(url: string): Promise<WazeFeedData | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await axios.get<WazeFeedData>(url, {
          timeout: this.REQUEST_TIMEOUT_MS,
          headers: {
            Accept: "application/json",
            "User-Agent": "Panel-Waze-Monitoreados/1.0",
          },
        });

        return response.data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.MAX_RETRIES) {
          // Exponential backoff: 1s, 2s, 4s...
          const delay = Math.pow(2, attempt - 1) * 1000;
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }

  /**
   * Almacena alerts en PostgreSQL usando Repository
   * También crea registros en road_accidents para accidentes (type='ACCIDENT')
   */
  private async storeAlerts(
    alerts: WazeAlert[],
    polygonId: string,
  ): Promise<number> {
    try {
      // 1. Upsert active alerts
      const entities = alerts.map((a) => ({
        ...a,
        polygon_id: polygonId,
        city: a.city || undefined,
        street: a.street || undefined,
        report_by: a.reportBy || null,
        magvar: a.magvar || null,
        is_active: true, // Renueva estado activo
      }));

      // NOTA: Se eliminó la clasificación AI heurística ya que los datos deben mantenerse
      // exactamente como los reporta Waze para uso en seguridad vial.
      // Los campos reliability y confidence de Waze ya proveen esta información de forma oficial.

      await repositories().wazeAlerts.bulkUpsert(entities as any);

      // 2. Marcar como INACTIVOS los que ya no están en el feed para este polígono
      const currentUuids = alerts.map((a) => a.uuid);
      if (currentUuids.length > 0) {
        await dbService.query(
          `UPDATE waze_alerts
               SET is_active = false, updated_at = NOW()
               WHERE polygon_id = $1
               AND is_active = true
               AND uuid != ALL($2)`,
          [polygonId, currentUuids],
        );
      } else {
        // Si no hay alertas, marcar todas las de este polígono como inactivas
        await dbService.query(
          `UPDATE waze_alerts
               SET is_active = false, updated_at = NOW()
               WHERE polygon_id = $1 AND is_active = true`,
          [polygonId],
        );
      }

      // 3. Notificaciones para eventos críticos NUEVOS
      const criticalTypes = ["ACCIDENT", "HAZARD", "WEATHERHAZARD"];
      const criticalAlerts = alerts.filter((a) =>
        criticalTypes.includes(a.type),
      );

      if (criticalAlerts.length > 0) {
        // ... (lógica de notificaciones existente - mantener) ...
        const uuids = criticalAlerts.map((a) => a.uuid);
        // NOTA: Consultamos created_at reciente para no notificar cosas viejas que volvieron
        // Pero NotificationService ya maneja su propio tracking? NO, hay que chequear si ya notificamos.
        // Mejor: chequear si existe en waze_alerts con created_at < hace 1 polling
        // Simplificación: usaremos el NotificationService para no duplicar

        // Simplemente iteramos y tratamos de crear. NotificationService o la DB evitarán duplicados si ya existen?
        // En el código anterior verificábamos: "if (!existingUuids.has(alert.uuid))".
        // Como acabamos de hacer upsert, todos existen.
        // Necesitamos saber si eran *previamente* desconocidos.
        // La lógica original usaba "SELECT uuid FROM waze_alerts WHERE uuid = ANY($1)".
        // Al mover el upsert al principio, esa lógica ya no distingue "nuevos" de "existentes".
        // CORRECCIÓN: Deberíamos chequear existencia ANTES del Upsert o basarnos en `created_at` vs `updated_at`.
        // Si created_at == updated_at (approx), es nuevo.

        // Para simplificar y no romper el flujo, mantendré la notificación BASADA EN LA DIFERENCIA.
        // Pero ya hice el upsert.
        // Omitiré esta parte de notificación en este bloque de reemplazo para no complicar,
        // asumo que el usuario quiere guardar histórico.

        // Re-implementación correcta de notificaciones post-upsert:
        // Buscar aquellos donde created_at > now() - interval '1 minute' ??
        // O query previa.

        // Voy a restaurar la lógica original de notificaciones pero adaptada.
        // Mejor estrategia:
        // 1. Get existing UUIDs (Active) BEFORE upsert.
        // 2. Upsert.
        // 3. Deactivate missing.
        // 4. Notify for (Current - Previous).
        // Too complex for this Replace?
        // I will keep the notification logic simple:
        // Only notify if notificationService.create returns successful (it doesn't deduplicate by itself?)
        // NotificationService creates a NEW notification record.
        // We should check if we already sent a notification for this Alert UUID.
        // We can check the `waze_alerts.created_at` timestamp. If it is very recent (last 2 mins), notify.
      }

      // Restaurando lógica de notificación con prevención de duplicados:
      // NOTA: El mismo incidente físico puede aparecer en múltiples feeds de polígonos
      // con UUIDs diferentes. Por eso usamos doble dedup: por UUID Y por contenido.
      for (const alert of criticalAlerts) {
        // 1. Verificar si la alerta es RECIENTE (creada en los últimos 5 minutos)
        // Esto evita notificar cosas viejas que Waze republica
        const resAlert = await dbService.query(
          `SELECT created_at FROM waze_alerts WHERE uuid = $1`,
          [alert.uuid],
        );

        if (resAlert.rows.length > 0) {
          const createdAt = new Date(resAlert.rows[0].created_at).getTime();
          const now = Date.now();
          // Margen de 5 minutos para considerar "nueva" una alerta
          if (now - createdAt < 300000) {
            // 2a. VERIFICACIÓN POR UUID: ¿Ya notificamos este UUID exacto?
            const existingByUuid = await dbService.query(
              `SELECT 1 FROM notifications WHERE data->>'uuid' = $1 LIMIT 1`,
              [alert.uuid],
            );

            if ((existingByUuid.rowCount ?? 0) > 0) {
              logger.debug(
                `🔕 Notificación duplicada prevenida para UUID ${alert.uuid}`,
              );
              continue;
            }

            // 2b. VERIFICACIÓN POR CONTENIDO: ¿Ya notificamos un incidente IGUAL
            // (mismo tipo, subtipo, calle y coordenadas cercanas) en los últimos 10 min?
            // Esto previene duplicados cuando el mismo incidente físico aparece en
            // múltiples feeds de polígonos con UUIDs diferentes.
            const lat = alert.location?.y ?? 0;
            const lng = alert.location?.x ?? 0;
            const existingByContent = await dbService.query(
              `SELECT 1 FROM notifications
               WHERE type = $1
                 AND data->>'subtype' = $2
                 AND data->>'street' = $3
                 AND created_at > NOW() - INTERVAL '10 minutes'
                 AND ABS(CAST(data->>'latitude' AS FLOAT) - $4) < 0.002
                 AND ABS(CAST(data->>'longitude' AS FLOAT) - $5) < 0.002
               LIMIT 1`,
              [
                alert.type === "ACCIDENT" ? "ACCIDENT" : "HAZARD",
                alert.subtype || "",
                alert.street || "",
                lat,
                lng,
              ],
            );

            if ((existingByContent.rowCount ?? 0) > 0) {
              logger.info(
                `🔕 Notificación duplicada prevenida por CONTENIDO para ${alert.uuid} (${alert.street}, ${alert.type}/${alert.subtype})`,
              );
              continue;
            }

            // NO existe notificación previa, procedemos a crearla
            const title = this.getNotificationTitle(alert);
            // Generar mensaje descriptivo, excluyendo tags AI internos
            const message = this.getNotificationMessage(alert);

            await notificationService.create(
              alert.type === "ACCIDENT" ? "ACCIDENT" : "HAZARD",
              title,
              message,
              {
                ...alert,
                polygonId,
                // Almacenar lat/lng explícitamente para la dedup por contenido
                latitude: lat,
                longitude: lng,
              },
            );
            logger.info(`🔔 Notificación enviada para alerta ${alert.uuid}`);
          }
        }
      }

      // Auto-crear siniestros en road_accidents para accidentes (type='ACCIDENT')
      // Filtro estricto: Solo Accidentes Mayores, Menores o Genéricos (sin subtipo raro)
      const allowedSubtypes = [
        "ACCIDENT_MAJOR",
        "ACCIDENT_MINOR",
        "NO_SUBTYPE",
      ];
      const accidents = alerts.filter(
        (a) =>
          a.type === "ACCIDENT" &&
          (!a.subtype || allowedSubtypes.includes(a.subtype)),
      );
      if (accidents.length > 0) {
        // ... (mantener lógica road_accidents) ...
        for (const accident of accidents) {
          // ... invocar roadAccidentService ...
          // (Para brevedad del replace, asumo que el usuario quiere mantener esta lógica.
          //  La copiaré tal cual del archivo original pero optimizada)
          const existing = await dbService.query(
            "SELECT id FROM road_accidents WHERE incident_id = $1",
            [accident.uuid],
          );
          if (existing.rows.length === 0) {
            const { roadAccidentService } = require("./roadAccidentService");
            const { openMeteoService } = require("./openMeteoService");
            // Fetch clima
            let weatherData = {};
            try {
              weatherData = await openMeteoService.fetchWeatherForLocation({
                lat: accident.location.y,
                lng: accident.location.x,
              });
            } catch (e) {}

            await roadAccidentService.createAccident({
              incident_id: accident.uuid,
              type: accident.type,
              severity: accident.reliability
                ? Math.round(accident.reliability / 2)
                : 3,
              waze_data: accident,
              weather_data: weatherData,
              status: "active",
              polygon_id: polygonId,
              accident_at: new Date(accident.pubMillis),
              location_lat: accident.location.y,
              location_lng: accident.location.x,
              description: accident.reportDescription || accident.subtype,
            });
          } else {
            await dbService.query(
              "UPDATE road_accidents SET status='active', updated_at=NOW() WHERE incident_id=$1",
              [accident.uuid],
            );
          }
        }
      }

      // Inactivar siniestros que ya no están
      const accUuids = accidents.map((a) => a.uuid);
      if (accUuids.length > 0) {
        await dbService.query(
          `UPDATE road_accidents SET status='inactive', updated_at=NOW()
               WHERE polygon_id=$1 AND incident_id IS NOT NULL AND status='active' AND incident_id != ALL($2)`,
          [polygonId, accUuids],
        );
      } else {
        await dbService.query(
          `UPDATE road_accidents SET status='inactive', updated_at=NOW()
               WHERE polygon_id=$1 AND incident_id IS NOT NULL AND status='active'`,
          [polygonId],
        );
      }

      return alerts.length;
    } catch (error) {
      logger.error("Error storing alerts:", String(error));
      return 0;
    }
  }

  private async storeJams(jams: WazeJam[], polygonId: string): Promise<number> {
    try {
      const entities = jams.map((j) => ({
        ...j,
        polygon_id: polygonId,
        is_active: true,
      }));
      await repositories().wazeJams.bulkUpsert(entities as any);

      const currentUuids = jams.map((j) => j.uuid);
      if (currentUuids.length > 0) {
        await dbService.query(
          `UPDATE waze_jams SET is_active = false, updated_at = NOW()
               WHERE polygon_id = $1 AND is_active = true AND uuid != ALL($2)`,
          [polygonId, currentUuids],
        );
      } else {
        await dbService.query(
          `UPDATE waze_jams SET is_active = false, updated_at = NOW()
               WHERE polygon_id = $1 AND is_active = true`,
          [polygonId],
        );
      }
      return jams.length;
    } catch (error) {
      logger.error("Error storing jams:", String(error));
      return 0;
    }
  }

  private async storeIrregularities(
    irregularities: WazeIrregularity[],
    polygonId: string,
  ): Promise<number> {
    try {
      const entities = irregularities.map((i) => ({
        ...i,
        polygon_id: polygonId,
        is_active: true,
      }));
      await repositories().wazeIrregularities.bulkUpsert(entities as any);

      const currentUuids = irregularities.map((i) => i.uuid);
      // Si no tienen UUID estable, esta lógica de limpieza podría ser agresiva.
      // Asumiremos que tienen UUID o Id único confiable.
      if (currentUuids.length > 0 && currentUuids[0]) {
        await dbService.query(
          `UPDATE waze_irregularities SET is_active = false, updated_at = NOW()
               WHERE polygon_id = $1 AND is_active = true AND uuid != ALL($2)`,
          [polygonId, currentUuids],
        );
      }
      return irregularities.length;
    } catch (error) {
      logger.error("Error storing irregularities:", String(error));
      return 0;
    }
  }

  /**
   * Marca como inactivos los datos más antiguos que el threshold
   */
  private async markInactiveData(): Promise<void> {
    const thresholdMs = this.INACTIVE_THRESHOLD_MINUTES * 60 * 1000;
    const cutoffTime = new Date(Date.now() - thresholdMs);

    try {
      await repositories().wazeAlerts.markInactive(cutoffTime);

      // For Jams:
      await dbService.query(
        `UPDATE waze_jams SET is_active = false WHERE is_active = true AND pub_millis < $1`,
        [cutoffTime.getTime()],
      );

      // For Irregularities:
      await dbService.query(
        `UPDATE waze_irregularities SET is_active = false WHERE is_active = true AND created_at < NOW() - INTERVAL '${this.INACTIVE_THRESHOLD_MINUTES} minutes'`,
      );
    } catch (error) {
      logger.error(
        "Error marking inactive data:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Emite actualización via EventBus en lugar de Socket directo
   */
  private async emitUpdate(polygonId: string): Promise<void> {
    try {
      const alerts =
        await repositories().wazeAlerts.findActiveByPolygon(polygonId);
      const jams = await repositories().wazeJams.findActiveByPolygon(polygonId);

      // Emitir evento de dominio
      eventBus.emit(SystemEvents.WAZE_POLL_COMPLETE, {
        polygonId,
        alerts,
        jams,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error(
        `Error emitting update for ${polygonId}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Invalida cache relacionado con Waze
   */
  private async invalidateCache(polygonId?: string): Promise<void> {
    if (polygonId) {
      await cacheService.del(`waze:alerts:${polygonId}`);
      await cacheService.del(`waze:jams:${polygonId}`);
    } else {
      await cacheService.invalidate("waze:*");
    }
  }

  /**
   * Helper para delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Obtiene el estado del servicio
   */
  public getStatus(): {
    isPolling: boolean;
    lastPollTime: Date;
    polygonCount: number;
  } {
    return {
      isPolling: this.isPolling,
      lastPollTime: this.lastPollTime,
      polygonCount: REAL_POLYGONS.length,
    };
  }

  /**
   * Obtiene alerts activos de un polígono
   */
  public async getActiveAlerts(polygonId: string): Promise<WazeAlertDB[]> {
    const result = await dbService.query<WazeAlertDB>(
      `
            SELECT * FROM waze_alerts
            WHERE polygon_id = $1 AND is_active = true
            ORDER BY created_at DESC
        `,
      [polygonId],
    );
    return result.rows;
  }

  /**
   * Obtiene jams activos de un polígono
   */
  public async getActiveJams(polygonId: string): Promise<WazeJamDB[]> {
    const result = await dbService.query<WazeJamDB>(
      `
            SELECT * FROM waze_jams
            WHERE polygon_id = $1 AND is_active = true
            ORDER BY created_at DESC
        `,
      [polygonId],
    );
    return result.rows;
  }

  /**
   * Obtiene todos los alerts activos
   */
  public async getAllActiveAlerts(): Promise<WazeAlertDB[]> {
    const result = await dbService.query<WazeAlertDB>(`
            SELECT * FROM waze_alerts
            WHERE is_active = true
            ORDER BY created_at DESC
            LIMIT 1000
        `);
    return result.rows;
  }

  /**
   * Obtiene todos los jams activos
   */
  public async getAllActiveJams(): Promise<WazeJamDB[]> {
    const result = await dbService.query<WazeJamDB>(`
            SELECT * FROM waze_jams
            WHERE is_active = true
            ORDER BY created_at DESC
            LIMIT 1000
        `);
    return result.rows;
  }

  /**
   * Obtiene las métricas TVT más recientes para un polígono específico.
   * Basado en TVT Feed oficial de Waze:
   * https://support.google.com/waze/partners/answer/13658466
   */
  public async getLatestTvtMetrics(polygonId: string): Promise<any | null> {
    try {
      const result = await dbService.query(
        `SELECT polygon_id, wazers_count, jam_level_counts, length_of_jams, update_time, created_at
         FROM waze_tvt_metrics
         WHERE polygon_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [polygonId],
      );
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        polygonId: row.polygon_id,
        wazersCount: row.wazers_count,
        usersOnJams: row.jam_level_counts || [],
        lengthOfJams: row.length_of_jams || [],
        updateTime: row.update_time,
        createdAt: row.created_at,
      };
    } catch (error: unknown) {
      logger.error(
        `Error getting TVT metrics for ${polygonId}:`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  /**
   * Obtiene las métricas TVT más recientes para TODOS los polígonos.
   * Usa DISTINCT ON para obtener solo la fila más reciente por polígono.
   */
  public async getAllLatestTvtMetrics(): Promise<any[]> {
    try {
      const result = await dbService.query(
        `SELECT DISTINCT ON (polygon_id)
           polygon_id, wazers_count, jam_level_counts, length_of_jams, update_time, created_at
         FROM waze_tvt_metrics
         ORDER BY polygon_id, created_at DESC`,
      );
      return result.rows.map((row: any) => ({
        polygonId: row.polygon_id,
        wazersCount: row.wazers_count,
        usersOnJams: row.jam_level_counts || [],
        lengthOfJams: row.length_of_jams || [],
        updateTime: row.update_time,
        createdAt: row.created_at,
      }));
    } catch (error: unknown) {
      logger.error(
        "Error getting all TVT metrics:",
        error instanceof Error ? error.message : String(error),
      );
      return [];
    }
  }

  /**
   * Procesa el feed TVT (Traffic View Technology) de Waze
   *
   * Referencia oficial: https://support.google.com/waze/partners/answer/13658466
   *
   * Campos del TVT feed:
   * - usersOnJams: [{wazersCount, jamLevel}] - Usuarios en cada nivel de jam (0-4)
   * - lengthOfJams: [{jamLevel, jamLength}] - Longitud total de jams por nivel (1-5) en metros
   * - routes: Rutas configuradas con time/historicTime (si aplica)
   * - irregularities: Anomalías de tráfico
   * - updateTime: Timestamp de actualización del feed
   */
  private async processTvtFeed(polygon: RealPolygonConfig): Promise<void> {
    try {
      const response = await axios.get(polygon.tvtFeedUrl!, {
        timeout: 5000,
        headers: { "User-Agent": "Panel-Waze-Monitoreados/1.0" },
      });

      const data = response.data;
      if (!data) return;

      // usersOnJams: [{wazersCount: N, jamLevel: 0-4}]
      const usersOnJams = data.usersOnJams || [];
      const totalWazers = usersOnJams.reduce(
        (acc: number, item: any) => acc + (item.wazersCount || 0),
        0,
      );

      // lengthOfJams: [{jamLevel: 1-5, jamLength: N}] - longitud en metros
      const lengthOfJams = data.lengthOfJams || [];

      await dbService.query(
        `
                INSERT INTO waze_tvt_metrics (polygon_id, wazers_count, jam_level_counts, length_of_jams, update_time)
                VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0))
            `,
        [
          polygon.id,
          totalWazers,
          JSON.stringify(usersOnJams),
          JSON.stringify(lengthOfJams),
          data.updateTime || Date.now(),
        ],
      );
    } catch (error) {
      // Silencio errores de TVT para no ensuciar log principal
      throw error;
    }
  }

  private getNotificationTitle(alert: WazeAlert): string {
    const typeMap: Record<string, string> = {
      ACCIDENT: "🔴 Accidente Reportado",
      HAZARD: "⚠️ Peligro en la Vía",
      WEATHERHAZARD: "⛈️ Riesgo Climático",
    };
    const prefix = typeMap[alert.type] || "Alerta";
    const location = alert.street ? ` en ${alert.street}` : "";
    return `${prefix}${location}`;
  }

  /**
   * Genera un mensaje descriptivo para la notificación basado en tipo/subtipo
   * Excluye cualquier tag interno de AI
   */
  private getNotificationMessage(alert: WazeAlert): string {
    // Mapa de subtipos a descripciones en español
    const subtypeMessages: Record<string, string> = {
      // Accidentes
      ACCIDENT_MAJOR:
        "Accidente grave reportado. Precaución, posibles demoras.",
      ACCIDENT_MINOR: "Accidente menor reportado en la vía.",
      // Peligros en la vía
      HAZARD_ON_ROAD_OBJECT: "Objeto en la calzada. Circule con precaución.",
      HAZARD_ON_ROAD_CAR_STOPPED:
        "Vehículo detenido en el carril. Reduzca velocidad.",
      HAZARD_ON_ROAD_CONSTRUCTION: "Zona de construcción activa.",
      HAZARD_ON_ROAD_ICE: "Hielo en la calzada. Máxima precaución.",
      HAZARD_ON_ROAD_LANE_CLOSED: "Carril cerrado. Espere demoras.",
      HAZARD_ON_ROAD_OIL: "Derrame de aceite en la vía.",
      HAZARD_ON_ROAD_POT_HOLE: "Bache peligroso reportado.",
      HAZARD_ON_ROAD_ROAD_KILL: "Animal atropellado en la vía.",
      HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT: "Semáforo fuera de servicio.",
      // Peligros en banquina
      HAZARD_ON_SHOULDER: "Peligro en la banquina.",
      HAZARD_ON_SHOULDER_ANIMALS:
        "Animales sueltos cerca de la vía. Precaución.",
      HAZARD_ON_SHOULDER_CAR_STOPPED: "Vehículo detenido en la banquina.",
      HAZARD_ON_SHOULDER_MISSING_SIGN: "Señalización faltante o dañada.",
      // Clima
      HAZARD_WEATHER: "Condiciones climáticas adversas reportadas.",
      HAZARD_WEATHER_FLOOD: "Inundación en la vía. Busque ruta alternativa.",
      HAZARD_WEATHER_FOG: "Niebla densa. Reduzca velocidad y use luces.",
      HAZARD_WEATHER_HAIL: "Granizo reportado en la zona.",
      HAZARD_WEATHER_HEAVY_RAIN: "Lluvia intensa. Precaución al conducir.",
      HAZARD_WEATHER_HEAVY_SNOW: "Nevada intensa. Condiciones peligrosas.",
      HAZARD_WEATHER_FREEZING_RAIN: "Lluvia congelante. Piso resbaladizo.",
      // Camino cerrado
      ROAD_CLOSED: "Camino cerrado. Busque ruta alternativa.",
      ROAD_CLOSED_CONSTRUCTION: "Cierre por construcción.",
      ROAD_CLOSED_EVENT: "Cierre por evento especial.",
      ROAD_CLOSED_HAZARD: "Cierre por peligro en la vía.",
      // Jams
      JAM_HEAVY_TRAFFIC: "Tráfico pesado. Espere demoras significativas.",
      JAM_MODERATE_TRAFFIC: "Tráfico moderado en la zona.",
      JAM_STAND_STILL_TRAFFIC: "Tráfico detenido. Congestionamiento severo.",
    };

    // 1. Intentar usar el subtipo para mensaje específico
    if (alert.subtype && subtypeMessages[alert.subtype]) {
      const baseMessage = subtypeMessages[alert.subtype];
      // Agregar ubicación si está disponible
      if (alert.street) {
        return `${baseMessage} Ubicación: ${alert.street}.`;
      }
      return baseMessage;
    }

    // 2. Si hay reportDescription y NO contiene tags AI, usarla
    if (alert.reportDescription && !alert.reportDescription.includes("[AI")) {
      return alert.reportDescription;
    }

    // 3. Mensaje genérico basado en tipo principal
    const typeMessages: Record<string, string> = {
      ACCIDENT: "Accidente reportado en la vía.",
      HAZARD: "Peligro reportado en la vía.",
      WEATHERHAZARD: "Alerta climática en la zona.",
      ROAD_CLOSED: "Vía cerrada.",
      JAM: "Congestión de tráfico detectada.",
    };

    const genericMessage = typeMessages[alert.type] || "Incidente reportado.";
    if (alert.street) {
      return `${genericMessage} Ubicación: ${alert.street}.`;
    }
    return genericMessage;
  }
}

// Exportar instancia singleton
export const wazePollingService = WazePollingService.getInstance();
