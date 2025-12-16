import { TrafficAlert, AlertSeverity, AlertType, InternalJam, InternalAlert } from '../types';
import { REAL_POLYGONS } from '../config/realPolygons';
import { dataQualityService } from './dataQualityService';

/**
 * Servicio de Alertas de Tráfico
 * Detecta situaciones críticas y genera alertas automáticas
 * Ahora integrado con sistema de calidad de datos basado en scores de Waze
 */
export class AlertService {
    private alerts: TrafficAlert[] = [];
    private alertIdCounter = 0;

    // Umbrales configurables
    private readonly thresholds = {
        CRITICAL: {
            jamLevel: 5,
            delayMinutes: 10,
            avgSpeed: 5, // km/h
            stoppedJamsPercent: 30,
        },
        HIGH: {
            jamLevel: 4,
            delayMinutes: 5,
            avgSpeed: 15,
            stoppedJamsPercent: 20,
        },
        MEDIUM: {
            jamLevel: 3,
            delayMinutes: 3,
            avgSpeed: 25,
        },
    };

    /**
     * Evalúa jams de un polígono y genera alertas
     * Ahora incluye información sobre incidentes causantes (calles cerradas, accidentes, obras, etc.)
     */
    evaluatePolygonJams(polygonId: string, jams: InternalJam[], incidents: InternalAlert[]): TrafficAlert[] {
        const polygon = REAL_POLYGONS.find(p => p.id === polygonId);
        if (!polygon) return [];

        const newAlerts: TrafficAlert[] = [];
        const polygonJams = jams.filter(j => j.polygonId === polygonId);
        const polygonIncidents = incidents.filter(i => i.polygonId === polygonId);

        if (polygonJams.length === 0) return [];

        // 1. Detectar bloqueos totales (jamLevel 5 o velocidad muy baja)
        const criticalJams = polygonJams.filter(
            j => j.level === 5 || j.speed < this.thresholds.CRITICAL.avgSpeed
        );

        if (criticalJams.length > 0) {
            // Identificar causa del bloqueo basado en incidentes cercanos
            const blockageCause = this.identifyIncidentCause(criticalJams, polygonIncidents);

            newAlerts.push(this.createAlert({
                severity: AlertSeverity.CRITICAL,
                type: AlertType.TOTAL_BLOCKAGE,
                polygonId,
                polygonName: polygon.name,
                location: criticalJams[0].street || polygon.name,
                message: `⛔ BLOQUEO TOTAL: ${blockageCause.emoji} ${blockageCause.description} - ${criticalJams.length} punto(s) crítico(s) en ${polygon.name}`,
                data: {
                    criticalJamsCount: criticalJams.length,
                    blockageCause: blockageCause.type,
                    blockageDescription: blockageCause.description,
                    relatedIncidents: blockageCause.incidents.map(i => ({
                        type: i.type,
                        subtype: i.subtype,
                        street: i.street,
                        description: i.description
                    })),
                    jams: criticalJams.map(j => ({
                        street: j.street,
                        speed: j.speed,
                        delay: j.delay,
                        level: j.level,
                    })),
                },
            }));
        }

        // 2. Detectar delays excesivos
        const avgDelay = polygonJams.reduce((sum, j) => sum + j.delay, 0) / polygonJams.length;
        const delayMinutes = avgDelay / 60;

        if (delayMinutes >= this.thresholds.CRITICAL.delayMinutes) {
            const cause = this.identifyIncidentCause(polygonJams, polygonIncidents);
            newAlerts.push(this.createAlert({
                severity: AlertSeverity.CRITICAL,
                type: AlertType.EXCESSIVE_DELAY,
                polygonId,
                polygonName: polygon.name,
                location: polygon.name,
                message: `⏱️ DEMORA CRÍTICA: ${cause.emoji} ${cause.description} - +${Math.round(delayMinutes)} minutos promedio en ${polygon.name}`,
                data: {
                    avgDelayMinutes: Math.round(delayMinutes),
                    avgDelaySeconds: Math.round(avgDelay),
                    affectedJams: polygonJams.length,
                    cause: cause.type,
                    relatedIncidents: cause.incidents.map(i => ({ type: i.type, subtype: i.subtype, street: i.street }))
                },
            }));
        } else if (delayMinutes >= this.thresholds.HIGH.delayMinutes) {
            const cause = this.identifyIncidentCause(polygonJams, polygonIncidents);
            newAlerts.push(this.createAlert({
                severity: AlertSeverity.HIGH,
                type: AlertType.SIGNIFICANT_DELAY,
                polygonId,
                polygonName: polygon.name,
                location: polygon.name,
                message: `⚠️ DEMORA SIGNIFICATIVA: ${cause.emoji} ${cause.description} - +${Math.round(delayMinutes)} minutos promedio en ${polygon.name}`,
                data: {
                    avgDelayMinutes: Math.round(delayMinutes),
                    affectedJams: polygonJams.length,
                    cause: cause.type
                },
            }));
        }

        // 3. Detectar congestión extensa
        const highLevelJams = polygonJams.filter(j => j.level && j.level >= 4);
        const totalLength = polygonJams.reduce((sum, j) => sum + j.length, 0);
        const criticalLength = highLevelJams.reduce((sum, j) => sum + j.length, 0);
        const criticalKm = criticalLength / 1000;

        if (criticalKm >= 1.0) {
            const cause = this.identifyIncidentCause(highLevelJams, polygonIncidents);
            newAlerts.push(this.createAlert({
                severity: AlertSeverity.CRITICAL,
                type: AlertType.EXTENSIVE_CONGESTION,
                polygonId,
                polygonName: polygon.name,
                location: polygon.name,
                message: `🚦 CONGESTIÓN EXTENSA: ${cause.emoji} ${cause.description} - ${criticalKm.toFixed(2)} km en estado crítico en ${polygon.name}`,
                data: {
                    criticalKm: Number(criticalKm.toFixed(2)),
                    totalKm: Number((totalLength / 1000).toFixed(2)),
                    highLevelJamsCount: highLevelJams.length,
                    cause: cause.type
                },
            }));
        }

        // 4. Detectar porcentaje alto de jams detenidos
        const stoppedJams = polygonJams.filter(j => j.speed === 0);
        const stoppedPercent = (stoppedJams.length / polygonJams.length) * 100;

        if (stoppedPercent >= this.thresholds.CRITICAL.stoppedJamsPercent) {
            const cause = this.identifyIncidentCause(stoppedJams, polygonIncidents);
            newAlerts.push(this.createAlert({
                severity: AlertSeverity.HIGH,
                type: AlertType.HIGH_USER_IMPACT,
                polygonId,
                polygonName: polygon.name,
                location: polygon.name,
                message: `👥 ALTO IMPACTO: ${cause.emoji} ${cause.description} - ${Math.round(stoppedPercent)}% de puntos detenidos en ${polygon.name}`,
                data: {
                    stoppedPercent: Math.round(stoppedPercent),
                    stoppedCount: stoppedJams.length,
                    totalJams: polygonJams.length,
                    cause: cause.type,
                    relatedIncidents: cause.incidents.map(i => ({ type: i.type, subtype: i.subtype, street: i.street }))
                },
            }));
        }

        return newAlerts;
    }

    /**
     * Identifica la causa del incidente basándose en reportes cercanos
     * MEJORA: Ahora prioriza incidentes de alta calidad
     */
    private identifyIncidentCause(jams: InternalJam[], incidents: any[]) {
        // Buscar incidentes relacionados por blockingAlertUuid o proximidad
        let relatedIncidents = incidents.filter(inc => {
            // Verificar si algún jam tiene blockingAlertUuid que coincida
            return jams.some(jam => jam.blockingAlertUuid === inc.id);
        });

        // MEJORA: Priorizar incidentes por calidad
        if (relatedIncidents.length > 1) {
            relatedIncidents = dataQualityService.prioritizeIncidents(relatedIncidents);
        }

        // Si no hay incidentes relacionados, buscar por tipo de jam más común
        if (relatedIncidents.length === 0) {
            // Determinar causa por análisis del jam
            const hasZeroSpeed = jams.some(j => j.speed === 0);
            const allHighLevel = jams.every(j => j.level === 5);

            if (allHighLevel && hasZeroSpeed) {
                return {
                    type: 'unknown_blockage',
                    description: 'Bloqueo total (causa no identificada)',
                    emoji: '🚧',
                    incidents: []
                };
            }

            return {
                type: 'severe_congestion',
                description: 'Congestión severa',
                emoji: '🚦',
                incidents: []
            };
        }

        // Priorizar por tipo de incidente (los de alta calidad ya están primero)
        const roadClosed = relatedIncidents.find(i => i.type === 'roadclosed');
        if (roadClosed) {
            const quality = dataQualityService.evaluateIncidentQuality(roadClosed);
            const qualityLabel = quality.quality === 'high' ? ' (confirmado)' : '';
            return {
                type: 'road_closed',
                description: `Calle cerrada${qualityLabel}`,
                emoji: '🚧',
                incidents: [roadClosed]
            };
        }

        const accident = relatedIncidents.find(i => i.type === 'accident');
        if (accident) {
            const quality = dataQualityService.evaluateIncidentQuality(accident);
            const severity = accident.severity >= 3 ? 'grave' : 'menor';
            const qualityLabel = quality.quality === 'high' ? ' (verificado)' : '';
            return {
                type: 'accident',
                description: `Accidente ${severity}${qualityLabel}`,
                emoji: '🚗💥',
                incidents: [accident]
            };
        }

        const construction = relatedIncidents.find(i => i.type === 'construction');
        if (construction) {
            return {
                type: 'construction',
                description: 'Obra en curso',
                emoji: '🏗️',
                incidents: [construction]
            };
        }

        const hazard = relatedIncidents.find(i => i.type === 'hazard');
        if (hazard) {
            return {
                type: 'hazard',
                description: 'Peligro en vía',
                emoji: '⚠️',
                incidents: [hazard]
            };
        }

        // Si hay incidentes pero no son de los tipos conocidos
        return {
            type: 'other_incident',
            description: `${relatedIncidents[0].type} reportado`,
            emoji: '⚠️',
            incidents: relatedIncidents
        };
    }

    /**
     * Evalúa todos los polígonos y genera alertas globales
     * Ahora usa filtrado de calidad para mejorar precisión
     */
    evaluateAllPolygons(allJams: InternalJam[], allIncidents: any[] = []): TrafficAlert[] {
        const newAlerts: TrafficAlert[] = [];

        // MEJORA: Filtrar incidentes de baja calidad antes de evaluar
        const highQualityIncidents = dataQualityService.filterHighQualityIncidents(allIncidents);
        const filteredCount = allIncidents.length - highQualityIncidents.length;
        
        if (filteredCount > 0) {
            console.log(`🔍 Filtrados ${filteredCount} incidentes de baja calidad (confidence/reliability bajo)`);
        }

        // Agrupar jams por polígono
        const jamsByPolygon = new Map<string, InternalJam[]>();
        for (const jam of allJams) {
            if (!jam.polygonId) continue;
            if (!jamsByPolygon.has(jam.polygonId)) {
                jamsByPolygon.set(jam.polygonId, []);
            }
            jamsByPolygon.get(jam.polygonId)!.push(jam);
        }

        // Evaluar cada polígono con incidentes de alta calidad
        for (const [polygonId, jams] of jamsByPolygon.entries()) {
            const polygonAlerts = this.evaluatePolygonJams(polygonId, jams, highQualityIncidents);
            newAlerts.push(...polygonAlerts);
        }

        // Actualizar lista de alertas activas
        this.alerts = newAlerts;

        return newAlerts;
    }

    /**
     * Detecta cambios en jamLevel entre dos estados
     */
    detectJamLevelChanges(
        oldJams: InternalJam[],
        newJams: InternalJam[]
    ): TrafficAlert[] {
        const alerts: TrafficAlert[] = [];

        // Crear mapa de jams anteriores por ID
        const oldJamsMap = new Map(oldJams.map(j => [j.id, j]));

        for (const newJam of newJams) {
            const oldJam = oldJamsMap.get(newJam.id);

            if (oldJam && oldJam.level !== undefined && newJam.level !== undefined) {
                const levelChange = newJam.level - oldJam.level;

                // Solo alertar si empeoró (aumentó jamLevel)
                if (levelChange >= 2) {
                    const polygon = REAL_POLYGONS.find(p => p.id === newJam.polygonId);

                    alerts.push(this.createAlert({
                        severity: newJam.level >= 4 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
                        type: AlertType.JAM_LEVEL_INCREASE,
                        polygonId: newJam.polygonId || 'unknown',
                        polygonName: polygon?.name || 'Desconocido',
                        location: newJam.street || polygon?.name || 'Desconocido',
                        message: `📈 EMPEORAMIENTO: Nivel de congestión aumentó de ${oldJam.level} a ${newJam.level} en ${newJam.street || polygon?.name}`,
                        data: {
                            oldLevel: oldJam.level,
                            newLevel: newJam.level,
                            levelChange,
                            speed: newJam.speed,
                            delay: newJam.delay,
                        },
                    }));
                }
            }
        }

        return alerts;
    }

    /**
     * Crea una nueva alerta
     */
    private createAlert(params: Omit<TrafficAlert, 'id' | 'timestamp' | 'isAcknowledged'>): TrafficAlert {
        return {
            id: `alert-${++this.alertIdCounter}-${Date.now()}`,
            timestamp: new Date(),
            isAcknowledged: false,
            ...params,
        };
    }

    /**
     * Obtiene todas las alertas activas
     */
    getActiveAlerts(): TrafficAlert[] {
        try {
            return this.alerts ? this.alerts.filter(a => !a.isAcknowledged) : [];
        } catch (error) {
            console.error('Error en getActiveAlerts:', error);
            return [];
        }
    }

    /**
     * Obtiene alertas filtradas por severidad
     */
    getAlertsBySeverity(severity: AlertSeverity): TrafficAlert[] {
        return this.alerts.filter(a => a.severity === severity && !a.isAcknowledged);
    }

    /**
     * Obtiene alertas de un polígono específico
     */
    getAlertsByPolygon(polygonId: string): TrafficAlert[] {
        return this.alerts.filter(a => a.polygonId === polygonId && !a.isAcknowledged);
    }

    /**
     * Marca una alerta como reconocida
     */
    acknowledgeAlert(alertId: string, acknowledgedBy?: string): boolean {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.isAcknowledged = true;
            alert.acknowledgedAt = new Date();
            alert.acknowledgedBy = acknowledgedBy;
            return true;
        }
        return false;
    }

    /**
     * Limpia alertas reconocidas antiguas (más de 1 hora)
     */
    cleanOldAlerts() {
        const oneHourAgo = Date.now() - 3600000;
        this.alerts = this.alerts.filter(a => {
            if (a.isAcknowledged && a.acknowledgedAt) {
                return a.acknowledgedAt.getTime() > oneHourAgo;
            }
            return true;
        });
    }

    /**
     * Obtiene estadísticas de alertas
     */
    getAlertStats() {
        try {
            const active = this.getActiveAlerts();
            const alerts = this.alerts || [];
            return {
                total: alerts.length,
                active: active.length,
                acknowledged: alerts.length - active.length,
                bySeverity: {
                    critical: active.filter(a => a.severity === AlertSeverity.CRITICAL).length,
                    high: active.filter(a => a.severity === AlertSeverity.HIGH).length,
                    medium: active.filter(a => a.severity === AlertSeverity.MEDIUM).length,
                    low: active.filter(a => a.severity === AlertSeverity.LOW).length,
                },
                byType: {
                    totalBlockage: active.filter(a => a.type === AlertType.TOTAL_BLOCKAGE).length,
                    excessiveDelay: active.filter(a => a.type === AlertType.EXCESSIVE_DELAY).length,
                    significantDelay: active.filter(a => a.type === AlertType.SIGNIFICANT_DELAY).length,
                    extensiveCongestion: active.filter(a => a.type === AlertType.EXTENSIVE_CONGESTION).length,
                    highUserImpact: active.filter(a => a.type === AlertType.HIGH_USER_IMPACT).length,
                },
            };
        } catch (error) {
            console.error('Error en getAlertStats:', error);
            return {
                total: 0,
                active: 0,
                acknowledged: 0,
                bySeverity: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                },
                byType: {
                    totalBlockage: 0,
                    excessiveDelay: 0,
                    significantDelay: 0,
                    extensiveCongestion: 0,
                    highUserImpact: 0,
                },
            };
        }
    }
}

export const alertService = new AlertService();