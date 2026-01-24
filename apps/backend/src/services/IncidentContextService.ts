import { dbService } from "../database/dbService";
import { logger } from "../utils/logger";

interface IncidentContext {
  probableCause: string;
  confidence: number; // 0-100
  supportingFactors: string[];
}

class IncidentContextService {
  constructor() {
    logger.info("IncidentContextService initialized");
  }

  /**
   * Enriquece un incidente con contexto inferido si su descripción es insuficiente
   * @param incident Incidente a analizar
   * @param nearbyJams Jams cercanos al incidente
   * @param weatherData Datos del clima actual en el polígono
   */
  async inferContext(
    incident: any,
    nearbyJams: any[],
    weatherData: any,
  ): Promise<IncidentContext | null> {
    try {
      // Solo inferir si falta información clave
      const needsInference =
        !incident.subtype ||
        incident.subtype === "NO_SUBTYPE" ||
        incident.subtype === "UNKNOWN" ||
        incident.description === "UNKNOWN";

      if (!needsInference) return null;

      const factors: string[] = [];
      let probableCause = "Causa indeterminada";
      let confidence = 0;

      // 1. Análisis de Congestión (Jams)
      const criticalJam = nearbyJams.find((j) => j.level >= 4);
      if (criticalJam) {
        factors.push(`Congestión crítica cercana (Nivel ${criticalJam.level})`);

        if (criticalJam.level === 5) {
          probableCause = "Bloqueo por congestión total";
          confidence += 60;
        } else {
          probableCause = "Demoras por alto tráfico";
          confidence += 40;
        }
      }

      // 2. Análisis Climático
      // TODO: Integrar weatherData cuando esté disponible en el pipeline

      // 3. Análisis de Tipo de Vía
      // Si es una salida/acceso (Rampa) y hay corte
      if (
        incident.type === "ROAD_CLOSED" &&
        incident.street?.toLowerCase().includes("salida")
      ) {
        factors.push("Incidente en rampa de acceso/salida");
        if (probableCause === "Causa indeterminada") {
          probableCause = "Cierre operativo de acceso";
          confidence += 30;
        }
      }

      // Si la confianza es muy baja, no retornar inferencia
      if (confidence < 20) return null;

      return {
        probableCause,
        confidence,
        supportingFactors: factors,
      };
    } catch (error) {
      logger.error("Error inferring incident context", {
        error,
        incidentId: incident.id,
      });
      return null;
    }
  }
}

export const incidentContextService = new IncidentContextService();
