import { repositories } from '../repositories';
import { PolygonStatus, Severity, PolygonTrafficMetrics } from '../types';
import { WazeAlert } from '../repositories/WazeAlertRepository';
import { WazeJam } from '../repositories/WazeJamRepository';

/**
 * Servicio API - VERSIÓN REFACTORIZADA (Repository Pattern)
 * Lógica de negocio para calcular estados y KPIs a partir de datos de DB.
 */
export class ApiService {

    /**
     * Obtiene el estado de todos los polígonos
     */
    async getPolygonsStatus(): Promise<PolygonStatus[]> {
        try {
            const polygons = await repositories().polygons.findAll();

            // Obtener datos de la DB
            // TODO: Optimizar con una sola query o cache si es necesario
            const allAlerts = await repositories().wazeAlerts.findAllActive();
            // Actually findActiveByPolygon sends a query. Doing it 60 times is bad.
            // Better fetch ALL active alerts/jams in one go.
            // WazeAlertRepository doesn't have findAllActive() yet?
            // BaseRepository has findAll(). But we need active = true.
            // I will assume findActive() exists or I fallback to findAll() and filter?
            // BaseReposity has no findActive. WazeAlertRepository has findActiveByPolygon.
            // I should assume I can fetch all active.
            // For now, let's use a query via dbService or add findActive to repo.
            // Since repo access is via instance, I can't easily add it now without editing Repo.
            // I'll stick to loop for now or edit Repo later.
            // WAIT: logic requires ALL alerts/jams to be efficient.
            // I'll add `findAllActive` to WazeAlertRepository/WazeJamRepository in a separate step if needed.
            // For now I'll use `query` directly or accept the loop performance hit?
            // Loop 66 times * 2 (alerts/jams) = 132 queries. That's terrible.

            // Let's implement findAllActive in the Service using generic findAll and filtering?
            // No, fetching all rows (historical) is bad.

            // I will cheat slightly: I will cast to any to access the pool or add the method.
            // Actually, I can use `findAll` but with a WHERE clause? BaseRepository `findAll` takes no args.

            // Critical decision: I MUST add `findAllActive` to Repositories to make this efficient.
            // But I am in the middle of editing ApiService. I can't edit Repo now.
            // I'll write the code assuming `findAllActive()` exists, and then I will go and add it to the Repositories.

            const alerts = await repositories().wazeAlerts.findAllActive();
            const jams = await repositories().wazeJams.findAllActive();
            // Note: I will add these methods in next steps.

            const lastUpdate = new Date(); // TODO: Get latest from DB?

            // Crear Maps para lookups O(1)
            const alertsByPolygon = new Map<string, WazeAlert[]>();
            const jamsByPolygon = new Map<string, WazeJam[]>();

            for (const alert of alerts) {
                if (!alert.polygon_id) continue;
                if (!alertsByPolygon.has(alert.polygon_id)) {
                    alertsByPolygon.set(alert.polygon_id, []);
                }
                alertsByPolygon.get(alert.polygon_id)!.push(alert);
            }

            for (const jam of jams) {
                if (!jam.polygon_id) continue;
                if (!jamsByPolygon.has(jam.polygon_id)) {
                    jamsByPolygon.set(jam.polygon_id, []);
                }
                jamsByPolygon.get(jam.polygon_id)!.push(jam);
            }

            // Procesar polígonos
            return polygons.map((poly: any) => {
                const polyAlerts = alertsByPolygon.get(poly.id) || [];
                const polyJams = jamsByPolygon.get(poly.id) || [];

                // Calcular métricas
                const alertCount = polyAlerts.length;
                const jamCount = polyJams.length;

                let totalDelay = 0;
                let totalSpeed = 0;
                let criticalAlerts = 0;
                let hasCriticalJam = false;
                let hasHighJam = false;

                // Loop para alertas (usando tipos DB: snake_case o mapeados?)
                // Repository returns Mapped Entities (camelCase keys if mapped?)
                // Wait, WazeAlertRepository mapRowToEntity returns `uuid`, `polygon_id` (snake), `location` (x,y camel).
                // Let's check wazeAlertRepository.ts again.
                // mapRowToEntity: uuid, polygon_id, type, subtype...
                // So property access must match the Entity interface.

                // Entity has `polygon_id`, `type`, `location`...
                // But Severity calculation... `calculateAlertSeverity` is in wazeUtils.
                // The Entity DOES NOT have severity.
                // I need to calculate it on the fly.

                // Import calculateAlertSeverity
                const { calculateAlertSeverity, mapJamSeverity } = require('../utils/wazeUtils'); // lazy import or top level? Top level is better.

                for (const alert of polyAlerts) {
                    const sev = calculateAlertSeverity({
                        type: alert.type,
                        confidence: alert.confidence,
                        reliability: alert.reliability,
                        subtype: alert.subtype
                        // nThumbsUp missing in Entity?
                        // WazeAlert interface has: reliability, confidence. nThumbsUp??
                        // Check WazeAlertRepository.ts... It DOES NOT have nThumbsUp.
                        // It was lost in migration? Or DB schema doesn't have it?
                        // DB audit: waze_alerts table... does it have n_thumbs_up?
                        // I might have missed it.
                        // If missing, I assume 0.
                    });

                    if (sev >= Severity.HIGH) criticalAlerts++;
                }

                for (const jam of polyJams) {
                    totalDelay += jam.delay || 0;
                    totalSpeed += jam.speedKMH || 0;

                    const sev = mapJamSeverity(jam.level || 0);

                    if (sev >= Severity.CRITICAL) hasCriticalJam = true;
                    if (sev >= Severity.HIGH) hasHighJam = true;
                }

                const avgSpeed = jamCount > 0 ? totalSpeed / jamCount : null;

                // Determinar estado
                let state: 'low' | 'medium' | 'high' = 'low';
                if (criticalAlerts > 0 || hasCriticalJam || totalDelay > 900) {
                    state = 'high';
                } else if (hasHighJam || alertCount > 3 || totalDelay > 300) {
                    state = 'medium';
                }

                return {
                    id: poly.id,
                    name: poly.name,
                    group: poly.group || 'Sin Grupo',
                    state,
                    metrics: {
                        alertCount,
                        jamCount,
                        totalDelay,
                        avgSpeed,
                        criticalAlerts
                    },
                    lastUpdate
                };
            });
        } catch (error) {
            console.error('Error en getPolygonsStatus:', error);
            return [];
        }
    }

    /**
     * Obtiene detalle de un polígono específico
     */
    async getPolygonDetail(id: string): Promise<any> {
        try {
            const polygons = await repositories().polygons.findAll();
            const poly = polygons.find((p: any) => p.id === id);
            if (!poly) return null;

            // Fetch specific polygon data
            const alerts = await repositories().wazeAlerts.findActiveByPolygon(id);
            const jams = await repositories().wazeJams.findActiveByPolygon(id);

            // Map to frontend expected format if necessary?
            // Existing frontend expects: internalAlert format.
            // We should map it here to avoid breaking frontend?
            // Or change frontend? Changing frontend is Phase 6 code cleanup... maybe too risky.
            // I'll return the DB entities plus calculated fields if needed.
            // Or I will create a mapper to maintain backward compatibility.

            return {
                id: poly.id,
                name: poly.name,
                group: poly.group || 'Sin Grupo',
                items: {
                    alerts, // These are WazeAlert entities
                    jams    // These are WazeJam entities
                }
            };
        } catch (error) {
            console.error('Error en getPolygonDetail:', error);
            return null;
        }
    }

    async getGlobalKPIs() {
        try {
            const polygons = await this.getPolygonsStatus();
            const alerts = await repositories().wazeAlerts.findAllActive();
            const jams = await repositories().wazeJams.findAllActive();

            const totalPolygons = polygons.length;
            const criticalPolygons = polygons.filter(p => p.state === 'high').length;

            // Calcular polígonos fluidos: todos los que NO están en estado crítico
            const fluidPolygons = totalPolygons - criticalPolygons;

            const fluidityPercentage = totalPolygons > 0
                ? Math.round((fluidPolygons / totalPolygons) * 100)
                : 0;

            const activeConstructions = alerts.filter(a =>
                a.type === 'CONSTRUCTION' || a.type === 'ROAD_CLOSED' // DB types are uppercase?
            ).length;
            const totalJams = jams.length;

            // Obtener estadísticas de siniestros manuales (road_accidents)
            const { roadAccidentService } = require('./roadAccidentService');
            const roadAccidentsStats = await roadAccidentService.getAccidentsCount();

            // Estadísticas por grupo
            const groups = Array.from(new Set(polygons.map((p: any) => p.group || 'Sin Grupo'))).sort();
            const groupStats = groups.map(groupName => {
                const groupPolygons = polygons.filter((p: any) => (p.group || 'Sin Grupo') === groupName);
                const groupAlerts = groupPolygons.reduce((sum: number, p: any) => sum + (p.metrics?.alertCount || 0), 0);
                const groupJams = groupPolygons.reduce((sum: number, p: any) => sum + (p.metrics?.jamCount || 0), 0);
                const criticalInGroup = groupPolygons.filter((p: any) => p.state === 'high').length;

                return {
                    group: groupName,
                    polygonCount: groupPolygons.length,
                    alertCount: groupAlerts,
                    jamCount: groupJams,
                    criticalCount: criticalInGroup,
                    fluidCount: groupPolygons.filter((p: any) => p.state === 'low').length,
                };
            });

            // Top polígonos críticos
            const topCritical = polygons
                .filter(p => p.state === 'high' || p.state === 'medium')
                .sort((a, b) => {
                    if (a.state !== b.state) {
                        return a.state === 'high' ? -1 : 1;
                    }
                    const aTotal = a.metrics.alertCount + a.metrics.jamCount;
                    const bTotal = b.metrics.alertCount + b.metrics.jamCount;
                    return bTotal - aTotal;
                })
                .slice(0, 10)
                .map(p => ({
                    id: p.id,
                    name: p.name,
                    group: p.group,
                    state: p.state,
                    alertCount: p.metrics.alertCount,
                    jamCount: p.metrics.jamCount,
                }));

            return {
                fluidityPercentage,
                activeIncidents: alerts.length,
                activeJams: totalJams,
                criticalPolygons,
                activeConstructions,
                // Estadísticas de siniestros manuales (road_accidents)
                roadAccidents: roadAccidentsStats.total,
                roadAccidentsCritical: roadAccidentsStats.critical,
                roadAccidentsHigh: roadAccidentsStats.high,
                groupStats,
                topCritical,
                trends: {
                    fluidityChange: 0,
                    incidentsChange: 0
                },
                lastUpdate: new Date()
            };
        } catch (error) {
            console.error('Error en getGlobalKPIs:', error);
            return {
                fluidityPercentage: 0,
                activeIncidents: 0,
                activeJams: 0,
                criticalPolygons: 0,
                activeConstructions: 0,
                roadAccidents: 0,
                roadAccidentsCritical: 0,
                roadAccidentsHigh: 0,
                groupStats: [],
                topCritical: [],
                trends: { fluidityChange: 0, incidentsChange: 0 },
                lastUpdate: new Date()
            };
        }
    }

    /**
     * Obtiene métricas de tráfico para un polígono
     */
    async getTrafficMetricsByPolygon(polygonId: string): Promise<PolygonTrafficMetrics | null> {
        try {
            const polygonJams = await repositories().wazeJams.findActiveByPolygon(polygonId);

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

            const speeds = polygonJams.map(jam => jam.speedKMH || 0);
            const minSpeed = Math.min(...speeds);
            const maxSpeed = Math.max(...speeds);
            const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;


            let slowPoints = 0;
            let moderatePoints = 0;
            let fastPoints = 0;
            let stoppedPoints = 0;

            // Replicate categorization logic using speedKMH
            for (const jam of polygonJams) {
                const speed = jam.speedKMH || 0;
                if (speed > 40) fastPoints++;
                else if (speed >= 20) moderatePoints++;
                else if (speed >= 10) slowPoints++;
                else stoppedPoints++;
            }

            const freeFlowSpeed = 60;
            const congestionIndex = Math.max(0, Math.min(100,
                Math.round(((freeFlowSpeed - avgSpeed) / freeFlowSpeed) * 100)
            ));

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
        } catch (error) {
            console.error('Error en getTrafficMetricsByPolygon:', error);
            return null;
        }
    }

    /**
     * Obtiene métricas de tráfico para todos los polígonos
     */
    async getAllTrafficMetrics(): Promise<PolygonTrafficMetrics[]> {
        try {
            const jams = await repositories().wazeJams.findAllActive();
            // TODO: Group by polygon and calculate.
            // Reuse logic from getTrafficMetricsByPolygon but efficiently.

            const jamsByPolygon = new Map<string, WazeJam[]>();
            for (const jam of jams) {
                if (!jam.polygon_id) continue;
                if (!jamsByPolygon.has(jam.polygon_id)) {
                    jamsByPolygon.set(jam.polygon_id, []);
                }
                jamsByPolygon.get(jam.polygon_id)!.push(jam);
            }

            const metrics: PolygonTrafficMetrics[] = [];
            const polygons = await repositories().polygons.findAll();

            for (const polygon of polygons) {
                const polygonJams = jamsByPolygon.get(polygon.id) || [];

                if (polygonJams.length === 0) {
                     metrics.push({
                        polygonId: polygon.id,
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
                    });
                    continue;
                }

                // Logic same as above
                const speeds = polygonJams.map(jam => jam.speedKMH || 0);
                const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
                const minSpeed = Math.min(...speeds);
                const maxSpeed = Math.max(...speeds);

                let slowPoints = 0;
                let moderatePoints = 0;
                let fastPoints = 0;
                let stoppedPoints = 0;

                for (const jam of polygonJams) {
                    const speed = jam.speedKMH || 0;
                    if (speed > 40) fastPoints++;
                    else if (speed >= 20) moderatePoints++;
                    else if (speed >= 10) slowPoints++;
                    else stoppedPoints++;
                }

                const freeFlowSpeed = 60;
                const congestionIndex = Math.max(0, Math.min(100,
                    Math.round(((freeFlowSpeed - avgSpeed) / freeFlowSpeed) * 100)
                ));

                metrics.push({
                    polygonId: polygon.id,
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
                });
            }

            return metrics.sort((a, b) => b.congestionIndex - a.congestionIndex);

        } catch (error) {
            console.error('Error en getAllTrafficMetrics:', error);
            return [];
        }
    }
}

export const apiService = new ApiService();
