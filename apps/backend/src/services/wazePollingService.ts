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
import { geoReferenceService } from "./geoReferenceService";
import { enrichAlertsWithRedZoneFlags } from "./wazeService";
import type { RedZoneMatch } from "./wazeService";

/**
 * Servicio de Polling de Waze con persistencia PostgreSQL
 * - Fetch periódico cada 30 segundos
 * - Almacenamiento en PostgreSQL (waze_alerts, waze_jams, waze_irregularities)
 * - Emisión via WebSocket a rooms por polígono
 * - Cache invalidation
 *
 * Optimizaciones v2:
 * - Mutex para evitar solapamiento de ciclos
 * - Notificaciones batch (N queries → 2 queries)
 * - TVT separado del loop principal
 * - Cache de polygon names para evitar queries repetitivas
 */
export class WazePollingService {
  private static instance: WazePollingService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private tvtInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private pollRunning: boolean = false;
  private tvtRunning: boolean = false;
  private lastPollTime: Date = new Date(0);

  private readonly POLLING_INTERVAL_MS = 30000;
  private readonly TVT_INTERVAL_MS = 60000; // TVT cada 60s (menos frecuente)
  private readonly REQUEST_TIMEOUT_MS = 10000;
  private readonly MAX_RETRIES = 3;
  private readonly INACTIVE_THRESHOLD_MINUTES = 30;
  private readonly RATE_LIMIT_DELAY_MS = 100;
  private readonly TVT_CONCURRENCY = 1; // TVT secuencial para no saturar pool DB

  // Cache de polygon names para evitar queries repetitivas
  private polygonNameCache = new Map<
    string,
    { name: string; group: string }
  >();

  private constructor() {
    logger.info("🔧 WazePollingService initialized (v2 - optimized)");
  }

  public static getInstance(): WazePollingService {
    if (!WazePollingService.instance) {
      WazePollingService.instance = new WazePollingService();
    }
    return WazePollingService.instance;
  }

  public async startPolling(): Promise<void> {
    if (this.isPolling) {
      logger.warn("⚠️ WazePollingService already polling");
      return;
    }

    await this.ensureTables();
    await this.warmPolygonNameCache();
    await geoReferenceService.loadMarkers();

    logger.info(
      `🚀 Starting Waze polling (feeds: ${this.POLLING_INTERVAL_MS / 1000}s, TVT: ${this.TVT_INTERVAL_MS / 1000}s)`,
    );
    this.isPolling = true;

    // Feed principal: inmediato + intervalo
    this.poll();
    this.pollingInterval = setInterval(
      () => this.poll(),
      this.POLLING_INTERVAL_MS,
    );

    // TVT separado: arranca 5s después para no competir
    setTimeout(() => {
      this.pollTvt();
      this.tvtInterval = setInterval(
        () => this.pollTvt(),
        this.TVT_INTERVAL_MS,
      );
    }, 5000);
  }

  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.tvtInterval) {
      clearInterval(this.tvtInterval);
      this.tvtInterval = null;
    }
    this.isPolling = false;
    logger.info("🛑 Waze polling stopped");
  }

  // ─── CACHE DE NOMBRES DE POLÍGONOS ────────────────────────────────

  private async warmPolygonNameCache(): Promise<void> {
    try {
      const res = await dbService.query(
        `SELECT id, name, "group" FROM config_polygons`,
      );
      for (const row of res.rows) {
        this.polygonNameCache.set(row.id, {
          name: row.name || row.id,
          group: row.group || "",
        });
      }
      logger.info(
        `📦 Polygon name cache warmed: ${this.polygonNameCache.size} entries`,
      );
    } catch {
      logger.warn("⚠️ Could not warm polygon name cache");
    }
  }

  private getPolygonInfo(polygonId: string): {
    name: string;
    group: string;
  } {
    return (
      this.polygonNameCache.get(polygonId) || {
        name: polygonId,
        group: "",
      }
    );
  }

  // ─── CICLO PRINCIPAL DE ALERTAS / JAMS ────────────────────────────

  private async poll(): Promise<void> {
    // Mutex: si el ciclo anterior sigue corriendo, saltar
    if (this.pollRunning) {
      logger.warn(
        "⏭️ Skipping poll cycle: previous cycle still running",
      );
      return;
    }

    this.pollRunning = true;
    const startTime = Date.now();
    logger.info(`📥 Polling ${REAL_POLYGONS.length} Waze feeds...`);

    const results: WazePollingResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      // Procesar en batches paralelos de 10 polígonos
      const BATCH_SIZE = 10;
      for (let i = 0; i < REAL_POLYGONS.length; i += BATCH_SIZE) {
        const batch = REAL_POLYGONS.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batch.map(async (polygon) => {
            const result = await this.fetchAndStorePolygonData(polygon);
            if (result.success) {
              await this.emitUpdate(polygon.id);
            }
            return result;
          }),
        );

        for (const settled of batchResults) {
          if (settled.status === "fulfilled") {
            results.push(settled.value);
            if (settled.value.success) successCount++;
            else errorCount++;
          } else {
            errorCount++;
            logger.error(`❌ Error polling batch:`, String(settled.reason));
          }
        }

        // Pequeña pausa entre batches para no saturar Waze API
        if (i + BATCH_SIZE < REAL_POLYGONS.length) {
          await this.sleep(200);
        }
      }

      await this.markInactiveData();
      await this.invalidateCache();

      const duration = Date.now() - startTime;
      this.lastPollTime = new Date();

      const totalAlerts = results.reduce((sum, r) => sum + r.alerts, 0);
      const totalJams = results.reduce((sum, r) => sum + r.jams, 0);

      let criticalCount = 0;
      try {
        const res = await dbService.query(
          `SELECT COUNT(*) as cnt FROM notifications
           WHERE created_at > NOW() - INTERVAL '35 seconds'
             AND type IN ('ACCIDENT','HAZARD')`,
        );
        criticalCount = parseInt(res.rows[0]?.cnt || "0", 10);
      } catch {
        /* ignore */
      }

      eventBus.emit(SystemEvents.WAZE_POLL_CYCLE_DONE, {
        totalPolygons: REAL_POLYGONS.length,
        successCount,
        totalAlerts,
        totalJams,
        criticalAlerts: criticalCount,
        durationMs: duration,
        timestamp: new Date(),
      });

      logger.info(
        `✅ Poll completed in ${duration}ms. Success: ${successCount}/${REAL_POLYGONS.length}, Alerts: ${totalAlerts}, Jams: ${totalJams}`,
      );
    } finally {
      this.pollRunning = false;
    }
  }

  // ─── CICLO TVT (SEPARADO) ─────────────────────────────────────────

  private async pollTvt(): Promise<void> {
    if (this.tvtRunning) {
      logger.debug("⏭️ Skipping TVT cycle: previous still running");
      return;
    }

    this.tvtRunning = true;
    const startTime = Date.now();
    const tvtPolygons = REAL_POLYGONS.filter((p) => p.tvtFeedUrl);

    if (tvtPolygons.length === 0) {
      this.tvtRunning = false;
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    try {
      // Procesar en batches de TVT_CONCURRENCY
      for (let i = 0; i < tvtPolygons.length; i += this.TVT_CONCURRENCY) {
        const batch = tvtPolygons.slice(i, i + this.TVT_CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map((p) => this.processTvtFeed(p)),
        );

        for (const r of results) {
          if (r.status === "fulfilled") successCount++;
          else errorCount++;
        }
      }

      const duration = Date.now() - startTime;
      logger.debug(
        `📡 TVT cycle done in ${duration}ms. OK: ${successCount}, Err: ${errorCount}`,
      );
    } finally {
      this.tvtRunning = false;
    }
  }

  // ─── FETCH + STORE POR POLÍGONO ───────────────────────────────────

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
      const data = await this.fetchFeedWithRetry(polygon.feedUrl);

      if (!data) {
        result.error = "No data received";
        return result;
      }

      // Almacenar alerts
      if (data.alerts && data.alerts.length > 0) {
        result.alerts = await this.storeAlerts(data.alerts, polygon.id);
      } else {
        await dbService.query(
          `UPDATE waze_alerts SET is_active = false, updated_at = NOW()
               WHERE polygon_id = $1 AND is_active = true`,
          [polygon.id],
        );
      }

      // Almacenar jams
      if (data.jams && data.jams.length > 0) {
        result.jams = await this.storeJams(data.jams, polygon.id);
      } else {
        await dbService.query(
          `UPDATE waze_jams SET is_active = false, updated_at = NOW()
               WHERE polygon_id = $1 AND is_active = true`,
          [polygon.id],
        );
      }

      // Almacenar irregularities
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
          const delay = Math.pow(2, attempt - 1) * 1000;
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }

  // ─── STORE ALERTS (OPTIMIZADO CON BATCH NOTIFICATIONS) ────────────

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
        is_active: true,
      }));

      await repositories().wazeAlerts.bulkUpsert(entities as any);

      // 1b. Enriquecer alertas con geo-referencia (hito más cercano + TTS)
      await this.enrichAlertsWithGeoData(alerts);

      // 1c. RAC geofencing: marcar isRedZone si caen en zonas_peligrosas (Turf)
      await enrichAlertsWithRedZoneFlags(alerts);

      // 2. Marcar como INACTIVOS los que ya no están en el feed
      const currentUuids = alerts.map((a) => a.uuid);
      if (currentUuids.length > 0) {
        await dbService.query(
          `UPDATE waze_alerts
               SET is_active = false, updated_at = NOW()
               WHERE polygon_id = $1
               AND is_active = true
               AND uuid NOT LIKE 'SIM-%'
               AND NOT (uuid = ANY($2))`,
          [polygonId, currentUuids],
        );
      } else {
        await dbService.query(
          `UPDATE waze_alerts
               SET is_active = false, updated_at = NOW()
               WHERE polygon_id = $1 AND is_active = true
               AND uuid NOT LIKE 'SIM-%'`,
          [polygonId],
        );
      }

      // 3. Notificaciones batch para eventos críticos NUEVOS
      const criticalTypes = ["ACCIDENT", "HAZARD", "WEATHERHAZARD"];
      const criticalAlerts = alerts.filter((a) =>
        criticalTypes.includes(a.type),
      );

      if (criticalAlerts.length > 0) {
        await this.processCriticalNotificationsBatch(
          criticalAlerts,
          polygonId,
        );
      }

      // 4. Auto-crear siniestros en road_accidents para TODOS los accidentes
      const accidents = alerts.filter((a) => a.type === "ACCIDENT");
      if (accidents.length > 0) {
        await this.processAccidents(accidents, polygonId);
      }

      // 5. Inactivar siniestros que ya no están
      const accUuids = accidents.map((a) => a.uuid);
      if (accUuids.length > 0) {
        await dbService.query(
          `UPDATE road_accidents SET status='inactive', updated_at=NOW()
               WHERE polygon_id=$1 AND incident_id IS NOT NULL AND status='active' AND NOT (incident_id = ANY($2))`,
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

  /**
   * Procesa notificaciones en batch: 2 queries en lugar de N*3
   * 1. Fetch recientes + ya notificados en una sola query
   * 2. Iterar solo los candidatos válidos
   */
  private async processCriticalNotificationsBatch(
    criticalAlerts: WazeAlert[],
    polygonId: string,
  ): Promise<void> {
    try {
      const uuids = criticalAlerts.map((a) => a.uuid);

      // BATCH: obtener created_at de todas las alertas + si ya tienen notificación
      const batchRes = await dbService.query(
        `SELECT
           wa.uuid,
           wa.created_at,
           EXISTS(
             SELECT 1 FROM notifications n
             WHERE n.data->>'uuid' = wa.uuid
           ) AS already_notified
         FROM waze_alerts wa
         WHERE wa.uuid = ANY($1)`,
        [uuids],
      );

      const alertInfoMap = new Map<
        string,
        { createdAt: number; alreadyNotified: boolean }
      >();
      for (const row of batchRes.rows) {
        alertInfoMap.set(row.uuid, {
          createdAt: new Date(row.created_at).getTime(),
          alreadyNotified: row.already_notified,
        });
      }

      const now = Date.now();
      const polygonInfo = this.getPolygonInfo(polygonId);

      // Procesamiento concurrente de notificaciones críticas
      await Promise.allSettled(
        criticalAlerts.map(async (alert) => {
          const info = alertInfoMap.get(alert.uuid);
          if (!info) return;

          // No notificar alertas viejas (>5 min)
          if (now - info.createdAt >= 300000) return;

          // Ya notificada por UUID
          if (info.alreadyNotified) return;

          // Dedup por contenido (misma ubicación geográfica)
          const lat = alert.location?.y ?? 0;
          const lng = alert.location?.x ?? 0;

          const existingByContent = await dbService.query(
            `SELECT 1 FROM notifications
             WHERE type = $1
               AND COALESCE(data->>'subtype', '') = $2
               AND created_at > NOW() - INTERVAL '10 minutes'
               AND ABS(COALESCE(CAST(data->>'latitude' AS FLOAT), 0) - $3) < 0.001
               AND ABS(COALESCE(CAST(data->>'longitude' AS FLOAT), 0) - $4) < 0.001
             LIMIT 1`,
            [
              alert.type === "ACCIDENT" ? "ACCIDENT" : "HAZARD",
              alert.subtype || "",
              lat,
              lng,
            ],
          );

          if ((existingByContent.rowCount ?? 0) > 0) {
            logger.info(`🔕 Notificación duplicada por CONTENIDO: ${alert.uuid}`);
            return;
          }

          const title = this.getNotificationTitle(alert);
          const message = this.getNotificationMessage(alert);

          const nearest = geoReferenceService.findNearestMarker(lat, lng);
          const ttsText = geoReferenceService.generateTTSText(
            alert.type,
            alert.subtype,
            nearest,
            alert.street,
          );

          const redZone = (alert as WazeAlert & { redZoneMatch?: RedZoneMatch }).redZoneMatch;
          if (redZone) {
            eventBus.emit(SystemEvents.RED_ZONE_CRITICAL_ALERT, {
              ...alert,
              polygonId,
              redZonaId: redZone.redZonaId,
              redZonaNombre: redZone.redZonaNombre,
              protocolo_accion: redZone.protocolo_accion,
              nivel_severidad: redZone.nivel_severidad,
            });
          }

          await notificationService.create(
            alert.type === "ACCIDENT" ? "ACCIDENT" : "HAZARD",
            title,
            message,
            this.buildIncidentNotificationPayload(
              alert,
              polygonId,
              polygonInfo,
              nearest,
              ttsText,
              redZone,
            ),
          );
          logger.info(
            `🔔 Notificación enviada para alerta ${alert.uuid}${redZone ? " (🚨 ZONA PELIGROSA RAC)" : ""}`,
          );
        })
      );
    } catch (error) {
      logger.error(
        "Error processing batch notifications:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Procesa accidentes para road_accidents
   */
  private async processAccidents(
    accidents: WazeAlert[],
    polygonId: string,
  ): Promise<void> {
    // Batch: obtener todos los incident_ids existentes de una vez
    const accUuids = accidents.map((a) => a.uuid);
    let existingIds: Set<string>;
    try {
      const res = await dbService.query(
        `SELECT incident_id FROM road_accidents WHERE incident_id = ANY($1)`,
        [accUuids],
      );
      existingIds = new Set(res.rows.map((r: any) => r.incident_id));
    } catch {
      existingIds = new Set();
    }

    await Promise.allSettled(
      accidents.map(async (accident) => {
        try {
          if (!existingIds.has(accident.uuid)) {
            const { roadAccidentService } = require("./roadAccidentService");
            const { weatherService } = require("./weatherService");
            let weatherData: Record<string, unknown> = {};
            try {
              const w = await weatherService.fetchWeatherForPolygon(
                `accident_${accident.uuid}`,
                accident.location.y,
                accident.location.x,
              );
              if (w) {
                weatherData = {
                  temperature_celsius: w.temperature_celsius,
                  precipitation_mm: w.precipitation_mm,
                  weather_code: w.weather_code,
                  wind_speed_kmh: w.wind_speed_kmh,
                  visibility_meters: w.visibility_meters,
                  humidity_percent: w.humidity_percent,
                  weather_description: w.weather_description,
                  is_freezing_risk: w.is_freezing_risk,
                };
              }
            } catch {
              logger.warn(`Clima no disponible para accidente ${accident.uuid}`);
            }

            await roadAccidentService.createAccident({
              incident_id: accident.uuid,
              type: "ACCIDENT",
              subtype: accident.subtype || undefined,
              severity: accident.reliability
                ? Math.min(5, Math.max(1, Math.round(accident.reliability / 2)))
                : 3,
              waze_data: accident,
              weather_data: weatherData,
              status: "active",
              polygon_id: polygonId,
              accident_at: new Date(accident.pubMillis),
              location_lat: accident.location.y,
              location_lng: accident.location.x,
              street: accident.street,
              description: accident.reportDescription || accident.subtype,
            });
          } else {
            await dbService.query(
              "UPDATE road_accidents SET status='active', updated_at=NOW() WHERE incident_id=$1",
              [accident.uuid],
            );
          }
        } catch (error) {
          logger.error(
            `Error processing accident ${accident.uuid}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      })
    );
  }

  // ─── STORE JAMS ───────────────────────────────────────────────────

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
               WHERE polygon_id = $1 AND is_active = true AND NOT (uuid = ANY($2))`,
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

  // ─── STORE IRREGULARITIES ─────────────────────────────────────────

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
      if (currentUuids.length > 0 && currentUuids[0]) {
        await dbService.query(
          `UPDATE waze_irregularities SET is_active = false, updated_at = NOW()
               WHERE polygon_id = $1 AND is_active = true AND NOT (uuid = ANY($2))`,
          [polygonId, currentUuids],
        );
      }
      return irregularities.length;
    } catch (error) {
      logger.error("Error storing irregularities:", String(error));
      return 0;
    }
  }

  // ─── MARK INACTIVE ────────────────────────────────────────────────

  private async markInactiveData(): Promise<void> {
    const thresholdMs = this.INACTIVE_THRESHOLD_MINUTES * 60 * 1000;
    const cutoffTime = new Date(Date.now() - thresholdMs);

    try {
      await repositories().wazeAlerts.markInactive(cutoffTime);

      await dbService.query(
        `UPDATE waze_jams SET is_active = false WHERE is_active = true AND pub_millis < $1`,
        [cutoffTime.getTime()],
      );

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

  // ─── EMIT UPDATE ──────────────────────────────────────────────────

  private async emitUpdate(polygonId: string): Promise<void> {
    try {
      const alerts =
        await repositories().wazeAlerts.findActiveByPolygon(polygonId);
      const jams = await repositories().wazeJams.findActiveByPolygon(polygonId);

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

  // ─── CACHE INVALIDATION ───────────────────────────────────────────

  private async invalidateCache(polygonId?: string): Promise<void> {
    if (polygonId) {
      await cacheService.del(`waze:alerts:${polygonId}`);
      await cacheService.del(`waze:jams:${polygonId}`);
    } else {
      await cacheService.invalidate("waze:*");
    }
  }

  // ─── TVT FEED ─────────────────────────────────────────────────────

  private async processTvtFeed(polygon: RealPolygonConfig): Promise<void> {
    const response = await axios.get(polygon.tvtFeedUrl!, {
      timeout: 5000,
      headers: { "User-Agent": "Panel-Waze-Monitoreados/1.0" },
    });

    const data = response.data;
    if (!data) return;

    const usersOnJams = data.usersOnJams || [];
    const totalWazers = usersOnJams.reduce(
      (acc: number, item: any) => acc + (item.wazersCount || 0),
      0,
    );

    const lengthOfJams = data.lengthOfJams || [];

    await dbService.query(
      `INSERT INTO waze_tvt_metrics (polygon_id, wazers_count, jam_level_counts, length_of_jams, update_time)
       VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0))`,
      [
        polygon.id,
        totalWazers,
        JSON.stringify(usersOnJams),
        JSON.stringify(lengthOfJams),
        data.updateTime || Date.now(),
      ],
    );
  }

  // ─── ENSURE TABLES ────────────────────────────────────────────────

  private async ensureTables(): Promise<void> {
    logger.info("🔧 Verificando tablas de Waze...");

    try {
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
      await dbService.query(
        `ALTER TABLE waze_alerts ADD COLUMN IF NOT EXISTS nearest_km_name VARCHAR(150)`,
      );
      await dbService.query(
        `ALTER TABLE waze_alerts ADD COLUMN IF NOT EXISTS nearest_km_route VARCHAR(255)`,
      );
      await dbService.query(
        `ALTER TABLE waze_alerts ADD COLUMN IF NOT EXISTS nearest_km_distance DECIMAL(10,2)`,
      );
      await dbService.query(
        `ALTER TABLE waze_alerts ADD COLUMN IF NOT EXISTS tts_text TEXT`,
      );

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

      await dbService.query(
        `CREATE INDEX IF NOT EXISTS idx_alerts_polygon ON waze_alerts(polygon_id, is_active, created_at DESC)`,
      );
      await dbService.query(
        `CREATE INDEX IF NOT EXISTS idx_jams_polygon ON waze_jams(polygon_id, is_active, created_at DESC)`,
      );
      await dbService.query(
        `CREATE INDEX IF NOT EXISTS idx_irreg_polygon ON waze_irregularities(polygon_id, is_active, created_at DESC)`,
      );

      await dbService.query(`
                CREATE TABLE IF NOT EXISTS waze_tvt_metrics (
                    id SERIAL PRIMARY KEY,
                    polygon_id VARCHAR(50) NOT NULL,
                    wazers_count NUMERIC(10, 2) DEFAULT 0,
                    jam_level_counts JSONB,
                    length_of_jams JSONB,
                    update_time TIMESTAMPTZ,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            `);
      await dbService.query(
        `CREATE INDEX IF NOT EXISTS idx_tvt_polygon_time ON waze_tvt_metrics(polygon_id, created_at DESC)`,
      );
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

  // ─── GEO-REFERENCIA DE ALERTAS ────────────────────────────────────

  /**
   * Enriquece alertas recién insertadas con el hito kilométrico más cercano
   * y un texto TTS optimizado. Usa un batch UPDATE para eficiencia.
   */
  private async enrichAlertsWithGeoData(alerts: WazeAlert[]): Promise<void> {
    await geoReferenceService.ensureLoaded();
    if (geoReferenceService.getMarkerCount() === 0) return;

    const updates: Array<{
      uuid: string;
      km_name: string;
      km_route: string;
      km_dist: number;
      tts: string;
    }> = [];

    for (const alert of alerts) {
      const lat = alert.location?.y ?? 0;
      const lng = alert.location?.x ?? 0;
      if (!lat || !lng) continue;

      const nearest = geoReferenceService.findNearestMarker(lat, lng);
      if (!nearest) continue;

      const ttsText = geoReferenceService.generateTTSText(
        alert.type,
        alert.subtype,
        nearest,
        alert.street,
      );

      updates.push({
        uuid: alert.uuid,
        km_name: nearest.name,
        km_route: nearest.route_name,
        km_dist: Math.round(nearest.distance * 100) / 100,
        tts: ttsText,
      });
    }

    if (updates.length === 0) return;

    try {
      const values: any[] = [];
      const rows: string[] = [];

      updates.forEach((u, i) => {
        const off = i * 5;
        rows.push(
          `($${off + 1}, $${off + 2}, $${off + 3}, $${off + 4}::decimal, $${off + 5})`,
        );
        values.push(u.uuid, u.km_name, u.km_route, u.km_dist, u.tts);
      });

      await dbService.query(
        `UPDATE waze_alerts AS wa SET
           nearest_km_name = v.km_name,
           nearest_km_route = v.km_route,
           nearest_km_distance = v.km_dist,
           tts_text = v.tts
         FROM (VALUES ${rows.join(", ")})
           AS v(uuid, km_name, km_route, km_dist, tts)
         WHERE wa.uuid = v.uuid`,
        values,
      );
    } catch (err) {
      logger.error(
        "Error enriching alerts with geo data:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // ─── HELPERS ──────────────────────────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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

  // ─── PUBLIC QUERY METHODS ─────────────────────────────────────────

  public async getActiveAlerts(polygonId: string): Promise<WazeAlertDB[]> {
    const result = await dbService.query<WazeAlertDB>(
      `SELECT * FROM waze_alerts
       WHERE polygon_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [polygonId],
    );
    return result.rows;
  }

  public async getActiveJams(polygonId: string): Promise<WazeJamDB[]> {
    const result = await dbService.query<WazeJamDB>(
      `SELECT * FROM waze_jams
       WHERE polygon_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [polygonId],
    );
    return result.rows;
  }

  public async getAllActiveAlerts(): Promise<WazeAlertDB[]> {
    const result = await dbService.query<WazeAlertDB>(
      `SELECT * FROM waze_alerts
       WHERE is_active = true
       ORDER BY created_at DESC
       LIMIT 1000`,
    );
    return result.rows;
  }

  public async getAllActiveJams(): Promise<WazeJamDB[]> {
    const result = await dbService.query<WazeJamDB>(
      `SELECT * FROM waze_jams
       WHERE is_active = true
       ORDER BY created_at DESC
       LIMIT 1000`,
    );
    return result.rows;
  }

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

  public async getAllLatestTvtMetrics(): Promise<any[]> {
    try {
      const result = await dbService.query(
        `SELECT t.polygon_id, t.wazers_count, t.jam_level_counts, t.length_of_jams, t.update_time, t.created_at
         FROM (SELECT DISTINCT polygon_id FROM waze_tvt_metrics) AS p
         CROSS JOIN LATERAL (
           SELECT * FROM waze_tvt_metrics m
           WHERE m.polygon_id = p.polygon_id
           ORDER BY m.created_at DESC
           LIMIT 1
         ) AS t`,
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

  // ─── NOTIFICATION HELPERS ─────────────────────────────────────────

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

  private getNotificationMessage(alert: WazeAlert): string {
    const subtypeMessages: Record<string, string> = {
      ACCIDENT_MAJOR:
        "Accidente grave reportado. Precaución, posibles demoras.",
      ACCIDENT_MINOR: "Accidente menor reportado en la vía.",
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
      HAZARD_ON_SHOULDER: "Peligro en la banquina.",
      HAZARD_ON_SHOULDER_ANIMALS:
        "Animales sueltos cerca de la vía. Precaución.",
      HAZARD_ON_SHOULDER_CAR_STOPPED: "Vehículo detenido en la banquina.",
      HAZARD_ON_SHOULDER_MISSING_SIGN: "Señalización faltante o dañada.",
      HAZARD_WEATHER: "Condiciones climáticas adversas reportadas.",
      HAZARD_WEATHER_FLOOD: "Inundación en la vía. Busque ruta alternativa.",
      HAZARD_WEATHER_FOG: "Niebla densa. Reduzca velocidad y use luces.",
      HAZARD_WEATHER_HAIL: "Granizo reportado en la zona.",
      HAZARD_WEATHER_HEAVY_RAIN: "Lluvia intensa. Precaución al conducir.",
      HAZARD_WEATHER_HEAVY_SNOW: "Nevada intensa. Condiciones peligrosas.",
      HAZARD_WEATHER_FREEZING_RAIN: "Lluvia congelante. Piso resbaladizo.",
      ROAD_CLOSED: "Camino cerrado. Busque ruta alternativa.",
      ROAD_CLOSED_CONSTRUCTION: "Cierre por construcción.",
      ROAD_CLOSED_EVENT: "Cierre por evento especial.",
      ROAD_CLOSED_HAZARD: "Cierre por peligro en la vía.",
      JAM_HEAVY_TRAFFIC: "Tráfico pesado. Espere demoras significativas.",
      JAM_MODERATE_TRAFFIC: "Tráfico moderado en la zona.",
      JAM_STAND_STILL_TRAFFIC: "Tráfico detenido. Congestionamiento severo.",
    };

    if (alert.subtype && subtypeMessages[alert.subtype]) {
      const baseMessage = subtypeMessages[alert.subtype];
      if (alert.street) {
        return `${baseMessage} Ubicación: ${alert.street}.`;
      }
      return baseMessage;
    }

    if (alert.reportDescription && !alert.reportDescription.includes("[AI")) {
      return alert.reportDescription;
    }

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

  /**
   * Payload completo para notificación + mapa (sin depender del refetch del feed).
   * Se persiste en notifications.data antes de emitir notification:new.
   */
  private buildIncidentNotificationPayload(
    alert: WazeAlert,
    polygonId: string,
    polygonInfo: { name: string; group?: string },
    nearest: ReturnType<typeof geoReferenceService.findNearestMarker>,
    ttsText: string,
    redZone: RedZoneMatch | null | undefined,
  ): Record<string, unknown> {
    const lat = alert.location?.y ?? 0;
    const lng = alert.location?.x ?? 0;
    const description =
      alert.reportDescription && !alert.reportDescription.includes("[AI")
        ? alert.reportDescription
        : this.getNotificationMessage(alert);

    return {
      uuid: alert.uuid,
      alertId: alert.uuid,
      id: alert.uuid,
      incidentType: alert.type,
      type: alert.type.toLowerCase(),
      subtype: (alert.subtype || "").toLowerCase(),
      street: alert.street || null,
      city: alert.city || null,
      country: alert.country || null,
      description,
      reportDescription: alert.reportDescription || null,
      pubMillis: alert.pubMillis,
      timestamp: new Date(alert.pubMillis).toISOString(),
      reportBy: alert.reportBy || null,
      nThumbsUp: alert.nThumbsUp ?? 0,
      reportRating: alert.reportRating ?? null,
      confidence: alert.confidence,
      reliability: alert.reliability,
      magvar: alert.magvar ?? null,
      location: { x: lng, y: lat },
      latitude: lat,
      longitude: lng,
      polygonId,
      polygonName: polygonInfo.name,
      polygonGroup: polygonInfo.group ?? null,
      nearestKmName: nearest?.name ?? null,
      nearestKmRoute: nearest?.route_name ?? null,
      nearestKmDistance: nearest ? Math.round(nearest.distance) : null,
      ttsText,
      isRedZone: redZone ? true : undefined,
      isDangerZone: redZone ? true : undefined,
      dangerZoneId: redZone?.redZonaId,
      dangerZoneName: redZone?.redZonaNombre,
      redZoneProtocol: redZone?.protocolo_accion,
    };
  }

  /**
   * Ingesta alertas simuladas con el mismo pipeline que un input del feed Waze:
   * geo-referencia, zona peligrosa, notificación persistida, TTS y socket.
   * No desactiva otras alertas del polígono (a diferencia de storeAlerts).
   */
  public async ingestSimulatedAlerts(
    alerts: WazeAlert[],
    polygonId: string,
  ): Promise<void> {
    if (alerts.length === 0) return;

    try {
      const entities = alerts.map((a) => ({
        ...a,
        polygon_id: polygonId,
        city: a.city || undefined,
        street: a.street || undefined,
        report_by: a.reportBy || null,
        magvar: a.magvar || null,
        is_active: true,
      }));

      await repositories().wazeAlerts.bulkUpsert(entities as any);
      await this.enrichAlertsWithGeoData(alerts);
      await enrichAlertsWithRedZoneFlags(alerts);

      const criticalTypes = ["ACCIDENT", "HAZARD", "WEATHERHAZARD"];
      const criticalAlerts = alerts.filter((a) =>
        criticalTypes.includes(a.type),
      );
      if (criticalAlerts.length > 0) {
        await this.processCriticalNotificationsBatch(
          criticalAlerts,
          polygonId,
        );
      }

      const accidents = alerts.filter((a) => a.type === "ACCIDENT");
      if (accidents.length > 0) {
        await this.processAccidents(accidents, polygonId);
      }

      await this.emitUpdate(polygonId);
      await this.invalidateCache(polygonId);

      logger.info(
        `🤖 Simulación ingestada como feed Waze: ${alerts.length} alerta(s) en ${polygonId}`,
      );
    } catch (error) {
      logger.error(
        "Error ingesting simulated alerts:",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}

// Exportar instancia singleton
export const wazePollingService = WazePollingService.getInstance();
