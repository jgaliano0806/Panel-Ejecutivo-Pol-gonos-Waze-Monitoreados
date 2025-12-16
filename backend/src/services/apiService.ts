import { wazeService } from './wazeService';
import { REAL_POLYGONS, getAllGroups } from '../config/realPolygons';
import { PolygonStatus, Severity, PolygonTrafficMetrics } from '../types';

/**
 * Servicio API - VERSIÓN MULTI-FEED
 * Lógica de negocio para calcular estados y KPIs a partir de los datos raw.
 */
export class ApiService {

    /**
     * Obtiene el estado de todos los polígonos (66 en total) - OPTIMIZADO
     */
    getPolygonsStatus(): PolygonStatus[] {
        try {
            const polygons = REAL_POLYGONS;
            const alerts = wazeService.getAlerts();
            const jams = wazeService.getJams();
            const lastUpdate = wazeService.getLastUpdate();

            // Crear Maps para lookups O(1) en lugar de filter O(n)
            const alertsByPolygon = new Map<string, typeof alerts>();
            const jamsByPolygon = new Map<string, typeof jams>();

            // Agrupar una sola vez, filtrando los que tienen polygonId válido
            for (const alert of alerts) {
                if (!alert.polygonId) continue; // Skip si no tiene polygonId
                if (!alertsByPolygon.has(alert.polygonId)) {
                    alertsByPolygon.set(alert.polygonId, []);
                }
                alertsByPolygon.get(alert.polygonId)!.push(alert);
            }

            for (const jam of jams) {
                if (!jam.polygonId) continue; // Skip si no tiene polygonId
                if (!jamsByPolygon.has(jam.polygonId)) {
                    jamsByPolygon.set(jam.polygonId, []);
                }
                jamsByPolygon.get(jam.polygonId)!.push(jam);
            }

            // Procesar polígonos
            return polygons.map(poly => {
                const polyAlerts = alertsByPolygon.get(poly.id) || [];
                const polyJams = jamsByPolygon.get(poly.id) || [];

                // Calcular métricas de forma eficiente
                const alertCount = polyAlerts.length;
                const jamCount = polyJams.length;

                let totalDelay = 0;
                let totalSpeed = 0;
                let criticalAlerts = 0;
                let hasCriticalJam = false;
                let hasHighJam = false;

                // Un solo loop para alertas
                for (const alert of polyAlerts) {
                    if (alert.severity >= Severity.HIGH) criticalAlerts++;
                }

                // Un solo loop para jams
                for (const jam of polyJams) {
                    totalDelay += jam.delay;
                    totalSpeed += jam.speed;
                    if (jam.severity >= Severity.CRITICAL) hasCriticalJam = true;
                    if (jam.severity >= Severity.HIGH) hasHighJam = true;
                }

                const avgSpeed = jamCount > 0 ? totalSpeed / jamCount : null;

                // Determinar estado (Semaforización)
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
            // Retornar array vacío en caso de error para evitar romper el frontend
            return [];
        }
    }

    /**
     * Obtiene detalle de un polígono específico
     */
    getPolygonDetail(id: string) {
        const statusList = this.getPolygonsStatus();
        const status = statusList.find(p => p.id === id);

        if (!status) return null;

        const alerts = wazeService.getAlerts().filter(a => a.polygonId === id);
        const jams = wazeService.getJams().filter(j => j.polygonId === id);

        return {
            ...status,
            items: {
                alerts,
                jams
            }
        };
    }

    /**
     * Calcula KPIs Globales con estadísticas por grupo
     */
    getGlobalKPIs() {
        try {
            const polygons = this.getPolygonsStatus();
            const alerts = wazeService.getAlerts();
            const jams = wazeService.getJams();

            const totalPolygons = polygons.length;
            const fluidPolygons = polygons.filter(p => p.state === 'low').length;
            const criticalPolygons = polygons.filter(p => p.state === 'high').length;

            const fluidityPercentage = totalPolygons > 0
                ? Math.round((fluidPolygons / totalPolygons) * 100)
                : 0;

            const activeConstructions = alerts.filter(a =>
                a.type === 'construction' || a.type === 'roadclosed'
            ).length;
            const totalJams = jams.length;

            // Estadísticas por grupo
            const groups = getAllGroups();
            const groupStats = groups.map(groupName => {
                const groupPolygons = polygons.filter(p => p.group === groupName);
                const groupAlerts = groupPolygons.reduce((sum, p) => sum + p.metrics.alertCount, 0);
                const groupJams = groupPolygons.reduce((sum, p) => sum + p.metrics.jamCount, 0);
                const criticalInGroup = groupPolygons.filter(p => p.state === 'high').length;

                return {
                    group: groupName,
                    polygonCount: groupPolygons.length,
                    alertCount: groupAlerts,
                    jamCount: groupJams,
                    criticalCount: criticalInGroup,
                    fluidCount: groupPolygons.filter(p => p.state === 'low').length,
                };
            });

            // Top polígonos críticos
            const topCritical = polygons
                .filter(p => p.state === 'high' || p.state === 'medium')
                .sort((a, b) => {
                    // Ordenar por: estado (high > medium), luego por alertas + jams
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
                groupStats,
                topCritical,
                trends: {
                    fluidityChange: 0, // TODO: Implementar histórico
                    incidentsChange: 0
                },
                lastUpdate: wazeService.getLastUpdate()
            };
        } catch (error) {
            console.error('Error en getGlobalKPIs:', error);
            // Retornar KPIs por defecto en caso de error
            return {
                fluidityPercentage: 0,
                activeIncidents: 0,
                activeJams: 0,
                criticalPolygons: 0,
                activeConstructions: 0,
                groupStats: [],
                topCritical: [],
                trends: {
                    fluidityChange: 0,
                    incidentsChange: 0
                },
                lastUpdate: new Date()
            };
        }
    }

    /**
     * Obtiene métricas de tráfico para un polígono específico
     */
    getTrafficMetricsByPolygon(polygonId: string): PolygonTrafficMetrics | null {
        const jams = wazeService.getJams();
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
                lastUpdate: wazeService.getLastUpdate()
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
            if (jam.speed > 40) fastPoints++;
            else if (jam.speed >= 20) moderatePoints++;
            else if (jam.speed >= 10) slowPoints++;
            else stoppedPoints++;
        }

        // Calcular índice de congestión
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
            lastUpdate: wazeService.getLastUpdate()
        };
    }

    /**
     * Obtiene métricas de tráfico para todos los polígonos
     */
    getAllTrafficMetrics(): PolygonTrafficMetrics[] {
        const jams = wazeService.getJams();

        // Agrupar jams por polígono usando Map para O(1)
        const jamsByPolygon = new Map<string, typeof jams>();

        for (const jam of jams) {
            if (!jam.polygonId) continue;
            if (!jamsByPolygon.has(jam.polygonId)) {
                jamsByPolygon.set(jam.polygonId, []);
            }
            jamsByPolygon.get(jam.polygonId)!.push(jam);
        }

        // Calcular métricas para cada polígono
        const metrics: PolygonTrafficMetrics[] = [];

        for (const polygon of REAL_POLYGONS) {
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
                    lastUpdate: wazeService.getLastUpdate()
                });
                continue;
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
                if (jam.speed > 40) fastPoints++;
                else if (jam.speed >= 20) moderatePoints++;
                else if (jam.speed >= 10) slowPoints++;
                else stoppedPoints++;
            }

            // Calcular índice de congestión
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
                lastUpdate: wazeService.getLastUpdate()
            });
        }

        // Ordenar por congestionIndex descendente
        return metrics.sort((a, b) => b.congestionIndex - a.congestionIndex);
    }
}

export const apiService = new ApiService();