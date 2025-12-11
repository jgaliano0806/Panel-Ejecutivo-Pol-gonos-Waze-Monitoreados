import { InternalAlert, InternalJam } from '../types';

/**
 * Servicio de Calidad de Datos
 * Utiliza los scores de Waze (confidence, reliability) para evaluar y filtrar datos
 * 
 * Basado en documentación oficial de Waze:
 * - Confidence Score (0-10): Basado en feedback de usuarios
 * - Reliability Score (0-10): Basado en nivel de experiencia del reportante
 */

export interface DataQualityMetrics {
    totalIncidents: number;
    highQualityIncidents: number;
    mediumQualityIncidents: number;
    lowQualityIncidents: number;
    avgConfidence: number;
    avgReliability: number;
    filteredOutCount: number;
    qualityPercentage: number;
}

export interface IncidentQuality {
    id: string;
    quality: 'high' | 'medium' | 'low';
    confidence: number;
    reliability: number;
    score: number;
    shouldFilter: boolean;
    reason?: string;
}

export interface QualityReport {
    timestamp: Date;
    metrics: DataQualityMetrics;
    byPolygon: Map<string, DataQualityMetrics>;
    lowQualityIncidents: Array<{
        id: string;
        type: string;
        polygonId: string | null;
        confidence: number;
        reliability: number;
        reason: string;
    }>;
}

export class DataQualityService {
    // Umbrales configurables basados en documentación de Waze
    private readonly thresholds = {
        HIGH_QUALITY: {
            minConfidence: 7,    // Score >= 7 indica alta validación de usuarios
            minReliability: 7,   // Score >= 7 indica reportante muy experimentado
            minCombined: 14      // Suma mínima de ambos scores
        },
        MEDIUM_QUALITY: {
            minConfidence: 4,
            minReliability: 4,
            minCombined: 8
        },
        LOW_QUALITY: {
            maxConfidence: 3,    // Score <= 3 indica bajo feedback positivo
            maxReliability: 3,   // Score <= 3 indica reportante poco experimentado
            maxCombined: 6
        },
        FILTER_OUT: {
            minConfidence: 2,    // Filtrar si confidence < 2 (muy poco confiable)
            minReliability: 2,   // Filtrar si reliability < 2 (reportante novato)
            minThumbsUp: 0       // Filtrar si tiene feedback negativo
        }
    };

    /**
     * Evalúa la calidad de un incidente individual
     */
    evaluateIncidentQuality(incident: InternalAlert): IncidentQuality {
        const confidence = incident.confidence ?? 5; // Default 5 si no está disponible
        const reliability = incident.reliability ?? 5;
        const score = confidence + reliability;

        // Determinar si debe filtrarse
        let shouldFilter = false;
        let reason: string | undefined;

        if (confidence < this.thresholds.FILTER_OUT.minConfidence) {
            shouldFilter = true;
            reason = `Confidence muy bajo (${confidence}/10)`;
        } else if (reliability < this.thresholds.FILTER_OUT.minReliability) {
            shouldFilter = true;
            reason = `Reliability muy bajo (${reliability}/10)`;
        } else if (incident.nThumbsUp !== undefined && incident.nThumbsUp < this.thresholds.FILTER_OUT.minThumbsUp) {
            // Si tiene thumbs up negativo, es sospechoso
            shouldFilter = true;
            reason = 'Feedback negativo de usuarios';
        }

        // Determinar calidad
        let quality: 'high' | 'medium' | 'low';
        if (confidence >= this.thresholds.HIGH_QUALITY.minConfidence && 
            reliability >= this.thresholds.HIGH_QUALITY.minReliability) {
            quality = 'high';
        } else if (confidence >= this.thresholds.MEDIUM_QUALITY.minConfidence && 
                   reliability >= this.thresholds.MEDIUM_QUALITY.minReliability) {
            quality = 'medium';
        } else {
            quality = 'low';
        }

        return {
            id: incident.id,
            quality,
            confidence,
            reliability,
            score,
            shouldFilter,
            reason
        };
    }

    /**
     * Filtra incidentes de baja calidad
     */
    filterHighQualityIncidents(incidents: InternalAlert[]): InternalAlert[] {
        return incidents.filter(incident => {
            const quality = this.evaluateIncidentQuality(incident);
            return !quality.shouldFilter;
        });
    }

    /**
     * Obtiene solo incidentes de alta calidad (para alertas críticas)
     */
    getHighQualityIncidents(incidents: InternalAlert[]): InternalAlert[] {
        return incidents.filter(incident => {
            const quality = this.evaluateIncidentQuality(incident);
            return quality.quality === 'high' && !quality.shouldFilter;
        });
    }

    /**
     * Calcula métricas de calidad para un conjunto de incidentes
     */
    calculateQualityMetrics(incidents: InternalAlert[]): DataQualityMetrics {
        if (incidents.length === 0) {
            return {
                totalIncidents: 0,
                highQualityIncidents: 0,
                mediumQualityIncidents: 0,
                lowQualityIncidents: 0,
                avgConfidence: 0,
                avgReliability: 0,
                filteredOutCount: 0,
                qualityPercentage: 0
            };
        }

        let highCount = 0;
        let mediumCount = 0;
        let lowCount = 0;
        let filteredCount = 0;
        let totalConfidence = 0;
        let totalReliability = 0;
        let confidenceCount = 0;
        let reliabilityCount = 0;

        for (const incident of incidents) {
            const quality = this.evaluateIncidentQuality(incident);

            if (quality.shouldFilter) {
                filteredCount++;
            } else {
                switch (quality.quality) {
                    case 'high':
                        highCount++;
                        break;
                    case 'medium':
                        mediumCount++;
                        break;
                    case 'low':
                        lowCount++;
                        break;
                }
            }

            if (incident.confidence !== undefined) {
                totalConfidence += incident.confidence;
                confidenceCount++;
            }
            if (incident.reliability !== undefined) {
                totalReliability += incident.reliability;
                reliabilityCount++;
            }
        }

        const validIncidents = incidents.length - filteredCount;
        const qualityPercentage = validIncidents > 0 
            ? Math.round((highCount / validIncidents) * 100)
            : 0;

        return {
            totalIncidents: incidents.length,
            highQualityIncidents: highCount,
            mediumQualityIncidents: mediumCount,
            lowQualityIncidents: lowCount,
            avgConfidence: confidenceCount > 0 ? Math.round((totalConfidence / confidenceCount) * 10) / 10 : 0,
            avgReliability: reliabilityCount > 0 ? Math.round((totalReliability / reliabilityCount) * 10) / 10 : 0,
            filteredOutCount: filteredCount,
            qualityPercentage
        };
    }

    /**
     * Genera un reporte completo de calidad de datos
     */
    generateQualityReport(incidents: InternalAlert[]): QualityReport {
        const globalMetrics = this.calculateQualityMetrics(incidents);
        
        // Métricas por polígono
        const byPolygon = new Map<string, DataQualityMetrics>();
        const polygonGroups = new Map<string, InternalAlert[]>();

        for (const incident of incidents) {
            if (!incident.polygonId) continue;
            
            if (!polygonGroups.has(incident.polygonId)) {
                polygonGroups.set(incident.polygonId, []);
            }
            polygonGroups.get(incident.polygonId)!.push(incident);
        }

        for (const [polygonId, polygonIncidents] of polygonGroups.entries()) {
            byPolygon.set(polygonId, this.calculateQualityMetrics(polygonIncidents));
        }

        // Identificar incidentes de baja calidad
        const lowQualityIncidents = incidents
            .map(incident => ({
                incident,
                quality: this.evaluateIncidentQuality(incident)
            }))
            .filter(({ quality }) => quality.shouldFilter || quality.quality === 'low')
            .map(({ incident, quality }) => ({
                id: incident.id,
                type: incident.type,
                polygonId: incident.polygonId,
                confidence: quality.confidence,
                reliability: quality.reliability,
                reason: quality.reason || `Calidad ${quality.quality}`
            }));

        return {
            timestamp: new Date(),
            metrics: globalMetrics,
            byPolygon,
            lowQualityIncidents
        };
    }

    /**
     * Prioriza incidentes basándose en calidad y severidad
     * Útil para sistemas de alertas
     */
    prioritizeIncidents(incidents: InternalAlert[]): InternalAlert[] {
        return incidents
            .map(incident => ({
                incident,
                quality: this.evaluateIncidentQuality(incident),
                priorityScore: this.calculatePriorityScore(incident)
            }))
            .filter(({ quality }) => !quality.shouldFilter)
            .sort((a, b) => b.priorityScore - a.priorityScore)
            .map(({ incident }) => incident);
    }

    /**
     * Calcula un score de prioridad combinando severidad y calidad
     */
    private calculatePriorityScore(incident: InternalAlert): number {
        const quality = this.evaluateIncidentQuality(incident);
        
        // Score base por severidad (1-4 -> 100-400)
        let score = incident.severity * 100;
        
        // Bonus por calidad de datos (0-50 puntos)
        score += quality.score * 2.5;
        
        // Bonus por validaciones de usuarios (0-25 puntos)
        if (incident.nThumbsUp) {
            score += Math.min(incident.nThumbsUp * 5, 25);
        }
        
        // Penalty por baja confianza
        if (quality.quality === 'low') {
            score *= 0.7;
        }
        
        return Math.round(score);
    }

    /**
     * Detecta incidentes que probablemente ya no son válidos
     * (basado en bajo confidence después de cierto tiempo)
     */
    detectStaleIncidents(incidents: InternalAlert[], maxAgeMinutes: number = 30): InternalAlert[] {
        const now = Date.now();
        const maxAge = maxAgeMinutes * 60 * 1000;

        return incidents.filter(incident => {
            const age = now - incident.timestamp.getTime();
            const quality = this.evaluateIncidentQuality(incident);

            // Si es viejo y tiene baja confianza, probablemente ya no es válido
            return age > maxAge && quality.confidence < 5;
        });
    }

    /**
     * Obtiene estadísticas de umbrales actuales (útil para debugging)
     */
    getThresholds() {
        return { ...this.thresholds };
    }

    /**
     * Actualiza umbrales dinámicamente (para ajustes en producción)
     */
    updateThresholds(updates: Partial<typeof this.thresholds>) {
        Object.assign(this.thresholds, updates);
        console.log('🔧 Umbrales de calidad actualizados:', this.thresholds);
    }

    /**
     * Verifica si un feed alcanzó el límite de Waze (5000 eventos)
     */
    checkFeedLimit(incidents: InternalAlert[], jams: InternalJam[]): {
        nearLimit: boolean;
        atLimit: boolean;
        totalEvents: number;
        percentage: number;
    } {
        const totalEvents = incidents.length + jams.length;
        const WAZE_LIMIT = 5000;
        const percentage = (totalEvents / WAZE_LIMIT) * 100;

        return {
            nearLimit: totalEvents >= WAZE_LIMIT * 0.9, // 90% del límite
            atLimit: totalEvents >= WAZE_LIMIT,
            totalEvents,
            percentage: Math.round(percentage)
        };
    }
}

export const dataQualityService = new DataQualityService();
