import { RiskFactorStrategy, RiskAnalysisData } from "./RiskFactorStrategy";
import { predictiveRiskService } from "../services/PredictiveRiskService";

/**
 * Estrategia de Riesgo Predictivo
 * Integra el análisis de patrones históricos y tendencias actuales
 * siguiendo los principios de "Predictive Intelligence"
 */
export class PredictiveStrategy implements RiskFactorStrategy {
  name = "predictive";
  weight = 0.15; // Peso moderado para balancear con datos de tiempo real (Jams, Incidents)

  async calculate(data: RiskAnalysisData): Promise<number> {
    try {
      const prediction = await predictiveRiskService.predictPolygonRisk(
        data.polygonId,
      );

      // Si la confianza es baja (< 30%), no influir tanto en el score final
      if (prediction.confidence < 30) {
        return 0;
      }

      return prediction.predicted_risk_score;
    } catch (error) {
      // Silently fail to 0 to not affect main calculation
      return 0;
    }
  }
}
