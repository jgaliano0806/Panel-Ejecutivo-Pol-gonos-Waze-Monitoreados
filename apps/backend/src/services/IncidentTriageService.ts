import { dbService } from "../database/dbService";
import { logger } from "../utils/logger";

interface IncidentClassification {
  type: string;
  subtype: string;
  relevance_score: number; // 0-100 (Probabilidad de ser relevante)
  sample_size: number;
}

/**
 * Servicio de "Smart Triage" (Clasificación)
 * Analiza el historial de incidentes para determinar cuáles son "Ruido" y cuales son "Accionables".
 * Utiliza lógica heurística tipo "Random Forest" simplificado.
 */
class IncidentTriageService {
  /**
   * Entrena/Calcula las probabilidades de relevancia basado en histórico
   * Se considera "Relevante" si el incidente tuvo jams asociados o duración > 30 min.
   */
  async trainClassificationModel(): Promise<void> {
    try {
      logger.info(
        "🧠 Iniciando entrenamiento de clasificación de incidentes...",
      );

      // 1. Calcular correlación Incidente -> Jam/Duración
      // Esta query actúa como el "Training" del modelo
      const trainingQuery = `
        SELECT
          type,
          subtype,
          COUNT(*) as total_cases,
          AVG(CASE
            WHEN duration_minutes > 30 OR blocking_jams > 0 THEN 1
            ELSE 0
          END) as relevance_probability
        FROM incidents_history
        GROUP BY type, subtype
        HAVING COUNT(*) > 5
      `;

      const result = await dbService.query(trainingQuery);

      // En una implementación real, guardaríamos estos pesos en una tabla 'incident_weights'
      // Por ahora, lo guardamos en memoria o logueamos para demostración
      const classifications: IncidentClassification[] = result.rows.map(
        (row) => ({
          type: row.type,
          subtype: row.subtype,
          relevance_score: Math.round(
            parseFloat(row.relevance_probability) * 100,
          ),
          sample_size: parseInt(row.total_cases),
        }),
      );

      logger.info(
        `🧠 Modelo entrenado con ${classifications.length} patrones de incidentes.`,
      );

      // TODO: Persistir estos scores para uso en tiempo real
      // await this.saveModel(classifications);
    } catch (error) {
      logger.error(`Error training incident triage model: ${error}`);
    }
  }

  /**
   * Clasifica un incidente entrante en tiempo real
   */
  classifyIncident(
    type: string,
    subtype: string,
    reliability: number,
  ): { isActionable: boolean; confidence: number } {
    // Lógica heurística basada en conocimiento general de Waze + Reliability
    // (En futuro, usar los pesos calculados por trainClassificationModel)

    let baseScore = 50;

    // Reglas de Negocio (Decision Tree Nodes)
    if (type === "ACCIDENT") {
      if (subtype === "ACCIDENT_MAJOR") baseScore = 95;
      else if (subtype === "ACCIDENT_MINOR") baseScore = 40;
      else baseScore = 70;
    } else if (type === "JAM") {
      // Jams son siempre relevantes si son heavy
      baseScore = 80;
    } else if (type === "HAZARD") {
      if (subtype?.includes("WEATHER")) baseScore = 60;
      else if (subtype?.includes("CONSTRUCTION"))
        baseScore = 30; // Obras suelen ser ruido
      else if (subtype?.includes("CAR_STOPPED")) baseScore = 20; // Autos parados suelen ser ruido
    }

    // Ajuste por fiabilidad del reporte (User Rep)
    // reliability 0-10
    const reliabilityFactor = (reliability || 5) / 10; // 0.0 - 1.0

    // Score final
    const finalScore = baseScore * (0.5 + 0.5 * reliabilityFactor);

    return {
      isActionable: finalScore > 50,
      confidence: Math.round(finalScore),
    };
  }
}

export const incidentTriageService = new IncidentTriageService();
