import { InternalAlert, InternalJam } from '../types';

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
        const polygonAlerts = alerts.filter(a => a.polygonId === polygonId);
        const polygonJams = jams.filter(j => j.polygonId === polygonId);

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
                const subtype = alert.subtype || 'NO_SUBTYPE';
                if (!subtypeMap.has(subtype)) {
                    subtypeMap.set(subtype, []);
                }
                subtypeMap.get(subtype)!.push(alert);
            }

            // Calcular subtipos
            const subtypes: SubtypeBreakdown[] = [];
            for (const [subtype, subtypeAlerts] of subtypeMap.entries()) {
                const avgConfidence = subtypeAlerts
                    .filter(a => a.confidence !== undefined)
                    .reduce((sum, a) => sum + (a.confidence || 0), 0) / subtypeAlerts.length;

                const avgReliability = subtypeAlerts
                    .filter(a => a.reliability !== undefined)
                    .reduce((sum, a) => sum + (a.reliability || 0), 0) / subtypeAlerts.length;

                subtypes.push({
                    subtype,
                    subtypeLabel: this.getSubtypeLabel(type, subtype),
                    count: subtypeAlerts.length,
                    percentage: totalAlerts > 0 ? Math.round((subtypeAlerts.length / totalAlerts) * 100) : 0,
                    avgConfidence: isNaN(avgConfidence) ? undefined : Math.round(avgConfidence * 10) / 10,
                    avgReliability: isNaN(avgReliability) ? undefined : Math.round(avgReliability * 10) / 10
                });
            }

            // Ordenar subtipos por cantidad
            subtypes.sort((a, b) => b.count - a.count);

            // Calcular distribución de severidad
            const severity = {
                critical: alerts.filter(a => a.severity === 4).length,
                high: alerts.filter(a => a.severity === 3).length,
                medium: alerts.filter(a => a.severity === 2).length,
                low: alerts.filter(a => a.severity === 1).length
            };

            typeBreakdown.push({
                type,
                typeLabel: this.getTypeLabel(type),
                count: alerts.length,
                percentage: totalAlerts > 0 ? Math.round((alerts.length / totalAlerts) * 100) : 0,
                severity,
                subtypes
            });
        }

        // Ordenar por cantidad
        typeBreakdown.sort((a, b) => b.count - a.count);

        // Calcular distribución de jam levels
        const jamLevels = {
            level0: polygonJams.filter(j => j.level === 0).length,
            level1: polygonJams.filter(j => j.level === 1).length,
            level2: polygonJams.filter(j => j.level === 2).length,
            level3: polygonJams.filter(j => j.level === 3).length,
            level4: polygonJams.filter(j => j.level === 4).length,
            level5: polygonJams.filter(j => j.level === 5).length
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
            .map(a => ({
                type: a.type,
                subtype: a.subtype,
                street: a.street,
                confidence: a.confidence,
                reliability: a.reliability,
                severity: a.severity
            }));

        return {
            polygonId,
            polygonName,
            totalIncidents: totalAlerts,
            totalJams: polygonJams.length,
            typeBreakdown,
            jamLevels,
            topIncidents,
            lastUpdate: new Date()
        };
    }

    /**
     * Obtiene estadísticas agregadas de todos los polígonos
     */
    getGlobalStats(alerts: InternalAlert[], jams: InternalJam[]): {
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
                const subtype = alert.subtype || 'NO_SUBTYPE';
                if (!subtypeMap.has(subtype)) {
                    subtypeMap.set(subtype, []);
                }
                subtypeMap.get(subtype)!.push(alert);
            }

            const subtypes: SubtypeBreakdown[] = [];
            for (const [subtype, subtypeAlerts] of subtypeMap.entries()) {
                const avgConfidence = subtypeAlerts
                    .filter(a => a.confidence !== undefined)
                    .reduce((sum, a) => sum + (a.confidence || 0), 0) / subtypeAlerts.length;

                const avgReliability = subtypeAlerts
                    .filter(a => a.reliability !== undefined)
                    .reduce((sum, a) => sum + (a.reliability || 0), 0) / subtypeAlerts.length;

                subtypes.push({
                    subtype,
                    subtypeLabel: this.getSubtypeLabel(type, subtype),
                    count: subtypeAlerts.length,
                    percentage: totalAlerts > 0 ? Math.round((subtypeAlerts.length / totalAlerts) * 100) : 0,
                    avgConfidence: isNaN(avgConfidence) ? undefined : Math.round(avgConfidence * 10) / 10,
                    avgReliability: isNaN(avgReliability) ? undefined : Math.round(avgReliability * 10) / 10
                });
            }

            subtypes.sort((a, b) => b.count - a.count);

            const severity = {
                critical: typeAlerts.filter(a => a.severity === 4).length,
                high: typeAlerts.filter(a => a.severity === 3).length,
                medium: typeAlerts.filter(a => a.severity === 2).length,
                low: typeAlerts.filter(a => a.severity === 1).length
            };

            typeBreakdown.push({
                type,
                typeLabel: this.getTypeLabel(type),
                count: typeAlerts.length,
                percentage: totalAlerts > 0 ? Math.round((typeAlerts.length / totalAlerts) * 100) : 0,
                severity,
                subtypes
            });
        }

        typeBreakdown.sort((a, b) => b.count - a.count);

        const jamLevelsGlobal = {
            level0: jams.filter(j => j.level === 0).length,
            level1: jams.filter(j => j.level === 1).length,
            level2: jams.filter(j => j.level === 2).length,
            level3: jams.filter(j => j.level === 3).length,
            level4: jams.filter(j => j.level === 4).length,
            level5: jams.filter(j => j.level === 5).length
        };

        const criticalIncidents = alerts.filter(a => a.severity >= 3).length;
        const highQualityIncidents = alerts.filter(a => 
            (a.confidence || 0) >= 7 && (a.reliability || 0) >= 7
        ).length;

        return {
            totalIncidents: alerts.length,
            totalJams: jams.length,
            typeBreakdown,
            jamLevelsGlobal,
            criticalIncidents,
            highQualityIncidents
        };
    }

    /**
     * Traduce el tipo de incidente
     */
    private getTypeLabel(type: string): string {
        const labels: Record<string, string> = {
            'accident': 'Siniestro vial',
            'jam': 'Congestión',
            'hazard': 'Peligro',
            'weatherhazard': 'Peligro climático',
            'pothole': 'Bache',
            'roadclosed': 'Corte de ruta',
            'construction': 'Obra vial'
        };
        return labels[type] || type;
    }

    /**
     * Traduce el subtipo de incidente
     */
    private getSubtypeLabel(type: string, subtype: string): string {
        // Mapeo completo de subtipos
        const subtypeLabels: Record<string, string> = {
            // Accidents
            'ACCIDENT_MINOR': 'Siniestro leve',
            'ACCIDENT_MAJOR': 'Siniestro grave',
            
            // Hazards on road
            'HAZARD_ON_ROAD': 'Peligro en calzada',
            'HAZARD_ON_ROAD_OBJECT': 'Objeto en calzada',
            'HAZARD_ON_ROAD_POT_HOLE': 'Bache',
            'HAZARD_ON_ROAD_ROAD_KILL': 'Animal muerto',
            'HAZARD_ON_ROAD_LANE_CLOSED': 'Carril cerrado',
            'HAZARD_ON_ROAD_OIL': 'Derrame de aceite',
            'HAZARD_ON_ROAD_ICE': 'Hielo en calzada',
            'HAZARD_ON_ROAD_CONSTRUCTION': 'Obra en ejecución',
            'HAZARD_ON_ROAD_CAR_STOPPED': 'Vehículo detenido',
            'HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT': 'Semáforo averiado',
            
            // Hazards on shoulder
            'HAZARD_ON_SHOULDER': 'Peligro en banquina',
            'HAZARD_ON_SHOULDER_CAR_STOPPED': 'Vehículo en banquina',
            'HAZARD_ON_SHOULDER_ANIMALS': 'Animales en banquina',
            'HAZARD_ON_SHOULDER_MISSING_SIGN': 'Señal faltante',
            
            // Weather hazards
            'HAZARD_WEATHER': 'Peligro climático',
            'HAZARD_WEATHER_FOG': 'Niebla',
            'HAZARD_WEATHER_HAIL': 'Granizo',
            'HAZARD_WEATHER_HEAVY_RAIN': 'Lluvia intensa',
            'HAZARD_WEATHER_HEAVY_SNOW': 'Nevada',
            'HAZARD_WEATHER_FLOOD': 'Inundación',
            'HAZARD_WEATHER_MONSOON': 'Lluvia monzónica',
            'HAZARD_WEATHER_TORNADO': 'Tornado',
            'HAZARD_WEATHER_HEAT_WAVE': 'Ola de calor',
            'HAZARD_WEATHER_HURRICANE': 'Huracán',
            'HAZARD_WEATHER_FREEZING_RAIN': 'Lluvia congelante',
            
            // Road closed
            'ROAD_CLOSED': 'Corte total',
            'ROAD_CLOSED_HAZARD': 'Cierre por peligro',
            'ROAD_CLOSED_CONSTRUCTION': 'Cierre por obra',
            'ROAD_CLOSED_EVENT': 'Cierre por evento',
            
            // Construction
            'CONSTRUCTION': 'Obra vial',
            
            // Jam
            'JAM_LIGHT_TRAFFIC': 'Tránsito lento',
            'JAM_MODERATE_TRAFFIC': 'Tránsito denso',
            'JAM_HEAVY_TRAFFIC': 'Embotellamiento',
            'JAM_STAND_STILL_TRAFFIC': 'Tránsito detenido',
            
            'NO_SUBTYPE': 'Sin especificar'
        };

        return subtypeLabels[subtype] || subtype;
    }

    /**
     * Obtiene emoji según tipo de incidente
     */
    getIncidentEmoji(type: string, subtype?: string): string {
        const subtypeLower = (subtype || '').toLowerCase();
        
        // Emojis específicos por subtipo
        if (subtypeLower.includes('pot_hole')) return '🕳️';
        if (subtypeLower.includes('fog')) return '🌫️';
        if (subtypeLower.includes('rain')) return '🌧️';
        if (subtypeLower.includes('ice') || subtypeLower.includes('snow')) return '❄️';
        if (subtypeLower.includes('stopped')) return '🚗⚠️';
        
        const emojiMap: Record<string, string> = {
            'accident': '💥',
            'jam': '🚗💨',
            'hazard': '⚠️',
            'weatherhazard': '🌩️',
            'pothole': '🕳️',
            'roadclosed': '🚧',
            'construction': '👷'
        };

        return emojiMap[type] || '⚠️';
    }
}

export const incidentStatsService = new IncidentStatsService();









