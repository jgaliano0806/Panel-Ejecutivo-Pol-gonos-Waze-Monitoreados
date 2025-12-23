/**
 * Servicio de Cálculo de Demoras - Versión Mejorada
 *
 * Usa DATOS REALES del feed de Waze para calcular demoras precisas:
 * - El campo `delay` de los jams es la demora real calculada por Waze
 * - La velocidad y longitud son datos medidos, no estimados
 *
 * Estrategias de cálculo:
 * 1. Jams vinculados: Usa demora real de jams asociados al incidente
 * 2. Jams cercanos: Suma demora real de jams en proximidad geográfica
 * 3. Desvío estimado: Solo para cortes de ruta sin jams reportados
 */

import { InternalJam, InternalAlert, HistoricalSnapshot } from '../types';

// Configuración conservadora para evitar falsas expectativas
const CONFIG = {
    // Radio de búsqueda para jams cercanos (metros)
    PROXIMITY_RADIUS_METERS: 300,
    // Radio extendido para contexto de zona (metros)
    EXTENDED_RADIUS_METERS: 1000,
    // Velocidad promedio en desvíos urbanos (km/h)
    DETOUR_AVG_SPEED_KMH: 25,
    // Factor de longitud de desvío (1.5x = 50% más largo)
    DETOUR_LENGTH_FACTOR: 1.5,
    // Velocidad normal en vías principales (km/h)
    NORMAL_SPEED_KMH: 60,
    // Longitud promedio de tramo afectado por corte (km)
    AVG_BLOCKED_LENGTH_KM: 1.5,
    // LÍMITES MÁXIMOS para evitar valores absurdos
    MAX_DELAY_PER_JAM_SECONDS: 600,      // Máx 10 min por jam individual
    MAX_TOTAL_DELAY_SECONDS: 1800,       // Máx 30 min de demora total
    MAX_DETOUR_DELAY_SECONDS: 480,       // Máx 8 min por desvío
    // Factor de descuento para jams cercanos (no todos afectan igual)
    NEARBY_JAMS_FACTOR: 0.5,
};

export interface DelayCalculationResult {
    totalDelaySeconds: number;
    totalDelayMinutes: number;
    breakdown: {
        linkedJamsDelay: number;    // Demora REAL de jams vinculados (datos Waze)
        proximityDelay: number;      // Demora REAL de jams cercanos (datos Waze)
        detourDelay: number;         // Estimación de desvío (solo si no hay jams)
        historicalDelta: number;     // Comparación informativa (no suma al total)
    };
    confidence: number;
    consideredJams: {
        linked: number;
        nearby: number;
    };
    primaryMethod: 'linked' | 'proximity' | 'detour' | 'minimal';
    details: string;
    // Nuevos campos informativos
    dataQuality: 'high' | 'medium' | 'low';
    rawDataUsed: {
        totalJamsConsidered: number;
        avgJamSpeed: number | null;
        totalAffectedLength: number; // metros
    };
}

class DelayCalculationService {
    /**
     * Calcula la demora de un incidente usando DATOS REALES del feed
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

        // 1. Obtener jams DIRECTAMENTE vinculados (blockingAlertUuid)
        const linkedJams = this.findLinkedJams(incident, allJams);

        // 2. Obtener jams CERCANOS geográficamente
        const nearbyJams = this.findNearbyJams(incident, allJams, linkedJams);

        // 3. Calcular demora usando DATOS REALES del feed
        breakdown.linkedJamsDelay = this.calculateRealDelay(linkedJams);
        breakdown.proximityDelay = this.calculateRealDelay(nearbyJams) * CONFIG.NEARBY_JAMS_FACTOR;

        // 4. Estimación de desvío solo si es corte de ruta Y no hay jams
        if (this.isBlockingIncident(incident) && linkedJams.length === 0 && nearbyJams.length === 0) {
            breakdown.detourDelay = this.estimateDetourDelay();
        }

        // 5. Comparación histórica (solo informativa, NO suma al total)
        if (historicalData && historicalData.length > 0) {
            breakdown.historicalDelta = this.calculateHistoricalContext(
                linkedJams.concat(nearbyJams),
                historicalData
            );
        }

        // Calcular total (SIN incluir historical, es solo contexto)
        const totalDelaySeconds = this.calculateTotal(breakdown, linkedJams.length, nearbyJams.length);
        const totalDelayMinutes = Math.round(totalDelaySeconds / 60);

        // Determinar confianza y método
        const { confidence, primaryMethod, dataQuality } = this.assessQuality(
            linkedJams,
            nearbyJams,
            breakdown
        );

        // Calcular métricas de datos raw
        const allConsideredJams = linkedJams.concat(nearbyJams);
        const rawDataUsed = {
            totalJamsConsidered: allConsideredJams.length,
            avgJamSpeed: allConsideredJams.length > 0
                ? Math.round(allConsideredJams.reduce((s, j) => s + j.speed, 0) / allConsideredJams.length)
                : null,
            totalAffectedLength: allConsideredJams.reduce((s, j) => s + j.length, 0),
        };

        // Generar descripción clara
        const details = this.generateDetails(breakdown, linkedJams, nearbyJams, incident);

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
            dataQuality,
            rawDataUsed,
        };
    }

    /**
     * Encuentra jams vinculados directamente al incidente
     */
    private findLinkedJams(incident: InternalAlert, allJams: InternalJam[]): InternalJam[] {
        return allJams.filter(jam => jam.blockingAlertUuid === incident.id);
    }

    /**
     * Encuentra jams cercanos geográficamente (excluyendo ya vinculados)
     */
    private findNearbyJams(
        incident: InternalAlert,
        allJams: InternalJam[],
        excludeJams: InternalJam[]
    ): InternalJam[] {
        const excludeIds = new Set(excludeJams.map(j => j.id));

        return allJams.filter(jam => {
            if (excludeIds.has(jam.id)) return false;

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
     * Calcula demora REAL usando el campo delay de Waze
     * (Este es el dato más confiable del feed)
     */
    private calculateRealDelay(jams: InternalJam[]): number {
        if (jams.length === 0) return 0;

        let totalDelay = 0;

        for (const jam of jams) {
            // Usar el delay REAL reportado por Waze, con límite
            const jamDelay = Math.min(jam.delay || 0, CONFIG.MAX_DELAY_PER_JAM_SECONDS);
            totalDelay += jamDelay;
        }

        return totalDelay;
    }

    /**
     * Estima demora por desvío (solo cuando NO hay datos de jams)
     */
    private estimateDetourDelay(): number {
        // Tiempo normal para atravesar el tramo bloqueado
        const normalTimeSeconds = (CONFIG.AVG_BLOCKED_LENGTH_KM / CONFIG.NORMAL_SPEED_KMH) * 3600;

        // Tiempo estimado del desvío
        const detourLengthKm = CONFIG.AVG_BLOCKED_LENGTH_KM * CONFIG.DETOUR_LENGTH_FACTOR;
        const detourTimeSeconds = (detourLengthKm / CONFIG.DETOUR_AVG_SPEED_KMH) * 3600;

        // Diferencia (con límite)
        const delay = Math.max(0, detourTimeSeconds - normalTimeSeconds);
        return Math.min(delay, CONFIG.MAX_DETOUR_DELAY_SECONDS);
    }

    /**
     * Calcula contexto histórico (solo informativo)
     * Compara demora actual vs promedio histórico
     */
    private calculateHistoricalContext(
        currentJams: InternalJam[],
        historicalData: HistoricalSnapshot[]
    ): number {
        if (currentJams.length === 0 || historicalData.length === 0) return 0;

        // Demora promedio actual de los jams
        const currentAvgDelay = currentJams.reduce((s, j) => s + (j.delay || 0), 0) / currentJams.length;

        // Demora promedio histórica
        const historicalAvgDelay = historicalData
            .filter(h => h.avgDelay !== null && h.avgDelay !== undefined)
            .reduce((s, h) => s + h.avgDelay, 0) / historicalData.length || 0;

        // Diferencia (puede ser negativa si actual es mejor que histórico)
        const delta = currentAvgDelay - historicalAvgDelay;

        // Solo retornar si es significativamente peor que histórico
        return delta > 30 ? Math.min(delta, 300) : 0; // Máximo 5 min de contexto histórico
    }

    /**
     * Calcula el total de demora con límites razonables
     */
    private calculateTotal(
        breakdown: DelayCalculationResult['breakdown'],
        _linkedCount: number,
        _nearbyCount: number
    ): number {
        let total = 0;

        // Prioridad 1: Datos reales de jams vinculados
        if (breakdown.linkedJamsDelay > 0) {
            total = breakdown.linkedJamsDelay;

            // Agregar solo una fracción de proximidad para no inflar
            if (breakdown.proximityDelay > 0) {
                total += breakdown.proximityDelay * 0.3;
            }
        }
        // Prioridad 2: Datos reales de jams cercanos
        else if (breakdown.proximityDelay > 0) {
            total = breakdown.proximityDelay;
        }
        // Prioridad 3: Estimación de desvío (solo si no hay datos)
        else if (breakdown.detourDelay > 0) {
            total = breakdown.detourDelay;
        }

        // NO sumamos historicalDelta - es solo contexto informativo

        // Aplicar límite máximo global
        return Math.min(total, CONFIG.MAX_TOTAL_DELAY_SECONDS);
    }

    /**
     * Evalúa la calidad de los datos y confianza
     */
    private assessQuality(
        linkedJams: InternalJam[],
        nearbyJams: InternalJam[],
        breakdown: DelayCalculationResult['breakdown']
    ): {
        confidence: number;
        primaryMethod: DelayCalculationResult['primaryMethod'];
        dataQuality: 'high' | 'medium' | 'low';
    } {
        // Alta calidad: tenemos jams vinculados directamente
        if (linkedJams.length > 0) {
            return {
                confidence: Math.min(90, 70 + linkedJams.length * 5),
                primaryMethod: 'linked',
                dataQuality: 'high',
            };
        }

        // Media calidad: tenemos jams cercanos
        if (nearbyJams.length > 0) {
            return {
                confidence: Math.min(70, 40 + nearbyJams.length * 10),
                primaryMethod: 'proximity',
                dataQuality: 'medium',
            };
        }

        // Baja calidad: solo estimación de desvío
        if (breakdown.detourDelay > 0) {
            return {
                confidence: 35,
                primaryMethod: 'detour',
                dataQuality: 'low',
            };
        }

        // Sin datos suficientes
        return {
            confidence: 10,
            primaryMethod: 'minimal',
            dataQuality: 'low',
        };
    }

    /**
     * Genera descripción clara para gestión vial
     */
    private generateDetails(
        breakdown: DelayCalculationResult['breakdown'],
        linkedJams: InternalJam[],
        nearbyJams: InternalJam[],
        incident: InternalAlert
    ): string {
        const parts: string[] = [];

        if (linkedJams.length > 0) {
            const totalLength = linkedJams.reduce((s, j) => s + j.length, 0);
            const lengthKm = (totalLength / 1000).toFixed(1);
            const avgSpeed = Math.round(linkedJams.reduce((s, j) => s + j.speed, 0) / linkedJams.length);

            parts.push(`${linkedJams.length} congestión(es) en el punto (${lengthKm}km, ${avgSpeed}km/h prom)`);
        }

        if (nearbyJams.length > 0) {
            const avgSpeed = Math.round(nearbyJams.reduce((s, j) => s + j.speed, 0) / nearbyJams.length);
            parts.push(`${nearbyJams.length} tramo(s) afectado(s) en zona cercana (${avgSpeed}km/h prom)`);
        }

        if (breakdown.detourDelay > 0 && linkedJams.length === 0 && nearbyJams.length === 0) {
            parts.push('Desvío estimado: sin congestiones reportadas aún');
        }

        if (breakdown.historicalDelta > 0) {
            const mins = Math.round(breakdown.historicalDelta / 60);
            parts.push(`${mins} min peor que promedio histórico`);
        }

        if (parts.length === 0) {
            if (this.isBlockingIncident(incident)) {
                return 'Cierre de vía reciente - monitoreando impacto';
            }
            return 'Sin congestiones significativas detectadas';
        }

        return parts.join(' • ');
    }

    /**
     * Determina si es un incidente bloqueante
     */
    private isBlockingIncident(incident: InternalAlert): boolean {
        const blockingTypes = ['ROAD_CLOSED', 'road_closed', 'roadclosed'];
        const typeMatches = blockingTypes.includes(incident.type.toLowerCase());
        const subtypeMatches = incident.subtype
            ? blockingTypes.some(t => incident.subtype!.toLowerCase().includes(t))
            : false;
        return typeMatches || subtypeMatches;
    }

    /**
     * Calcula distancia entre dos puntos (Haversine)
     */
    private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371000;
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

export const delayCalculationService = new DelayCalculationService();
