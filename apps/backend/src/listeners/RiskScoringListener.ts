import { eventBus, SystemEvents } from "../events";
import { logger } from "../utils/logger";
import { dbService } from "../database/dbService";
import { riskScoringService } from "../services/riskScoringService";

export class RiskScoringListener {
  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    eventBus.on(
      SystemEvents.WAZE_POLL_COMPLETE,
      this.handleWazePollComplete.bind(this),
    );
    logger.info("🎧 RiskScoringListener listening for WAZE_POLL_COMPLETE");
  }

  private async handleWazePollComplete(data: any) {
    const { polygonId, alerts, jams, timestamp } = data;

    try {
      // 1. Calcular métricas para el snapshot
      const totalJams = jams?.length || 0;
      const totalIncidents = alerts?.length || 0;

      // Calcular promedios
      let avgSpeed = 0;
      let avgDelay = 0;
      let criticalKm = 0;

      if (totalJams > 0) {
        const speeds = jams
          .map((j: any) => j.speedKMH || 0)
          .filter((s: number) => s > 0);
        if (speeds.length > 0) {
          avgSpeed =
            speeds.reduce((a: number, b: number) => a + b, 0) / speeds.length;
        }

        const delays = jams.map((j: any) => j.delay || 0);
        avgDelay =
          delays.reduce((a: number, b: number) => a + b, 0) / totalJams;

        // Critical KM (Level >= 4)
        const criticalJams = jams.filter((j: any) => j.level >= 4);
        const criticalLengthMeters = criticalJams.reduce(
          (sum: number, j: any) => sum + (j.length || 0),
          0,
        );
        criticalKm = criticalLengthMeters / 1000;
      }

      const criticalPolygons = criticalKm > 1 ? 1 : 0;
      const currentTime = timestamp || new Date();

      // 2. Insertar Snapshot en tiempo real (sin affected_polygons, eliminada en migración 023)
      await dbService.query(
        `INSERT INTO polygon_snapshots
        (polygon_id, timestamp, total_jams, total_incidents, avg_speed, avg_delay, critical_km, critical_polygons)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          polygonId,
          currentTime,
          totalJams,
          totalIncidents,
          avgSpeed,
          avgDelay,
          criticalKm,
          criticalPolygons,
        ],
      );

      // 3. Disparar recálculo de Risk Score
      await riskScoringService.calculatePolygonRiskScore(polygonId);

      // 4. Refrescar vista materializada para que el frontend vea los cambios
      try {
        await dbService.query("SELECT refresh_risk_scores_view()");
      } catch (viewError) {
        // La vista puede no existir, en ese caso ignorar
        logger.debug(`Vista no refrescada (puede no existir): ${viewError}`);
      }

      logger.info(`✅ Risk Score recalculado para ${polygonId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        `❌ Error en RiskScoringListener para ${polygonId}: ${errorMsg}`,
      );
    }
  }
}

export const riskScoringListener = new RiskScoringListener();
