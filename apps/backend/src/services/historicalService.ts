import { HistoricalSnapshot, TrendData, InternalJam, InternalAlert } from '../types';
import { REAL_POLYGONS } from '../config/realPolygons';
import { dbService } from '../database/dbService';

/**
 * Servicio de Histórico de Datos con PostgreSQL
 * Almacena snapshots cada hora y provee análisis de tendencias
 */
export class HistoricalService {
    private readonly maxSnapshots = 168; // 7 días × 24 horas

    constructor() {
        // Verificar conexión a la base de datos al inicializar
        this.initializeDatabase();
    }

    /**
     * Inicializa la base de datos (crea tablas si no existen)
     */
    private async initializeDatabase() {
        try {
            await dbService.testConnection();
            await dbService.initializeSchema();
            console.log('✅ Base de datos histórica inicializada');
        } catch (error) {
            console.error('❌ Error inicializando base de datos:', error);
            // Continuar sin base de datos (modo fallback)
        }
    }

    /**
     * Crea un snapshot global del sistema
     */
    async createGlobalSnapshot(jams: InternalJam[], incidents: InternalAlert[]): Promise<HistoricalSnapshot> {
        // Calcular métricas
        const criticalJams = jams.filter(j => j.level && j.level >= 4);
        const criticalLength = criticalJams.reduce((sum, j) => sum + j.length, 0);

        const jamsWithSpeed = jams.filter(j => j.speed > 0);
        const avgSpeed = jamsWithSpeed.length > 0
            ? jamsWithSpeed.reduce((sum, j) => sum + j.speed, 0) / jamsWithSpeed.length
            : null;

        const avgDelay = jams.length > 0
            ? jams.reduce((sum, j) => sum + j.delay, 0) / jams.length
            : 0;

        const affectedPolygons = new Set(jams.map(j => j.polygonId).filter(Boolean)).size;
        const criticalPolygons = this.countCriticalPolygons(jams);

        const snapshot: HistoricalSnapshot = {
            timestamp: new Date(),
            totalJams: jams.length,
            totalIncidents: incidents.length,
            avgSpeed: avgSpeed ? Math.round(avgSpeed) : null,
            avgDelay: Math.round(avgDelay),
            criticalKm: Number((criticalLength / 1000).toFixed(2)),
            affectedPolygons,
            criticalPolygons,
        };

        // Guardar en base de datos
        try {
            await dbService.query(
                `INSERT INTO historical_snapshots
                (timestamp, total_jams, total_incidents, avg_speed, avg_delay, critical_km, affected_polygons, critical_polygons)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    snapshot.timestamp,
                    snapshot.totalJams,
                    snapshot.totalIncidents,
                    snapshot.avgSpeed,
                    snapshot.avgDelay,
                    snapshot.criticalKm,
                    snapshot.affectedPolygons,
                    snapshot.criticalPolygons,
                ]
            );

            // Limpiar snapshots antiguos (más de 7 días)
            await this.cleanupOldSnapshots();
        } catch (error) {
            console.error('❌ Error guardando snapshot global:', error);
        }

        return snapshot;
    }

    /**
     * Crea snapshots para cada polígono
     */
    async createPolygonSnapshots(jams: InternalJam[], incidents: InternalAlert[]) {
        for (const polygon of REAL_POLYGONS) {
            const polygonJams = jams.filter(j => j.polygonId === polygon.id);
            const polygonIncidents = incidents.filter(i => i.polygonId === polygon.id);

            if (polygonJams.length === 0) continue;

            const criticalJams = polygonJams.filter(j => j.level && j.level >= 4);
            const criticalLength = criticalJams.reduce((sum, j) => sum + j.length, 0);

            const jamsWithSpeed = polygonJams.filter(j => j.speed > 0);
            const avgSpeed = jamsWithSpeed.length > 0
                ? polygonJams.reduce((sum, j) => sum + j.speed, 0) / jamsWithSpeed.length
                : null;

            const avgDelay = polygonJams.reduce((sum, j) => sum + j.delay, 0) / polygonJams.length;

            const snapshot: HistoricalSnapshot = {
                timestamp: new Date(),
                totalJams: polygonJams.length,
                totalIncidents: polygonIncidents.length,
                avgSpeed: avgSpeed ? Math.round(avgSpeed) : null,
                avgDelay: Math.round(avgDelay),
                criticalKm: Number((criticalLength / 1000).toFixed(2)),
                affectedPolygons: 1,
                criticalPolygons: criticalLength >= 1000 ? 1 : 0,
            };

            // Guardar en base de datos
            try {
                await dbService.query(
                    `INSERT INTO polygon_snapshots
                    (polygon_id, timestamp, total_jams, total_incidents, avg_speed, avg_delay, critical_km, affected_polygons, critical_polygons)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        polygon.id,
                        snapshot.timestamp,
                        snapshot.totalJams,
                        snapshot.totalIncidents,
                        snapshot.avgSpeed,
                        snapshot.avgDelay,
                        snapshot.criticalKm,
                        snapshot.affectedPolygons,
                        snapshot.criticalPolygons,
                    ]
                );
            } catch (error) {
                console.error(`❌ Error guardando snapshot del polígono ${polygon.id}:`, error);
            }
        }
    }

    /**
     * Guarda snapshots completos (global + polígonos)
     */
    async saveCurrentState(jams: InternalJam[], incidents: InternalAlert[]) {
        await this.createGlobalSnapshot(jams, incidents);
        await this.createPolygonSnapshots(jams, incidents);
        console.log(`📸 Snapshot guardado: ${new Date().toISOString()}`);
    }

    /**
     * Obtiene snapshots globales
     */
    async getGlobalSnapshots(hours: number = 24): Promise<HistoricalSnapshot[]> {
        try {
            const cutoff = new Date(Date.now() - (hours * 3600000));
            const result = await dbService.query<HistoricalSnapshot>(
                `SELECT
                    timestamp,
                    total_jams as "totalJams",
                    total_incidents as "totalIncidents",
                    avg_speed as "avgSpeed",
                    avg_delay as "avgDelay",
                    critical_km as "criticalKm",
                    affected_polygons as "affectedPolygons",
                    critical_polygons as "criticalPolygons"
                FROM historical_snapshots
                WHERE timestamp > $1
                ORDER BY timestamp DESC
                LIMIT $2`,
                [cutoff, this.maxSnapshots]
            );

            return result.rows.map((row) => ({
                ...row,
                timestamp: new Date(row.timestamp),
            }));
        } catch (error) {
            console.error('❌ Error obteniendo snapshots globales:', error);
            return [];
        }
    }

    /**
     * Obtiene snapshots de un polígono
     */
    async getPolygonSnapshots(polygonId: string, hours: number = 24): Promise<HistoricalSnapshot[]> {
        try {
            const cutoff = new Date(Date.now() - (hours * 3600000));
            const result = await dbService.query<HistoricalSnapshot>(
                `SELECT
                    timestamp,
                    total_jams as "totalJams",
                    total_incidents as "totalIncidents",
                    avg_speed as "avgSpeed",
                    avg_delay as "avgDelay",
                    critical_km as "criticalKm",
                    affected_polygons as "affectedPolygons",
                    critical_polygons as "criticalPolygons"
                FROM polygon_snapshots
                WHERE polygon_id = $1 AND timestamp > $2
                ORDER BY timestamp DESC
                LIMIT $3`,
                [polygonId, cutoff, this.maxSnapshots]
            );

            return result.rows.map((row) => ({
                ...row,
                timestamp: new Date(row.timestamp),
            }));
        } catch (error) {
            console.error(`❌ Error obteniendo snapshots del polígono ${polygonId}:`, error);
            return [];
        }
    }

    /**
     * Calcula tendencias comparando periodos
     */
    async calculateTrends(metric: 'totalJams' | 'avgSpeed' | 'criticalKm' | 'avgDelay'): Promise<TrendData> {
        try {
            const now = Date.now();
            const hourAgo = new Date(now - 3600000);
            const dayAgo = new Date(now - 86400000);
            const weekAgo = new Date(now - 604800000);

            // Mapear nombre de métrica a columna SQL
            const metricMap: Record<string, string> = {
                totalJams: 'total_jams',
                avgSpeed: 'avg_speed',
                criticalKm: 'critical_km',
                avgDelay: 'avg_delay',
            };

            const column = metricMap[metric] || 'total_jams';

            // Obtener valor actual
            const currentResult = await dbService.query<{ value: number }>(
                `SELECT ${column} as value
                FROM historical_snapshots
                ORDER BY timestamp DESC
                LIMIT 1`
            );

            const current = currentResult.rows[0]?.value || 0;

            // Obtener valores históricos
            const hourAgoResult = await dbService.query<{ value: number }>(
                `SELECT ${column} as value
                FROM historical_snapshots
                WHERE timestamp <= $1
                ORDER BY timestamp DESC
                LIMIT 1`,
                [hourAgo]
            );

            const dayAgoResult = await dbService.query<{ value: number }>(
                `SELECT ${column} as value
                FROM historical_snapshots
                WHERE timestamp <= $1
                ORDER BY timestamp DESC
                LIMIT 1`,
                [dayAgo]
            );

            const weekAgoResult = await dbService.query<{ value: number }>(
                `SELECT ${column} as value
                FROM historical_snapshots
                WHERE timestamp <= $1
                ORDER BY timestamp DESC
                LIMIT 1`,
                [weekAgo]
            );

            const hourAgoValue = hourAgoResult.rows[0]?.value || null;
            const dayAgoValue = dayAgoResult.rows[0]?.value || null;
            const weekAgoValue = weekAgoResult.rows[0]?.value || null;

            // Calcular tendencia
            let trend: 'improving' | 'worsening' | 'stable' = 'stable';
            let percentChange = 0;

            if (hourAgoValue !== null && typeof hourAgoValue === 'number' && typeof current === 'number') {
                const change = current - hourAgoValue;
                percentChange = hourAgoValue !== 0 ? (change / hourAgoValue) * 100 : 0;

                // Para velocidad, aumento es mejora; para otros, aumento es empeoramiento
                if (metric === 'avgSpeed') {
                    trend = change > 2 ? 'improving' : change < -2 ? 'worsening' : 'stable';
                } else {
                    trend = change > (hourAgoValue * 0.1) ? 'worsening' : change < -(hourAgoValue * 0.1) ? 'improving' : 'stable';
                }
            }

            return {
                current: typeof current === 'number' ? current : 0,
                hourAgo: typeof hourAgoValue === 'number' ? hourAgoValue : null,
                dayAgo: typeof dayAgoValue === 'number' ? dayAgoValue : null,
                weekAgo: typeof weekAgoValue === 'number' ? weekAgoValue : null,
                trend,
                percentChange: Number(percentChange.toFixed(1)),
            };
        } catch (error) {
            console.error('❌ Error calculando tendencias:', error);
            return {
                current: 0,
                hourAgo: null,
                dayAgo: null,
                weekAgo: null,
                trend: 'stable',
                percentChange: 0,
            };
        }
    }

    /**
     * Cuenta polígonos críticos (>=1 km en estado crítico)
     */
    private countCriticalPolygons(jams: InternalJam[]): number {
        const polygonIds = new Set(jams.map(j => j.polygonId).filter(Boolean));
        let count = 0;

        for (const polygonId of polygonIds) {
            const polygonJams = jams.filter(j => j.polygonId === polygonId);
            const criticalJams = polygonJams.filter(j => j.level && j.level >= 4);
            const criticalLength = criticalJams.reduce((sum, j) => sum + j.length, 0);

            if (criticalLength >= 1000) count++;
        }

        return count;
    }

    /**
     * Obtiene resumen de disponibilidad de datos
     */
    async getDataAvailability() {
        try {
            const result = await dbService.query<{
                total_snapshots: number;
                oldest_snapshot: Date;
                newest_snapshot: Date;
            }>(
                `SELECT
                    COUNT(*) as total_snapshots,
                    MIN(timestamp) as oldest_snapshot,
                    MAX(timestamp) as newest_snapshot
                FROM historical_snapshots`
            );

            const row = result.rows[0];
            const now = Date.now();
            const oneHourAgo = now - 3600000;
            const oneDayAgo = now - 86400000;
            const oneWeekAgo = now - 604800000;

            return {
                totalSnapshots: row?.total_snapshots || 0,
                oldestSnapshot: row?.oldest_snapshot || null,
                newestSnapshot: row?.newest_snapshot || null,
                hasHourData: row?.newest_snapshot ? new Date(row.newest_snapshot).getTime() > oneHourAgo : false,
                hasDayData: row?.newest_snapshot ? new Date(row.newest_snapshot).getTime() > oneDayAgo : false,
                hasWeekData: row?.oldest_snapshot ? new Date(row.oldest_snapshot).getTime() < oneWeekAgo : false,
                polygonsWithData: 0, // Se puede calcular con una query adicional si es necesario
            };
        } catch (error) {
            console.error('❌ Error obteniendo disponibilidad de datos:', error);
            return {
                totalSnapshots: 0,
                oldestSnapshot: null,
                newestSnapshot: null,
                hasHourData: false,
                hasDayData: false,
                hasWeekData: false,
                polygonsWithData: 0,
            };
        }
    }

    /**
     * Limpia snapshots antiguos (más de 7 días)
     */
    private async cleanupOldSnapshots() {
        try {
            await dbService.query('SELECT cleanup_old_snapshots()');
        } catch (error) {
            console.error('❌ Error limpiando snapshots antiguos:', error);
        }
    }

    /**
     * Inicia guardado automático cada hora
     */
    startAutoSave(getDataFn: () => { jams: InternalJam[]; incidents: InternalAlert[] }) {
        // Guardar inmediatamente
        const data = getDataFn();
        this.saveCurrentState(data.jams, data.incidents);

        // Configurar guardado cada hora
        setInterval(async () => {
            const data = getDataFn();
            await this.saveCurrentState(data.jams, data.incidents);
        }, 3600000); // 1 hora

        console.log('⏰ Auto-guardado de histórico configurado (cada 1 hora)');
    }
}

export const historicalService = new HistoricalService();
