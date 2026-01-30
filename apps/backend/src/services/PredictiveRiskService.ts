import { dbService } from "../database/dbService";
import { logger } from "../utils/logger";
import { REAL_POLYGONS } from "../config/realPolygons";

export interface PredictionResult {
  polygon_id: string;
  predicted_risk_score: number;
  confidence: number;
  based_on_similarity: boolean;
  similar_historical_timestamp?: Date;
  factors: {
    time_factor: number;
    historical_avg: number;
    current_trend: number;
  };
}

class PredictiveRiskService {
  /**
   * Predice el riesgo de un polígono basado en patrones históricos (Regresión / Similitud)
   * Siguiendo principios de "Predictive Intelligence" (Similarity & Regression)
   */
  async predictPolygonRisk(polygonId: string): Promise<PredictionResult> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();

    try {
      // 0. Obtener clima actual para comparar
      const latestSnapshotQuery = `
        SELECT weather_score FROM polygon_criticality_scores
        WHERE polygon_id = $1 ORDER BY calculated_at DESC LIMIT 1
      `;
      const latestResult = await dbService.query(latestSnapshotQuery, [
        polygonId,
      ]);
      const currentWeatherScore = parseFloat(
        latestResult.rows[0]?.weather_score || "0",
      );

      // 1. SIMILARITY: Buscar snapshots históricos del mismo día de la semana, hora Y clima similar
      // Esto actúa como un modelo de "K-Nearest Neighbors" enriquecido
      const historicalQuery = `
        SELECT
          AVG(final_risk_score) as avg_score,
          COUNT(*) as sample_size
        FROM polygon_criticality_scores
        WHERE polygon_id = $1
          AND EXTRACT(DOW FROM updated_at) = $2
          AND EXTRACT(HOUR FROM updated_at) = $3
          AND EXTRACT(MINUTE FROM updated_at) BETWEEN $4 AND $5
          AND ABS(weather_score - $6) <= 20 -- Clima similar (+/- 20 puntos)
      `;

      const minStart = Math.max(0, minute - 15);
      const minEnd = Math.min(59, minute + 15);

      const histResult = await dbService.query(historicalQuery, [
        polygonId,
        dayOfWeek,
        hour,
        minStart,
        minEnd,
        currentWeatherScore,
      ]);

      const historicalAvg = parseFloat(histResult.rows[0]?.avg_score || "0");
      const sampleSize = parseInt(histResult.rows[0]?.sample_size || "0");

      // 2. REGRESSION / TREND: Comparar con el snapshot actual y el de hace 15 mins
      const trendQuery = `
        SELECT final_risk_score, updated_at
        FROM polygon_criticality_scores
        WHERE polygon_id = $1
        ORDER BY updated_at DESC
        LIMIT 2
      `;
      const trendResult = await dbService.query(trendQuery, [polygonId]);

      const latestScore = parseFloat(
        trendResult.rows[0]?.final_risk_score || "0",
      );
      const previousScore = parseFloat(
        trendResult.rows[1]?.final_risk_score || latestScore,
      );

      const currentTrend = latestScore - previousScore;

      // 3. FÓRMULA PREDICTIVA (Ensemble)
      // Predicción = (Peso_Histórico * Promedio_Hist) + (Peso_Tendencia * (Actual + Delta))
      const weightHist = sampleSize > 10 ? 0.4 : 0.2;
      const weightTrend = 1 - weightHist;

      const predictedScore =
        historicalAvg * weightHist + (latestScore + currentTrend) * weightTrend;

      // Ajustar confianza basada en el tamaño de la muestra histórico
      const confidence = Math.min(30 + sampleSize * 2, 90);

      return {
        polygon_id: polygonId,
        predicted_risk_score: Math.min(
          Math.max(0, Math.round(predictedScore)),
          100,
        ),
        confidence,
        based_on_similarity: sampleSize > 5,
        factors: {
          time_factor: hour,
          historical_avg: Math.round(historicalAvg),
          current_trend: currentTrend,
        },
      };
    } catch (error) {
      logger.error(`Error in PredictiveRiskService for ${polygonId}: ${error}`);
      return {
        polygon_id: polygonId,
        predicted_risk_score: 0,
        confidence: 0,
        based_on_similarity: false,
        factors: { time_factor: hour, historical_avg: 0, current_trend: 0 },
      };
    }
  }

  /**
   * Predice riesgo para todos los polígonos
   */
  async predictAllPolygons(): Promise<PredictionResult[]> {
    const predictions: PredictionResult[] = [];
    for (const polygon of REAL_POLYGONS) {
      predictions.push(await this.predictPolygonRisk(polygon.id));
    }
    return predictions;
  }
}

export const predictiveRiskService = new PredictiveRiskService();
