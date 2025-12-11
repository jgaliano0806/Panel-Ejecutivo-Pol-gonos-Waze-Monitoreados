import type { Polygon, Incident, TrafficJam } from '../types';
import { PolygonState } from '../types';

export interface FluidityIndex {
  score: number;
  level: 'excellent' | 'good' | 'moderate' | 'poor';
  breakdown: {
    speedScore: number;
    delayScore: number;
    incidentScore: number;
  };
  context: {
    avgSpeed: number;
    avgDelay: number;
    criticalIncidents: number;
    greenPolygonsPercentage: number;
    totalPolygons: number;
    movingAvgSpeed: number;
    stoppedJamsCount: number;
    movingJamsCount: number;
    // Métricas separadas por fuente
    wazeMetrics: {
      count: number;
      avgSpeed: number;
      avgDelay: number;
    };
    tvtMetrics: {
      count: number;
      avgSpeed: number;
      avgDelay: number;
    };
  };
}

/**
 * Calcula un índice de fluidez sofisticado basado en múltiples factores
 * @param polygons - Lista de polígonos con sus estados
 * @param incidents - Lista de incidentes activos
 * @param jams - Lista de atascos activos
 * @returns Índice de fluidez 0-100 con breakdown
 */
export function calculateFluidityIndex(
  polygons: Polygon[],
  incidents: Incident[],
  jams: TrafficJam[]
): FluidityIndex {
  // Score por estado de polígonos (40%)
  const greenPolygons = polygons.filter(p => p.state === PolygonState.LOW).length;
  const stateScore = polygons.length > 0 ? (greenPolygons / polygons.length) * 100 : 100;

  // Score por velocidad promedio (30%) - MEJORADO
  // Filtrar jams válidos (delay >= 0)
  // Filtrar jams válidos
  const validJams = jams.filter(j => j.delay >= 0);

  // Separar por fuente
  const wazeJams = validJams.filter(j => j.source === 'waze');
  const tvtJams = validJams.filter(j => j.source === 'tvt');

  // Identificar segmentos fluidos (especialmente de TVT jamLevel 0)
  const fluidSegments = validJams.filter(j => j.level === 0 || j.speed > 40); // Asumimos >40km/h como fluido si no hay level 0

  // Separar jams con movimiento vs. detenidos (CRÍTICO para cálculos posteriores)
  const movingJams = validJams.filter(j => j.speed > 0);
  const stoppedJams = validJams.filter(j => j.speed === 0);

  // Calcular velocidad promedio solo de jams en movimiento
  const movingAvgSpeed = movingJams.length > 0
    ? movingJams.reduce((sum, j) => sum + j.speed, 0) / movingJams.length
    : 0;

  // Calcular avgSpeed global ponderado (incluye detenidos como 0)
  const avgSpeed = validJams.length > 0
    ? (validJams.reduce((sum, j) => sum + j.speed, 0)) / validJams.length
    : (fluidSegments.length > 0 ? 60 : 0);

  // Métricas Waze (generalmente solo reporta congestión)
  const wazeAvgSpeed = wazeJams.length > 0
    ? wazeJams.reduce((sum, j) => sum + j.speed, 0) / wazeJams.length
    : 0;
  const wazeAvgDelay = wazeJams.length > 0
    ? wazeJams.reduce((sum, j) => sum + j.delay, 0) / wazeJams.length
    : 0;

  // Métricas TVT (ahora incluye flujo libre)
  // Calcular velocidad ponderada por longitud si es posible, sino promedio simple
  const tvtAvgSpeed = tvtJams.length > 0
    ? tvtJams.reduce((sum, j) => sum + j.speed, 0) / tvtJams.length
    : 0;
  const tvtAvgDelay = tvtJams.length > 0
    ? tvtJams.reduce((sum, j) => sum + j.delay, 0) / tvtJams.length
    : 0;

  // Cálculo de Velocity Factor (Score de Velocidad)
  // Si tenemos segmentos fluidos explícitos, el score debería subir
  const globalAvgSpeed = validJams.length > 0
    ? validJams.reduce((sum, j) => sum + j.speed, 0) / validJams.length
    : 0; // Si no hay jams, asumimos que no hay datos (o fluido ideal, pero fluidityIndex es sobre datos reportados)

  // Calcular avgSpeed global ponderado (incluye detenidos como 0)
  // Si no hay jams de Waze pero hay segmentos fluidos de TVT, asumimos velocidad óptima (60 km/h)
  let effectiveAvgSpeed = 60;

  if (validJams.length > 0) {
    effectiveAvgSpeed = (validJams.reduce((sum, j) => sum + j.speed, 0)) / validJams.length;
  } else if (fluidSegments.length > 0) {
    effectiveAvgSpeed = 60; // Confirmación de fluidez por TVT
  }

  // Calcular score de velocidad con penalización por jams detenidos
  const stoppedPercentage = validJams.length > 0
    ? (stoppedJams.length / validJams.length) * 100
    : 0;

  // Score base en función de la velocidad promedio
  const baseSpeedScore = Math.min((effectiveAvgSpeed / 60) * 100, 100);

  // Penalización adicional por porcentaje de jams detenidos (hasta 50% adicional)
  const stoppedPenalty = stoppedPercentage / 200;

  // Calcular score final
  let speedScore = Math.max(baseSpeedScore * (1 - stoppedPenalty), 0);

  // Si tenemos confirmación explícita de fluidez (TVT reporta fluido y Waze nada), forzar score excelente
  if (wazeJams.length === 0 && fluidSegments.length > 0) {
    speedScore = 100;
  }

  // Score por demora (20%)
  const totalDelay = jams.reduce((sum, j) => sum + j.delay, 0);
  const avgDelay = jams.length > 0 ? totalDelay / jams.length : 0;
  const delayScore = Math.max(100 - (avgDelay / 600) * 100, 0); // 600s = 10min

  // Score por incidentes críticos (10%)
  const criticalIncidents = incidents.filter(i => i.severity >= 3).length;
  const incidentScore = Math.max(100 - (criticalIncidents * 5), 0);

  // Score final ponderado
  const finalScore = (
    stateScore * 0.40 +
    speedScore * 0.30 +
    delayScore * 0.20 +
    incidentScore * 0.10
  );

  return {
    score: Math.round(finalScore),
    level: finalScore >= 80 ? 'excellent' :
      finalScore >= 60 ? 'good' :
        finalScore >= 40 ? 'moderate' : 'poor',
    breakdown: {
      speedScore: Math.round(speedScore),
      delayScore: Math.round(delayScore),
      incidentScore: Math.round(incidentScore)
    },
    context: {
      avgSpeed: Math.round(avgSpeed),
      avgDelay: Math.round(avgDelay),
      criticalIncidents,
      greenPolygonsPercentage: Math.round(stateScore),
      totalPolygons: polygons.length,
      movingAvgSpeed: Math.round(movingAvgSpeed),
      stoppedJamsCount: stoppedJams.length,
      movingJamsCount: movingJams.length,
      // Métricas por fuente
      wazeMetrics: {
        count: wazeJams.length,
        avgSpeed: Math.round(wazeAvgSpeed),
        avgDelay: Math.round(wazeAvgDelay)
      },
      tvtMetrics: {
        count: tvtJams.length,
        avgSpeed: Math.round(tvtAvgSpeed),
        avgDelay: Math.round(tvtAvgDelay)
      }
    }
  };
}
