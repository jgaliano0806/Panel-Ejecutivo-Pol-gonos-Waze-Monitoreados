/**
 * Servicio de Cálculo Mejorado de Demoras
 *
 * Implementa tres estrategias de cálculo de demora para incidentes:
 * 1. Proximidad geográfica: Encuentra jams cercanos al incidente
 * 2. Estimación por desvío: Calcula demora basada en longitud del desvío obligatorio
 * 3. Comparación histórica: Compara flujo actual vs histórico en la zona
 */

import { InternalJam, InternalAlert, HistoricalSnapshot } from '../types';

// Constantes de configuración
const CONFIG = {
    // Radio de búsqueda en metros para jams cercanos
    PROXIMITY_RADIUS_METERS: 500,
    // Radio extendido para calcular impacto en zona
    EXTENDED_RADIUS_METERS: 2000,
    // Velocidad promedio para desvíos (km/h)
    DETOUR_AVG_SPEED_KMH: 30,
    // Factor de multiplicación para longitud de desvío (típicamente 1.5x a 3x)
    DETOUR_LENGTH_FACTOR: 2.0,
    // Velocidad normal esperada en la zona (km/h)
    NORMAL_SPEED_KMH: 60,
    // Umbral de reducción de velocidad para considerar impacto (%)
    SPEED_REDUCTION_THRESHOLD: 30,
};

export interface DelayCalculationResult {
    // Demora total estimada en segundos
    totalDelaySeconds: number;
    // Demora en minutos (redondeado)
    totalDelayMinutes: number;
    // Desglose por método de cálculo
    breakdown: {
        // Demora por jams directamente vinculados (blockingAlertUuid)
        linkedJamsDelay: number;
        // Demora por jams cercanos geográficamente
        proximityDelay: number;
        // Demora estimada por desvío obligatorio
        detourDelay: number;
        // Demora adicional por comparación histórica
        historicalDelta: number;
    };
    // Confianza del cálculo (0-100)
    confidence: number;
    // Jams considerados en el cálculo
    consideredJams: {
        linked: number;
        nearby: number;
    };
    // Método predominante usado
    primaryMethod: 'linked' | 'proximity' | 'detour' | 'historical';
    // Detalles adicionales
    details: string;
}

export interface HistoricalComparison {
    currentAvgSpeed: number;
    historicalAvgSpeed: number;
    speedReduction: number; // Porcentaje
    estimatedAdditionalDelay: number; // Segundos
}

class DelayCalculationService {
    /**
     * Calcula la demora total de un incidente usando múltiples métodos
     */
    calculateIncidentDelay(
        incident: InternalAlert,
        allJams: InternalJam[],
        historicalData?: HistoricalSnapshot[]
    ): DelayCalculationResult {
        const breakdown = {
            linkedJamsDelay: 0,
            proximityDelay: 0,
            detourDelay: 0,
            historicalDelta: 0,
        };

        // 1. Calcular demora de jams directamente vinculados
        const linkedJams = this.findLinkedJams(incident, allJams);
        breakdown.linkedJamsDelay = this.sumJamsDelay(linkedJams);

        // 2. Calcular demora por proximidad geográfica
        const nearbyJams = this.findNearbyJams(incident, allJams, linkedJams);
        breakdown.proximityDelay = this.sumJamsDelay(nearbyJams);

        // 3. Estimar demora por desvío (solo para cortes de ruta)
        if (this.isBlockingIncident(incident)) {
            breakdown.detourDelay = this.estimateDetourDelay(incident);
        }

        // 4. Comparación con datos históricos
        if (historicalData && historicalData.length > 0) {
            const historicalComparison = this.compareWithHistorical(
                incident,
                allJams,
                historicalData
            );
            breakdown.historicalDelta = historicalComparison.estimatedAdditionalDelay;
        }

        // Calcular demora total (evitar doble conteo)
        const totalDelaySeconds = this.calculateTotalDelay(breakdown);
        const totalDelayMinutes = Math.round(totalDelaySeconds / 60);

        // Determinar confianza y método predominante
        const { confidence, primaryMethod } = this.determineConfidenceAndMethod(
            breakdown,
            linkedJams.length,
            nearbyJams.length
        );

        // Generar detalles
        const details = this.generateDetails(breakdown, linkedJams.length, nearbyJams.length, incident);

        return {
            totalDelaySeconds,
            totalDelayMinutes,
            breakdown,
            confidence,
            consideredJams: {
                linked: linkedJams.length,
                nearby: nearbyJams.length,
            },
            primaryMethod,
            details,
        };
    }

    /**
     * Encuentra jams directamente vinculados por blockingAlertUuid
     */
    private findLinkedJams(incident: InternalAlert, allJams: InternalJam[]): InternalJam[] {
        return allJams.filter(jam => jam.blockingAlertUuid === incident.id);
    }

    /**
     * Encuentra jams cercanos geográficamente al incidente
     * Excluye los ya vinculados para evitar doble conteo
     */
    private findNearbyJams(
        incident: InternalAlert,
        allJams: InternalJam[],
        excludeJams: InternalJam[]
    ): InternalJam[] {
        const excludeIds = new Set(excludeJams.map(j => j.id));

        return allJams.filter(jam => {
            // Excluir jams ya vinculados
            if (excludeIds.has(jam.id)) return false;

            // Calcular distancia
            const distance = this.calculateDistance(
                incident.location.lat,
                incident.location.lng,
                jam.location.lat,
                jam.location.lng
            );

            return distance <= CONFIG.PROXIMITY_RADIUS_METERS;
        });
    }

    /**
     * Suma la demora de una lista de jams
     */
    private sumJamsDelay(jams: InternalJam[]): number {
        return jams.reduce((sum, jam) => sum + (jam.delay || 0), 0);
    }

    /**
     * Determina si el incidente es bloqueante (corte de ruta)
     */
    private isBlockingIncident(incident: InternalAlert): boolean {
        const blockingTypes = ['ROAD_CLOSED', 'road_closed', 'roadclosed'];
        return blockingTypes.includes(incident.type.toLowerCase()) ||
               (incident.subtype && blockingTypes.some(t =>
                   incident.subtype!.toLowerCase().includes(t)
               ));
    }

    /**
     * Estima la demora causada por un desvío obligatorio
     * Basado en la longitud típica de desvíos y velocidad promedio
     */
    private estimateDetourDelay(incident: InternalAlert): number {
        // Estimar longitud del tramo afectado (promedio 2km para un corte)
        const affectedLengthKm = 2;

        // Calcular longitud del desvío (factor de multiplicación)
        const detourLengthKm = affectedLengthKm * CONFIG.DETOUR_LENGTH_FACTOR;

        // Tiempo normal para el tramo afectado (en segundos)
        const normalTimeSeconds = (affectedLengthKm / CONFIG.NORMAL_SPEED_KMH) * 3600;

        // Tiempo estimado para el desvío (en segundos)
        const detourTimeSeconds = (detourLengthKm / CONFIG.DETOUR_AVG_SPEED_KMH) * 3600;

        // La demora adicional es la diferencia
        return Math.max(0, detourTimeSeconds - normalTimeSeconds);
    }

    /**
     * Compara el flujo actual con datos históricos
     */
    private compareWithHistorical(
        incident: InternalAlert,
        currentJams: InternalJam[],
        historicalData: HistoricalSnapshot[]
    ): HistoricalComparison {
        // Obtener jams en la zona del incidente
        const zoneJams = currentJams.filter(jam => {
            const distance = this.calculateDistance(
                incident.location.lat,
                incident.location.lng,
                jam.location.lat,
                jam.location.lng
            );
            return distance <= CONFIG.EXTENDED_RADIUS_METERS;
        });

        // Calcular velocidad promedio actual
        const currentAvgSpeed = zoneJams.length > 0
            ? zoneJams.reduce((sum, j) => sum + j.speed, 0) / zoneJams.length
            : CONFIG.NORMAL_SPEED_KMH;

        // Obtener velocidad histórica promedio (últimas 24h del mismo período)
        const historicalAvgSpeed = this.getHistoricalAvgSpeed(historicalData);

        // Calcular reducción de velocidad
        const speedReduction = historicalAvgSpeed > 0
            ? ((historicalAvgSpeed - currentAvgSpeed) / historicalAvgSpeed) * 100
            : 0;

        // Estimar demora adicional si hay reducción significativa
        let estimatedAdditionalDelay = 0;
        if (speedReduction > CONFIG.SPEED_REDUCTION_THRESHOLD) {
            // Tiempo adicional por km basado en la reducción de velocidad
            const extraTimePerKm = currentAvgSpeed > 0
                ? (1 / currentAvgSpeed - 1 / historicalAvgSpeed) * 3600
                : 0;

            // Aplicar a longitud promedio de zona (2km)
            estimatedAdditionalDelay = Math.max(0, extraTimePerKm * 2);
        }

        return {
            currentAvgSpeed,
            historicalAvgSpeed,
            speedReduction: Math.max(0, speedReduction),
            estimatedAdditionalDelay,
        };
    }

    /**
     * Obtiene la velocidad promedio histórica
     */
    private getHistoricalAvgSpeed(historicalData: HistoricalSnapshot[]): number {
        if (historicalData.length === 0) return CONFIG.NORMAL_SPEED_KMH;

        const avgSpeeds = historicalData
            .filter(h => h.avgSpeed !== null && h.avgSpeed !== undefined)
            .map(h => h.avgSpeed as number);

        if (avgSpeeds.length === 0) return CONFIG.NORMAL_SPEED_KMH;

        return avgSpeeds.reduce((sum, speed) => sum + speed, 0) / avgSpeeds.length;
    }

    /**
     * Calcula la distancia entre dos puntos geográficos (Haversine)
     */
    private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371000; // Radio de la Tierra en metros
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    /**
     * Calcula el total de demora evitando doble conteo
     */
    private calculateTotalDelay(breakdown: DelayCalculationResult['breakdown']): number {
        // Si hay jams vinculados, esa es la fuente más confiable
        if (breakdown.linkedJamsDelay > 0) {
            // Agregar proximidad solo si es significativamente mayor
            const proximityExtra = breakdown.proximityDelay > breakdown.linkedJamsDelay * 0.5
                ? breakdown.proximityDelay * 0.3 // Solo agregar 30% para evitar inflación
                : 0;

            return breakdown.linkedJamsDelay + proximityExtra + breakdown.historicalDelta;
        }

        // Si no hay jams vinculados, usar proximidad + desvío
        if (breakdown.proximityDelay > 0) {
            return breakdown.proximityDelay + breakdown.historicalDelta;
        }

        // Si es un corte sin jams detectados, usar estimación de desvío
        if (breakdown.detourDelay > 0) {
            return breakdown.detourDelay + breakdown.historicalDelta;
        }

        // Último recurso: solo datos históricos
        return breakdown.historicalDelta;
    }

    /**
     * Determina la confianza y el método predominante
     */
    private determineConfidenceAndMethod(
        breakdown: DelayCalculationResult['breakdown'],
        linkedCount: number,
        nearbyCount: number
    ): { confidence: number; primaryMethod: DelayCalculationResult['primaryMethod'] } {
        // Alta confianza si hay jams vinculados directamente
        if (linkedCount > 0) {
            const confidence = Math.min(95, 60 + linkedCount * 10);
            return { confidence, primaryMethod: 'linked' };
        }

        // Media-alta confianza con jams cercanos
        if (nearbyCount > 0) {
            const confidence = Math.min(80, 40 + nearbyCount * 10);
            return { confidence, primaryMethod: 'proximity' };
        }

        // Media confianza con estimación de desvío
        if (breakdown.detourDelay > 0) {
            return { confidence: 50, primaryMethod: 'detour' };
        }

        // Baja confianza solo con datos históricos
        if (breakdown.historicalDelta > 0) {
            return { confidence: 30, primaryMethod: 'historical' };
        }

        return { confidence: 10, primaryMethod: 'linked' };
    }

    /**
     * Genera descripción detallada del cálculo
     */
    private generateDetails(
        breakdown: DelayCalculationResult['breakdown'],
        linkedCount: number,
        nearbyCount: number,
        incident: InternalAlert
    ): string {
        const parts: string[] = [];

        if (linkedCount > 0) {
            parts.push(`${linkedCount} jam(s) vinculado(s) directamente`);
        }

        if (nearbyCount > 0) {
            parts.push(`${nearbyCount} jam(s) en proximidad (${CONFIG.PROXIMITY_RADIUS_METERS}m)`);
        }

        if (breakdown.detourDelay > 0) {
            parts.push(`Desvío estimado: +${Math.round(breakdown.detourDelay / 60)} min`);
        }

        if (breakdown.historicalDelta > 0) {
            parts.push(`Reducción vs histórico: +${Math.round(breakdown.historicalDelta / 60)} min`);
        }

        if (parts.length === 0) {
            if (this.isBlockingIncident(incident)) {
                return 'Corte de ruta sin jams reportados en la zona. Demora estimada por modelo de desvío.';
            }
            return 'Sin datos suficientes para estimar demora.';
        }

        return parts.join(' | ');
    }

    /**
     * Calcula demoras para múltiples incidentes
     */
    calculateBatchDelays(
        incidents: InternalAlert[],
        allJams: InternalJam[],
        historicalData?: HistoricalSnapshot[]
    ): Map<string, DelayCalculationResult> {
        const results = new Map<string, DelayCalculationResult>();

        for (const incident of incidents) {
            results.set(
                incident.id,
                this.calculateIncidentDelay(incident, allJams, historicalData)
            );
        }

        return results;
    }
}

// Exportar instancia singleton
export const delayCalculationService = new DelayCalculationService();
