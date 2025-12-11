import type { TrafficJam } from '../types';

export interface PolygonTrafficMetrics {
  polygonId: string;
  minSpeed: number | null;
  maxSpeed: number | null;
  avgSpeed: number | null;
  slowPoints: number;
  moderatePoints: number;
  fastPoints: number;
  stoppedPoints: number;
  congestionIndex: number;
  totalJams: number;
  lastUpdate: Date;
}

/**
 * Calcula el índice de congestión basado en velocidad promedio
 * @param avgSpeed - Velocidad promedio actual
 * @param freeFlowSpeed - Velocidad en flujo libre (por defecto 60 km/h)
 * @returns Índice 0-100 donde 0 = fluido, 100 = totalmente congestionado
 */
export function calculateCongestionIndex(avgSpeed: number, freeFlowSpeed: number = 60): number {
  const index = ((freeFlowSpeed - avgSpeed) / freeFlowSpeed) * 100;
  return Math.max(0, Math.min(100, Math.round(index)));
}

/**
 * Categoriza una velocidad en categorías descriptivas
 * @param speed - Velocidad en km/h
 * @returns Categoría de velocidad
 */
export function getSpeedCategory(speed: number): 'fast' | 'moderate' | 'slow' | 'stopped' {
  if (speed > 40) return 'fast';
  if (speed >= 20) return 'moderate';
  if (speed >= 10) return 'slow';
  return 'stopped';
}

/**
 * Calcula métricas de tráfico completas para un polígono
 * @param polygonId - ID del polígono
 * @param jams - Array de todos los atascos
 * @returns Métricas de tráfico del polígono
 */
export function calculatePolygonTrafficMetrics(
  polygonId: string,
  jams: TrafficJam[]
): PolygonTrafficMetrics {
  // Filtrar jams del polígono
  const polygonJams = jams.filter(jam => jam.polygonId === polygonId);
  
  // Sin datos
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
      lastUpdate: new Date()
    };
  }
  
  // Calcular velocidades
  const speeds = polygonJams.map(jam => jam.speed);
  const minSpeed = Math.min(...speeds);
  const maxSpeed = Math.max(...speeds);
  const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
  
  // Contar por categorías
  let slowPoints = 0;
  let moderatePoints = 0;
  let fastPoints = 0;
  let stoppedPoints = 0;
  
  for (const jam of polygonJams) {
    const category = getSpeedCategory(jam.speed);
    switch (category) {
      case 'fast':
        fastPoints++;
        break;
      case 'moderate':
        moderatePoints++;
        break;
      case 'slow':
        slowPoints++;
        break;
      case 'stopped':
        stoppedPoints++;
        break;
    }
  }
  
  // Calcular índice de congestión
  const congestionIndex = calculateCongestionIndex(avgSpeed);
  
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
    lastUpdate: new Date()
  };
}

