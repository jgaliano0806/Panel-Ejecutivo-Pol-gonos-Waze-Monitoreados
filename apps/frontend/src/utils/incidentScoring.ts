import type { Incident } from '../types';

export interface TrustScore {
  score: number;
  level: 'high' | 'medium' | 'low';
  stars: number;
}

/**
 * Calcula un score de confiabilidad para un incidente basado en múltiples factores
 * @param incident - Incidente de Waze
 * @returns Score de confiabilidad con nivel y estrellas
 */
export function calculateTrustScore(incident: Incident): TrustScore {
  const rating = incident.reportRating || 0;
  const confidence = incident.confidence || 0;
  const reliability = incident.reliability || 0;
  const thumbsUp = Math.min((incident.nThumbsUp || 0) * 2, 10);
  
  // Fórmula ponderada
  const score = (
    rating * 0.3 +        // 30% peso
    confidence * 0.25 +   // 25% peso
    reliability * 0.25 +  // 25% peso
    thumbsUp * 0.2        // 20% peso
  );
  
  const rounded = Math.round(score * 10) / 10;
  
  return {
    score: rounded,
    level: rounded >= 7 ? 'high' : rounded >= 4 ? 'medium' : 'low',
    stars: Math.round(rounded / 2) // Convierte 0-10 a 0-5 estrellas
  };
}

