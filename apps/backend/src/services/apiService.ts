import { repositories } from "../repositories";
import { logger } from "../utils/logger";
import { PolygonStatus, Severity, PolygonTrafficMetrics } from "../types";
import { WazeAlert } from "../repositories/WazeAlertRepository";
import { WazeJam } from "../repositories/WazeJamRepository";

/**
 * Servicio API - VERSIÓN REFACTORIZADA (Repository Pattern)
 * Lógica de negocio para calcular estados y KPIs a partir de datos de DB.
 */
const RESPONSE_CACHE_TTL_MS = 25_000;
type CacheEntry<T> = { value: T; expiresAt: number; inFlight?: Promise<T> };

export class ApiService {
  private responseCache = new Map<string, CacheEntry<unknown>>();

  private async cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.responseCache.get(key) as CacheEntry<T> | undefined;
    if (hit && hit.expiresAt > now) return hit.value;
    if (hit?.inFlight) return hit.inFlight;
    const inFlight = fn()
      .then((value) => {
        this.responseCache.set(key, {
          value,
          expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS,
        });
        return value;
      })
      .catch((err) => {
        this.responseCache.delete(key);
        throw err;
      });
    this.responseCache.set(key, {
      value: hit?.value as T,
      expiresAt: 0,
      inFlight,
    });
    return inFlight;
  }

  /**
   * Obtiene el estado de todos los polígonos
   */
  async getPolygonsStatus(): Promise<PolygonStatus[]> {
    return this.cached("polygons:status", () => this._getPolygonsStatusUncached());
  }

  private async _getPolygonsStatusUncached(): Promise<PolygonStatus[]> {
    try {
      logger.info("🔍 getPolygonsStatus: Iniciando...");
      const polygons = await repositories().polygons.findAll();
      logger.info(
        `🔍 getPolygonsStatus: ${polygons.length} polígonos encontrados`,
      );

      const alerts = await repositories().wazeAlerts.findAllActive();
      logger.info(
        `🔍 getPolygonsStatus: ${alerts.length} alertas activas encontradas`,
      );

      const jams = await repositories().wazeJams.findAllActive();
      logger.info(
        `🔍 getPolygonsStatus: ${jams.length} jams activos encontrados`,
      );

      const lastUpdate = new Date();

      // Crear Maps para lookups O(1)
      const alertsByPolygon = new Map<string, WazeAlert[]>();
      const jamsByPolygon = new Map<string, WazeJam[]>();

      for (const alert of alerts) {
        if (!alert.polygon_id) continue;
        if (!alertsByPolygon.has(alert.polygon_id)) {
          alertsByPolygon.set(alert.polygon_id, []);
        }
        alertsByPolygon.get(alert.polygon_id)!.push(alert);
      }

      for (const jam of jams) {
        if (!jam.polygon_id) continue;
        if (!jamsByPolygon.has(jam.polygon_id)) {
          jamsByPolygon.set(jam.polygon_id, []);
        }
        jamsByPolygon.get(jam.polygon_id)!.push(jam);
      }

      // Procesar polígonos
      return polygons.map((poly: any) => {
        const polyAlerts = alertsByPolygon.get(poly.id) || [];
        const polyJams = jamsByPolygon.get(poly.id) || [];

        // Calcular métricas
        const alertCount = polyAlerts.length;
        const jamCount = polyJams.length;

        let totalDelay = 0;
        let totalSpeed = 0;
        let criticalAlerts = 0;
        let hasCriticalJam = false;
        let hasHighJam = false;

        // Loop para alertas (usando tipos DB: snake_case o mapeados?)
        // Repository returns Mapped Entities (camelCase keys if mapped?)
        // Wait, WazeAlertRepository mapRowToEntity returns `uuid`, `polygon_id` (snake), `location` (x,y camel).
        // Let's check wazeAlertRepository.ts again.
        // mapRowToEntity: uuid, polygon_id, type, subtype...
        // So property access must match the Entity interface.

        // Entity has `polygon_id`, `type`, `location`...
        // But Severity calculation... `calculateAlertSeverity` is in wazeUtils.
        // The Entity DOES NOT have severity.
        // I need to calculate it on the fly.

        // Import calculateAlertSeverity
        const {
          calculateAlertSeverity,
          mapJamSeverity,
        } = require("../utils/wazeUtils"); // lazy import or top level? Top level is better.

        for (const alert of polyAlerts) {
          const sev = calculateAlertSeverity({
            type: alert.type,
            confidence: alert.confidence,
            reliability: alert.reliability,
            subtype: alert.subtype,
            // nThumbsUp missing in Entity?
            // WazeAlert interface has: reliability, confidence. nThumbsUp??
            // Check WazeAlertRepository.ts... It DOES NOT have nThumbsUp.
            // It was lost in migration? Or DB schema doesn't have it?
            // DB audit: waze_alerts table... does it have n_thumbs_up?
            // I might have missed it.
            // If missing, I assume 0.
          });

          if (sev >= Severity.HIGH) criticalAlerts++;
        }

        for (const jam of polyJams) {
          totalDelay += jam.delay || 0;
          totalSpeed += jam.speedKMH || 0;

          const sev = mapJamSeverity(jam.level || 0);

          if (sev >= Severity.CRITICAL) hasCriticalJam = true;
          if (sev >= Severity.HIGH) hasHighJam = true;
        }

        const avgSpeed = jamCount > 0 ? totalSpeed / jamCount : null;

        // Determinar estado
        let state: "low" | "medium" | "high" = "low";
        if (criticalAlerts > 0 || hasCriticalJam || totalDelay > 900) {
          state = "high";
        } else if (hasHighJam || alertCount > 3 || totalDelay > 300) {
          state = "medium";
        }

        return {
          id: poly.id,
          name: poly.name,
          group: poly.group || "Sin Grupo",
          state,
          metrics: {
            alertCount,
            jamCount,
            totalDelay,
            avgSpeed,
            criticalAlerts,
          },
          lastUpdate,
        };
      });
    } catch (error) {
      logger.error(`Error en getPolygonsStatus: ${error}`);
      return [];
    }
  }

  /**
   * Obtiene detalle de un polígono específico
   */
  async getPolygonDetail(id: string): Promise<any> {
    try {
      const polygons = await repositories().polygons.findAll();
      const poly = polygons.find((p: any) => p.id === id);
      if (!poly) return null;

      // Fetch specific polygon data
      const alerts = await repositories().wazeAlerts.findActiveByPolygon(id);
      const jams = await repositories().wazeJams.findActiveByPolygon(id);

      // Map to frontend expected format if necessary?
      // Existing frontend expects: internalAlert format.
      // We should map it here to avoid breaking frontend?
      // Or change frontend? Changing frontend is Phase 6 code cleanup... maybe too risky.
      // I'll return the DB entities plus calculated fields if needed.
      // Or I will create a mapper to maintain backward compatibility.

      return {
        id: poly.id,
        name: poly.name,
        group: poly.group || "Sin Grupo",
        items: {
          alerts, // These are WazeAlert entities
          jams, // These are WazeJam entities
        },
      };
    } catch (error) {
      logger.error(`Error en getPolygonDetail: ${error}`);
      return null;
    }
  }

  async getGlobalKPIs() {
    return this.cached("kpis:global", () => this._getGlobalKPIsUncached());
  }

  private async _getGlobalKPIsUncached() {
    logger.info("🔍 getGlobalKPIs: Iniciando...");

    // Variables con valores por defecto
    let alerts: WazeAlert[] = [];
    let jams: WazeJam[] = [];
    let rawPolygons: any[] = [];

    // 1. Obtener TODOS los datos en PARALELO (1 round-trip en vez de 6)
    try {
      const [polygonsResult, alertsResult, jamsResult] = await Promise.all([
        repositories().polygons.findAll(),
        repositories().wazeAlerts.findAllActive(),
        repositories().wazeJams.findAllActive(),
      ]);
      rawPolygons = polygonsResult;
      alerts = alertsResult;
      jams = jamsResult;
      logger.info(
        `🔍 getGlobalKPIs: ${rawPolygons.length} polígonos, ${alerts.length} alertas, ${jams.length} jams`,
      );
    } catch (error) {
      logger.error(`❌ getGlobalKPIs: Error obteniendo datos: ${error}`);
    }

    // 2. Calcular estado de polígonos (reutilizando alerts y jams ya cargados)
    const {
      calculateAlertSeverity,
      mapJamSeverity,
    } = require("../utils/wazeUtils");

    // Crear Maps para lookups O(1)
    const alertsByPolygon = new Map<string, WazeAlert[]>();
    const jamsByPolygon = new Map<string, WazeJam[]>();

    for (const alert of alerts) {
      if (!alert.polygon_id) continue;
      if (!alertsByPolygon.has(alert.polygon_id)) {
        alertsByPolygon.set(alert.polygon_id, []);
      }
      alertsByPolygon.get(alert.polygon_id)!.push(alert);
    }

    for (const jam of jams) {
      if (!jam.polygon_id) continue;
      if (!jamsByPolygon.has(jam.polygon_id)) {
        jamsByPolygon.set(jam.polygon_id, []);
      }
      jamsByPolygon.get(jam.polygon_id)!.push(jam);
    }

    const lastUpdate = new Date();

    // Procesar polígonos en un solo pass
    const polygons: PolygonStatus[] = rawPolygons.map((poly: any) => {
      const polyAlerts = alertsByPolygon.get(poly.id) || [];
      const polyJams = jamsByPolygon.get(poly.id) || [];

      const alertCount = polyAlerts.length;
      const jamCount = polyJams.length;
      let totalDelay = 0;
      let totalSpeed = 0;
      let criticalAlerts = 0;
      let hasCriticalJam = false;
      let hasHighJam = false;

      for (const alert of polyAlerts) {
        const sev = calculateAlertSeverity({
          type: alert.type,
          confidence: alert.confidence,
          reliability: alert.reliability,
          subtype: alert.subtype,
        });
        if (sev >= Severity.HIGH) criticalAlerts++;
      }

      for (const jam of polyJams) {
        totalDelay += jam.delay || 0;
        totalSpeed += jam.speedKMH || 0;
        const sev = mapJamSeverity(jam.level || 0);
        if (sev >= Severity.CRITICAL) hasCriticalJam = true;
        if (sev >= Severity.HIGH) hasHighJam = true;
      }

      const avgSpeed = jamCount > 0 ? totalSpeed / jamCount : null;
      let state: "low" | "medium" | "high" = "low";
      if (criticalAlerts > 0 || hasCriticalJam || totalDelay > 900) {
        state = "high";
      } else if (hasHighJam || alertCount > 3 || totalDelay > 300) {
        state = "medium";
      }

      return {
        id: poly.id,
        name: poly.name,
        group: poly.group || "Sin Grupo",
        state,
        metrics: { alertCount, jamCount, totalDelay, avgSpeed, criticalAlerts },
        lastUpdate,
      };
    });
    // 3. Calcular estadísticas de siniestros (ya tenemos alerts y calculateAlertSeverity en scope)

    // Contar alertas de tipo ACCIDENTE en TODOS los polígonos monitoreados
    let racAccidentsTotal = 0;
    let racAccidentsCritical = 0;
    let racAccidentsHigh = 0;

    for (const alert of alerts) {
      // Filtrar por tipo y que tenga polígono asignado
      if (
        (alert.type === "ACCIDENT" || alert.type.startsWith("ACCIDENT_")) &&
        alert.polygon_id
      ) {
        racAccidentsTotal++;

        // Calcular severidad al vuelo si no viene pre-calculada
        const sev = calculateAlertSeverity({
          type: alert.type,
          confidence: alert.confidence,
          reliability: alert.reliability,
          subtype: alert.subtype,
        });

        if (sev >= Severity.CRITICAL) racAccidentsCritical++;
        if (sev >= Severity.HIGH) racAccidentsHigh++;
      }
    }

    logger.info(
      `🔍 getGlobalKPIs: Calculado ${racAccidentsTotal} accidentes RAC en vivo (Críticos: ${racAccidentsCritical})`,
    );

    // Calcular métricas
    const totalPolygons = polygons.length;
    const criticalPolygons = polygons.filter((p) => p.state === "high").length;

    // --- CÁLCULO DE FLUIDEZ UNIFICADO (BASADO EN KILÓMETROS) ---
    // Usamos 350 km como base de la red, igual que en el frontend
    const TOTAL_NETWORK_KM = 350;
    const totalJamLengthMeters = jams.reduce(
      (sum, jam) => sum + (Number(jam.length) || 0),
      0,
    );
    const totalJamKm = totalJamLengthMeters / 1000;

    // La fluidez es el % de la red que está libre de congestión
    const fluidityPercentage = Math.round(
      Math.max(0, ((TOTAL_NETWORK_KM - totalJamKm) / TOTAL_NETWORK_KM) * 100),
    );

    const activeConstructions = alerts.filter(
      (a) => a.type === "CONSTRUCTION" || a.type === "ROAD_CLOSED",
    ).length;
    const totalJams = jams.length;

    // Estadísticas por grupo
    const groups = Array.from(
      new Set(polygons.map((p: any) => p.group || "Sin Grupo")),
    ).sort();
    const groupStats = groups.map((groupName) => {
      const groupPolygons = polygons.filter(
        (p: any) => (p.group || "Sin Grupo") === groupName,
      );
      const groupAlerts = groupPolygons.reduce(
        (sum: number, p: any) => sum + (p.metrics?.alertCount || 0),
        0,
      );
      const groupJams = groupPolygons.reduce(
        (sum: number, p: any) => sum + (p.metrics?.jamCount || 0),
        0,
      );
      const criticalInGroup = groupPolygons.filter(
        (p: any) => p.state === "high",
      ).length;

      return {
        group: groupName,
        polygonCount: groupPolygons.length,
        alertCount: groupAlerts,
        jamCount: groupJams,
        criticalCount: criticalInGroup,
        fluidCount: groupPolygons.filter((p: any) => p.state === "low").length,
      };
    });

    // Top polígonos críticos
    const topCritical = polygons
      .filter((p) => p.state === "high" || p.state === "medium")
      .sort((a, b) => {
        if (a.state !== b.state) {
          return a.state === "high" ? -1 : 1;
        }
        const aTotal = a.metrics.alertCount + a.metrics.jamCount;
        const bTotal = b.metrics.alertCount + b.metrics.jamCount;
        return bTotal - aTotal;
      })
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        name: p.name,
        group: p.group,
        state: p.state,
        alertCount: p.metrics.alertCount,
        jamCount: p.metrics.jamCount,
      }));

    // --- KPI Snapshot & Trend Logic ---
    let fluidityChange = 0;
    let incidentsChange = 0;

    try {
      const kpiRepo = repositories().kpiSnapshots;

      // 1. Calculate Trends (Compare with 2 hours ago)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const pastSnapshot = await kpiRepo.findClosestTo(twoHoursAgo);

      if (pastSnapshot) {
        // Fluidity: Difference in percentage points
        fluidityChange = fluidityPercentage - pastSnapshot.fluidity_percentage;

        // Incidents: Percentage change
        const pastIncidents = pastSnapshot.active_incidents || 0;
        const currentIncidents = alerts.length;

        if (pastIncidents > 0) {
          incidentsChange = Math.round(
            ((currentIncidents - pastIncidents) / pastIncidents) * 100,
          );
        } else if (currentIncidents > 0) {
          incidentsChange = 100; // 0 -> N is 100% (or infinite) increase
        } else {
          incidentsChange = 0; // 0 -> 0
        }
      }

      // 2. Save Current Snapshot (Rate limited: max 1 per 15 mins)
      const latestSnapshot = await kpiRepo.findLatest();
      const fifteenMinutes = 15 * 60 * 1000;
      const shouldSave =
        !latestSnapshot ||
        Date.now() - latestSnapshot.timestamp.getTime() > fifteenMinutes;

      if (shouldSave) {
        await kpiRepo.create({
          fluidity_percentage: fluidityPercentage,
          active_incidents: alerts.length,
          active_jams: jams.length, // totalJams
          timestamp: new Date(),
        });
        logger.info("📸 KPI Snapshot saved");
      }
    } catch (error) {
      logger.error(`❌ Error managing KPI snapshots: ${error}`);
    }

    logger.info(
      `🔍 getGlobalKPIs: Completado - fluidity=${fluidityPercentage}%, trend=${fluidityChange}%, alerts=${alerts.length}, jams=${jams.length}`,
    );

    return {
      fluidityPercentage,
      activeIncidents: alerts.length,
      activeJams: totalJams,
      criticalPolygons,
      activeConstructions,
      roadAccidents: racAccidentsTotal,
      roadAccidentsCritical: racAccidentsCritical,
      roadAccidentsHigh: racAccidentsHigh,
      groupStats,
      topCritical,
      trends: {
        fluidityChange,
        incidentsChange,
      },
      lastUpdate: new Date(),
    };
  }

  /**
   * Obtiene métricas de tráfico para un polígono
   */
  async getTrafficMetricsByPolygon(
    polygonId: string,
  ): Promise<PolygonTrafficMetrics | null> {
    try {
      const polygonJams =
        await repositories().wazeJams.findActiveByPolygon(polygonId);

      if (polygonJams.length === 0) {
        return {
          polygonId,
          minSpeed: null,
          maxSpeed: null,
          avgSpeed: null,
          slowPoints: 0,
          moderatePoints: 0,
          fastPoints: 0,
          stoppedPoints: 0,
          congestionIndex: 0,
          totalJams: 0,
          lastUpdate: new Date(),
        };
      }

      const speeds = polygonJams.map((jam) => jam.speedKMH || 0);
      const minSpeed = Math.min(...speeds);
      const maxSpeed = Math.max(...speeds);
      const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;

      let slowPoints = 0;
      let moderatePoints = 0;
      let fastPoints = 0;
      let stoppedPoints = 0;

      // Replicate categorization logic using speedKMH
      for (const jam of polygonJams) {
        const speed = jam.speedKMH || 0;
        if (speed > 40) fastPoints++;
        else if (speed >= 20) moderatePoints++;
        else if (speed >= 10) slowPoints++;
        else stoppedPoints++;
      }

      const freeFlowSpeed = 60;
      const congestionIndex = Math.max(
        0,
        Math.min(
          100,
          Math.round(((freeFlowSpeed - avgSpeed) / freeFlowSpeed) * 100),
        ),
      );

      return {
        polygonId,
        minSpeed: Math.round(minSpeed),
        maxSpeed: Math.round(maxSpeed),
        avgSpeed: Math.round(avgSpeed * 10) / 10,
        slowPoints,
        moderatePoints,
        fastPoints,
        stoppedPoints,
        congestionIndex,
        totalJams: polygonJams.length,
        lastUpdate: new Date(),
      };
    } catch (error) {
      logger.error(`Error en getTrafficMetricsByPolygon: ${error}`);
      return null;
    }
  }

  /**
   * Obtiene métricas de tráfico para todos los polígonos
   */
  async getAllTrafficMetrics(): Promise<PolygonTrafficMetrics[]> {
    return this.cached("traffic-metrics:all", () => this._getAllTrafficMetricsUncached());
  }

  private async _getAllTrafficMetricsUncached(): Promise<PolygonTrafficMetrics[]> {
    try {
      const jams = await repositories().wazeJams.findAllActive();
      // TODO: Group by polygon and calculate.
      // Reuse logic from getTrafficMetricsByPolygon but efficiently.

      const jamsByPolygon = new Map<string, WazeJam[]>();
      for (const jam of jams) {
        if (!jam.polygon_id) continue;
        if (!jamsByPolygon.has(jam.polygon_id)) {
          jamsByPolygon.set(jam.polygon_id, []);
        }
        jamsByPolygon.get(jam.polygon_id)!.push(jam);
      }

      const metrics: PolygonTrafficMetrics[] = [];
      const polygons = await repositories().polygons.findAll();

      for (const polygon of polygons) {
        const polygonJams = jamsByPolygon.get(polygon.id) || [];

        if (polygonJams.length === 0) {
          metrics.push({
            polygonId: polygon.id,
            minSpeed: null,
            maxSpeed: null,
            avgSpeed: null,
            slowPoints: 0,
            moderatePoints: 0,
            fastPoints: 0,
            stoppedPoints: 0,
            congestionIndex: 0,
            totalJams: 0,
            lastUpdate: new Date(),
          });
          continue;
        }

        // Logic same as above
        const speeds = polygonJams.map((jam) => jam.speedKMH || 0);
        const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
        const minSpeed = Math.min(...speeds);
        const maxSpeed = Math.max(...speeds);

        let slowPoints = 0;
        let moderatePoints = 0;
        let fastPoints = 0;
        let stoppedPoints = 0;

        for (const jam of polygonJams) {
          const speed = jam.speedKMH || 0;
          if (speed > 40) fastPoints++;
          else if (speed >= 20) moderatePoints++;
          else if (speed >= 10) slowPoints++;
          else stoppedPoints++;
        }

        const freeFlowSpeed = 60;
        const congestionIndex = Math.max(
          0,
          Math.min(
            100,
            Math.round(((freeFlowSpeed - avgSpeed) / freeFlowSpeed) * 100),
          ),
        );

        metrics.push({
          polygonId: polygon.id,
          minSpeed: Math.round(minSpeed),
          maxSpeed: Math.round(maxSpeed),
          avgSpeed: Math.round(avgSpeed * 10) / 10,
          slowPoints,
          moderatePoints,
          fastPoints,
          stoppedPoints,
          congestionIndex,
          totalJams: polygonJams.length,
          lastUpdate: new Date(),
        });
      }

      return metrics.sort((a, b) => b.congestionIndex - a.congestionIndex);
    } catch (error) {
      logger.error(`Error en getAllTrafficMetrics: ${error}`);
      return [];
    }
  }
}

export const apiService = new ApiService();
