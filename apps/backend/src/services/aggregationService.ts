import { PolygonTrafficMetrics } from '../types';
import { REAL_POLYGONS, getAllGroups } from '../config/realPolygons';
import { WazeJam } from '../repositories/WazeJamRepository';
import { WazeAlert } from '../repositories/WazeAlertRepository';

/**
 * Servicio de Agregación de Métricas Multi-Polígono
 * Calcula KPIs globales y por grupo
 */

export interface GlobalTrafficMetrics {
    timestamp: Date;
    totalJams: number;
    totalIncidents: number;
    totalLength: number; // metros
    criticalLength: number; // metros
    avgSpeed: number | null;
    avgDelay: number;
    affectedPolygons: number;
    criticalPolygons: number;
    groupMetrics: GroupMetrics[];
}

export interface GroupMetrics {
    groupName: string;
    totalJams: number;
    totalIncidents: number;
    avgSpeed: number | null;
    avgDelay: number;
    criticalKm: number;
    totalKm: number;
    polygonCount: number;
    criticalPolygonCount: number;
    worstPolygon: WorstPolygonInfo | null;
    bestPolygon: BestPolygonInfo | null;
}

export interface WorstPolygonInfo {
    id: string;
    name: string;
    congestionIndex: number;
    avgSpeed: number;
    jamsCount: number;
}

export interface BestPolygonInfo {
    id: string;
    name: string;
    congestionIndex: number;
    avgSpeed: number;
    jamsCount: number;
}

export interface TopCriticalPolygon {
    id: string;
    name: string;
    group: string;
    criticalKm: number;
    totalJams: number;
    avgSpeed: number;
    avgDelay: number;
    incidentsCount: number;
}

export class AggregationService {
    /**
     * Calcula métricas globales de todo el sistema
     */
    calculateGlobalMetrics(
        jams: WazeJam[],
        incidents: WazeAlert[],
        trafficMetrics: PolygonTrafficMetrics[]
    ): GlobalTrafficMetrics {
        // Métricas de jams
        const totalLength = jams.reduce((sum, j) => sum + (j.length || 0), 0);
        const criticalJams = jams.filter(j => j.level && j.level >= 4);
        const criticalLength = criticalJams.reduce((sum, j) => sum + (j.length || 0), 0);

        // Velocidad promedio
        const jamsWithSpeed = jams.filter(j => (j.speedKMH || 0) > 0);
        const avgSpeed = jamsWithSpeed.length > 0
            ? jamsWithSpeed.reduce((sum, j) => sum + (j.speedKMH || 0), 0) / jamsWithSpeed.length
            : null;

        // Delay promedio
        const avgDelay = jams.length > 0
            ? jams.reduce((sum, j) => sum + (j.delay || 0), 0) / jams.length
            : 0;

        // Polígonos afectados
        const polygonsWithJams = new Set(jams.map(j => j.polygon_id).filter(Boolean));
        const affectedPolygons = polygonsWithJams.size;

        // Polígonos críticos (más de 1 km en estado crítico)
        const criticalPolygonIds = new Set<string>();
        for (const metric of trafficMetrics) {
            // Note: calculateCriticalKm now expects WazeJam[]
            // We need to filter jams for this polygon
            const polygonJams = jams.filter(j => j.polygon_id === metric.polygonId);
            const criticalKm = this.calculateCriticalKm(polygonJams);
            if (criticalKm >= 1.0) {
                criticalPolygonIds.add(metric.polygonId);
            }
        }

        // Métricas por grupo
        const groupMetrics = this.calculateGroupMetrics(jams, incidents, trafficMetrics);

        return {
            timestamp: new Date(),
            totalJams: jams.length,
            totalIncidents: incidents.length,
            totalLength,
            criticalLength,
            avgSpeed: avgSpeed ? Math.round(avgSpeed) : null,
            avgDelay: Math.round(avgDelay),
            affectedPolygons,
            criticalPolygons: criticalPolygonIds.size,
            groupMetrics,
        };
    }

    /**
     * Calcula métricas por grupo
     */
    private calculateGroupMetrics(
        jams: WazeJam[],
        incidents: WazeAlert[],
        trafficMetrics: PolygonTrafficMetrics[]
    ): GroupMetrics[] {
        const groups = getAllGroups();
        const groupMetrics: GroupMetrics[] = [];

        for (const groupName of groups) {
            const groupPolygons = REAL_POLYGONS.filter(p => p.group === groupName);
            const groupPolygonIds = groupPolygons.map(p => p.id);

            // Filtrar datos del grupo
            const groupJams = jams.filter(j => groupPolygonIds.includes(j.polygon_id || ''));
            const groupIncidents = incidents.filter(i => groupPolygonIds.includes(i.polygon_id || ''));
            // trafficMetrics uses camelCase polygonId
            const groupTrafficMetrics = trafficMetrics.filter(m => groupPolygonIds.includes(m.polygonId));

            // Calcular velocidad promedio del grupo
            const jamsWithSpeed = groupJams.filter(j => (j.speedKMH || 0) > 0);
            const avgSpeed = jamsWithSpeed.length > 0
                ? jamsWithSpeed.reduce((sum, j) => sum + (j.speedKMH || 0), 0) / jamsWithSpeed.length
                : null;

            // Delay promedio
            const avgDelay = groupJams.length > 0
                ? groupJams.reduce((sum, j) => sum + (j.delay || 0), 0) / groupJams.length
                : 0;

            // Km críticos y totales
            let totalKm = 0;
            let criticalKm = 0;
            let criticalPolygonCount = 0;

            for (const polygonId of groupPolygonIds) {
                const polygonJams = groupJams.filter(j => j.polygon_id === polygonId);
                const polyTotalKm = polygonJams.reduce((sum, j) => sum + (j.length || 0), 0) / 1000;
                const polyCriticalKm = this.calculateCriticalKm(polygonJams);

                totalKm += polyTotalKm;
                criticalKm += polyCriticalKm;

                if (polyCriticalKm >= 1.0) {
                    criticalPolygonCount++;
                }
            }

            // Encontrar peor y mejor polígono
            const worstPolygon = this.findWorstPolygon(groupPolygonIds, groupTrafficMetrics);
            const bestPolygon = this.findBestPolygon(groupPolygonIds, groupTrafficMetrics);

            groupMetrics.push({
                groupName,
                totalJams: groupJams.length,
                totalIncidents: groupIncidents.length,
                avgSpeed: avgSpeed ? Math.round(avgSpeed) : null,
                avgDelay: Math.round(avgDelay),
                criticalKm: Number(criticalKm.toFixed(2)),
                totalKm: Number(totalKm.toFixed(2)),
                polygonCount: groupPolygons.length,
                criticalPolygonCount,
                worstPolygon,
                bestPolygon,
            });
        }

        // Ordenar por km críticos descendente
        return groupMetrics.sort((a, b) => b.criticalKm - a.criticalKm);
    }

    /**
     * Encuentra los polígonos más críticos
     */
    getTopCriticalPolygons(
        jams: WazeJam[],
        incidents: WazeAlert[],
        limit: number = 10
    ): TopCriticalPolygon[] {
        const polygonScores: TopCriticalPolygon[] = [];

        for (const polygon of REAL_POLYGONS) {
            const polygonJams = jams.filter(j => j.polygon_id === polygon.id);
            const polygonIncidents = incidents.filter(i => i.polygon_id === polygon.id);

            if (polygonJams.length === 0) continue;

            const criticalKm = this.calculateCriticalKm(polygonJams);
            const jamsWithSpeed = polygonJams.filter(j => (j.speedKMH || 0) > 0);
            const avgSpeed = jamsWithSpeed.length > 0
                ? jamsWithSpeed.reduce((sum, j) => sum + (j.speedKMH || 0), 0) / jamsWithSpeed.length
                : 0;
            const avgDelay = polygonJams.reduce((sum, j) => sum + (j.delay || 0), 0) / polygonJams.length;

            polygonScores.push({
                id: polygon.id,
                name: polygon.name,
                group: polygon.group || 'Sin grupo',
                criticalKm,
                totalJams: polygonJams.length,
                avgSpeed: Math.round(avgSpeed),
                avgDelay: Math.round(avgDelay),
                incidentsCount: polygonIncidents.length,
            });
        }

        // Ordenar por km críticos descendente
        return polygonScores.sort((a, b) => b.criticalKm - a.criticalKm).slice(0, limit);
    }

    /**
     * Calcula kilómetros en estado crítico (jamLevel >= 4)
     */
    private calculateCriticalKm(jams: WazeJam[]): number {
        const criticalJams = jams.filter(j => j.level && j.level >= 4);
        const criticalLength = criticalJams.reduce((sum, j) => sum + (j.length || 0), 0);
        return criticalLength / 1000;
    }

    /**
     * Encuentra el peor polígono del grupo
     */
    private findWorstPolygon(
        polygonIds: string[],
        trafficMetrics: PolygonTrafficMetrics[]
    ): WorstPolygonInfo | null {
        let worstPolygon: WorstPolygonInfo | null = null;
        let maxCongestionIndex = -1;

        for (const polygonId of polygonIds) {
            const metric = trafficMetrics.find(m => m.polygonId === polygonId);
            if (!metric || metric.totalJams === 0) continue;

            if (metric.congestionIndex > maxCongestionIndex) {
                maxCongestionIndex = metric.congestionIndex;
                const polygon = REAL_POLYGONS.find(p => p.id === polygonId);
                worstPolygon = {
                    id: polygonId,
                    name: polygon?.name || polygonId,
                    congestionIndex: metric.congestionIndex,
                    avgSpeed: metric.avgSpeed || 0,
                    jamsCount: metric.totalJams,
                };
            }
        }

        return worstPolygon;
    }

    /**
     * Encuentra el mejor polígono del grupo
     */
    private findBestPolygon(
        polygonIds: string[],
        trafficMetrics: PolygonTrafficMetrics[]
    ): BestPolygonInfo | null {
        let bestPolygon: BestPolygonInfo | null = null;
        let minCongestionIndex = Infinity;

        for (const polygonId of polygonIds) {
            const metric = trafficMetrics.find(m => m.polygonId === polygonId);
            if (!metric || metric.totalJams === 0) continue;

            if (metric.congestionIndex < minCongestionIndex) {
                minCongestionIndex = metric.congestionIndex;
                const polygon = REAL_POLYGONS.find(p => p.id === polygonId);
                bestPolygon = {
                    id: polygonId,
                    name: polygon?.name || polygonId,
                    congestionIndex: metric.congestionIndex,
                    avgSpeed: metric.avgSpeed || 0,
                    jamsCount: metric.totalJams,
                };
            }
        }

        return bestPolygon;
    }
}

export const aggregationService = new AggregationService();
