import { wazeService } from './wazeService';
import { REAL_POLYGONS } from '../config/realPolygons';
import { PolygonStatus, Severity } from '../types';

/**
 * Servicio API - VERSIÓN MULTI-FEED
 * Lógica de negocio para calcular estados y KPIs a partir de los datos raw.
 */
export class ApiService {

    /**
     * Obtiene el estado de todos los polígonos (66 en total) - OPTIMIZADO
     */
    getPolygonsStatus(): PolygonStatus[] {
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
     * Calcula KPIs Globales
     */
    getGlobalKPIs() {
        const polygons = this.getPolygonsStatus();
        const alerts = wazeService.getAlerts();

        const totalPolygons = polygons.length;
        const fluidPolygons = polygons.filter(p => p.state === 'low').length;
        const criticalPolygons = polygons.filter(p => p.state === 'high').length;

        const fluidityPercentage = totalPolygons > 0
            ? Math.round((fluidPolygons / totalPolygons) * 100)
            : 0;

        const activeConstructions = alerts.filter(a => a.type === 'construction').length;

        return {
            fluidityPercentage,
            activeIncidents: alerts.length,
            criticalPolygons,
            activeConstructions,
            trends: {
                fluidityChange: 0, // TODO: Implementar histórico
                incidentsChange: 0
            },
            lastUpdate: wazeService.getLastUpdate()
        };
    }
}

export const apiService = new ApiService();
