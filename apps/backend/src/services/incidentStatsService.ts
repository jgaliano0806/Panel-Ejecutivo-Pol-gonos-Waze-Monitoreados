import { InternalAlert, InternalJam } from "../types";

/**
 * Servicio de Estadísticas de Incidentes
 *
 * Analiza y clasifica incidentes de Waze por tipo y subtipo
 * para proporcionar información detallada en el dashboard.
 */

export interface IncidentTypeBreakdown {
  type: string;
  typeLabel: string;
  count: number;
  percentage: number;
  severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  subtypes: SubtypeBreakdown[];
}

export interface SubtypeBreakdown {
  subtype: string;
  subtypeLabel: string;
  count: number;
  percentage: number;
  avgConfidence?: number;
  avgReliability?: number;
}

export interface PolygonIncidentStats {
  polygonId: string;
  polygonName: string;
  totalIncidents: number;
  totalJams: number;
  typeBreakdown: IncidentTypeBreakdown[];
  jamLevels: {
    level0: number; // Flujo libre
    level1: number; // Ligero
    level2: number; // Moderado
    level3: number; // Alto
    level4: number; // Severo
    level5: number; // Detenido
  };
  topIncidents: {
    type: string;
    subtype?: string;
    street?: string;
    confidence?: number;
    reliability?: number;
    severity: number;
  }[];
  lastUpdate: Date;
}

export class IncidentStatsService {
  /**
   * Obtiene estadísticas detalladas de incidentes para un polígono
   */
  getPolygonStats(
    polygonId: string,
    polygonName: string,
    alerts: InternalAlert[],
    jams: InternalJam[]
  ): PolygonIncidentStats {
    // Filtrar incidentes del polígono
    const polygonAlerts = alerts.filter((a) => a.polygonId === polygonId);
    const polygonJams = jams.filter((j) => j.polygonId === polygonId);

    // Agrupar alerts por tipo
    const typeMap = new Map<string, InternalAlert[]>();
    for (const alert of polygonAlerts) {
      const type = alert.type;
      if (!typeMap.has(type)) {
        typeMap.set(type, []);
      }
      typeMap.get(type)!.push(alert);
    }

    // Calcular breakdown por tipo
    const typeBreakdown: IncidentTypeBreakdown[] = [];
    const totalAlerts = polygonAlerts.length;

    for (const [type, alerts] of typeMap.entries()) {
      // Agrupar por subtipo
      const subtypeMap = new Map<string, InternalAlert[]>();
      for (const alert of alerts) {
        const subtype = alert.subtype || "NO_SUBTYPE";
        if (!subtypeMap.has(subtype)) {
          subtypeMap.set(subtype, []);
        }
        subtypeMap.get(subtype)!.push(alert);
      }

      // Calcular subtipos
      const subtypes: SubtypeBreakdown[] = [];
      for (const [subtype, subtypeAlerts] of subtypeMap.entries()) {
        const avgConfidence =
          subtypeAlerts
            .filter((a) => a.confidence !== undefined)
            .reduce((sum, a) => sum + (a.confidence || 0), 0) /
          subtypeAlerts.length;

        const avgReliability =
          subtypeAlerts
            .filter((a) => a.reliability !== undefined)
            .reduce((sum, a) => sum + (a.reliability || 0), 0) /
          subtypeAlerts.length;

        subtypes.push({
          subtype,
          subtypeLabel: this.getSubtypeLabel(type, subtype),
          count: subtypeAlerts.length,
          percentage:
            totalAlerts > 0
              ? Math.round((subtypeAlerts.length / totalAlerts) * 100)
              : 0,
          avgConfidence: isNaN(avgConfidence)
            ? undefined
            : Math.round(avgConfidence * 10) / 10,
          avgReliability: isNaN(avgReliability)
            ? undefined
            : Math.round(avgReliability * 10) / 10,
        });
      }

      // Ordenar subtipos por cantidad
      subtypes.sort((a, b) => b.count - a.count);

      // Calcular distribución de severidad
      const severity = {
        critical: alerts.filter((a) => a.severity === 4).length,
        high: alerts.filter((a) => a.severity === 3).length,
        medium: alerts.filter((a) => a.severity === 2).length,
        low: alerts.filter((a) => a.severity === 1).length,
      };

      typeBreakdown.push({
        type,
        typeLabel: this.getTypeLabel(type),
        count: alerts.length,
        percentage:
          totalAlerts > 0 ? Math.round((alerts.length / totalAlerts) * 100) : 0,
        severity,
        subtypes,
      });
    }

    // Ordenar por cantidad
    typeBreakdown.sort((a, b) => b.count - a.count);

    // Calcular distribución de jam levels
    const jamLevels = {
      level0: polygonJams.filter((j) => j.level === 0).length,
      level1: polygonJams.filter((j) => j.level === 1).length,
      level2: polygonJams.filter((j) => j.level === 2).length,
      level3: polygonJams.filter((j) => j.level === 3).length,
      level4: polygonJams.filter((j) => j.level === 4).length,
      level5: polygonJams.filter((j) => j.level === 5).length,
    };

    // Top incidentes (más críticos)
    const topIncidents = polygonAlerts
      .sort((a, b) => {
        // Ordenar por severidad, luego por confidence
        if (a.severity !== b.severity) {
          return b.severity - a.severity;
        }
        return (b.confidence || 0) - (a.confidence || 0);
      })
      .slice(0, 5)
      .map((a) => ({
        type: a.type,
        subtype: a.subtype,
        street: a.street,
        confidence: a.confidence,
        reliability: a.reliability,
        severity: a.severity,
      }));

    return {
      polygonId,
      polygonName,
      totalIncidents: totalAlerts,
      totalJams: polygonJams.length,
      typeBreakdown,
      jamLevels,
      topIncidents,
      lastUpdate: new Date(),
    };
  }

  /**
   * Obtiene estadísticas agregadas de todos los polígonos
   */
  getGlobalStats(
    alerts: InternalAlert[],
    jams: InternalJam[]
  ): {
    totalIncidents: number;
    totalJams: number;
    typeBreakdown: IncidentTypeBreakdown[];
    jamLevelsGlobal: any;
    criticalIncidents: number;
    highQualityIncidents: number;
  } {
    const typeMap = new Map<string, InternalAlert[]>();

    for (const alert of alerts) {
      const type = alert.type;
      if (!typeMap.has(type)) {
        typeMap.set(type, []);
      }
      typeMap.get(type)!.push(alert);
    }

    const typeBreakdown: IncidentTypeBreakdown[] = [];
    const totalAlerts = alerts.length;

    for (const [type, typeAlerts] of typeMap.entries()) {
      const subtypeMap = new Map<string, InternalAlert[]>();

      for (const alert of typeAlerts) {
        const subtype = alert.subtype || "NO_SUBTYPE";
        if (!subtypeMap.has(subtype)) {
          subtypeMap.set(subtype, []);
        }
        subtypeMap.get(subtype)!.push(alert);
      }

      const subtypes: SubtypeBreakdown[] = [];
      for (const [subtype, subtypeAlerts] of subtypeMap.entries()) {
        const avgConfidence =
          subtypeAlerts
            .filter((a) => a.confidence !== undefined)
            .reduce((sum, a) => sum + (a.confidence || 0), 0) /
          subtypeAlerts.length;

        const avgReliability =
          subtypeAlerts
            .filter((a) => a.reliability !== undefined)
            .reduce((sum, a) => sum + (a.reliability || 0), 0) /
          subtypeAlerts.length;

        subtypes.push({
          subtype,
          subtypeLabel: this.getSubtypeLabel(type, subtype),
          count: subtypeAlerts.length,
          percentage:
            totalAlerts > 0
              ? Math.round((subtypeAlerts.length / totalAlerts) * 100)
              : 0,
          avgConfidence: isNaN(avgConfidence)
            ? undefined
            : Math.round(avgConfidence * 10) / 10,
          avgReliability: isNaN(avgReliability)
            ? undefined
            : Math.round(avgReliability * 10) / 10,
        });
      }

      subtypes.sort((a, b) => b.count - a.count);

      const severity = {
        critical: typeAlerts.filter((a) => a.severity === 4).length,
        high: typeAlerts.filter((a) => a.severity === 3).length,
        medium: typeAlerts.filter((a) => a.severity === 2).length,
        low: typeAlerts.filter((a) => a.severity === 1).length,
      };

      typeBreakdown.push({
        type,
        typeLabel: this.getTypeLabel(type),
        count: typeAlerts.length,
        percentage:
          totalAlerts > 0
            ? Math.round((typeAlerts.length / totalAlerts) * 100)
            : 0,
        severity,
        subtypes,
      });
    }

    typeBreakdown.sort((a, b) => b.count - a.count);

    const jamLevelsGlobal = {
      level0: jams.filter((j) => j.level === 0).length,
      level1: jams.filter((j) => j.level === 1).length,
      level2: jams.filter((j) => j.level === 2).length,
      level3: jams.filter((j) => j.level === 3).length,
      level4: jams.filter((j) => j.level === 4).length,
      level5: jams.filter((j) => j.level === 5).length,
    };

    const criticalIncidents = alerts.filter((a) => a.severity >= 3).length;
    const highQualityIncidents = alerts.filter(
      (a) => (a.confidence || 0) >= 7 && (a.reliability || 0) >= 7
    ).length;

    return {
      totalIncidents: alerts.length,
      totalJams: jams.length,
      typeBreakdown,
      jamLevelsGlobal,
      criticalIncidents,
      highQualityIncidents,
    };
  }

  /**
   * Traduce el tipo de incidente
   */
  private getTypeLabel(type: string): string {
    const { getWazeTypeLabel } = require("../utils/wazeTranslations");
    return getWazeTypeLabel(type);
  }

  /**
   * Traduce el subtipo de incidente
   */
  private getSubtypeLabel(type: string, subtype: string): string {
    const { getWazeSubtypeLabel } = require("../utils/wazeTranslations");
    return getWazeSubtypeLabel(subtype);
  }

  /**
   * Obtiene emoji según tipo de incidente
   */
  getIncidentEmoji(type: string, subtype?: string): string {
    const { getWazeIcon } = require("../utils/wazeTranslations");
    return getWazeIcon(type);
  }
}

export const incidentStatsService = new IncidentStatsService();
