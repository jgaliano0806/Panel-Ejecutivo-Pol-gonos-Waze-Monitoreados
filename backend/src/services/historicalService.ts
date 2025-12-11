import fs from 'fs';
import path from 'path';
import { HistoricalSnapshot, PolygonHistoricalData, TrendData, InternalJam, InternalAlert } from '../types';
import { REAL_POLYGONS } from '../config/realPolygons';

/**
 * Servicio de Histórico de Datos
 * Almacena snapshots cada hora y provee análisis de tendencias
 */
export class HistoricalService {
    private readonly dataDir: string;
    private readonly maxSnapshots = 168; // 7 días × 24 horas
    private globalSnapshots: HistoricalSnapshot[] = [];
    private polygonSnapshots: Map<string, HistoricalSnapshot[]> = new Map();

    constructor() {
        // Directorio para almacenar datos históricos
        this.dataDir = path.join(process.cwd(), 'data', 'historical');
        this.ensureDataDirectory();
        this.loadSnapshots();
    }

    /**
     * Asegura que el directorio de datos existe
     */
    private ensureDataDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
            console.log(`📁 Directorio de histórico creado: ${this.dataDir}`);
        }
    }

    /**
     * Carga snapshots desde disco
     */
    private loadSnapshots() {
        try {
            // Cargar snapshots globales
            const globalPath = path.join(this.dataDir, 'global.json');
            if (fs.existsSync(globalPath)) {
                const data = JSON.parse(fs.readFileSync(globalPath, 'utf-8')) as HistoricalSnapshot[];
                this.globalSnapshots = data.map((s) => ({
                    ...s,
                    timestamp: new Date(s.timestamp)
                }));
                console.log(`📊 Cargados ${this.globalSnapshots.length} snapshots globales`);
            }

            // Cargar snapshots por polígono
            const polygonPath = path.join(this.dataDir, 'polygons.json');
            if (fs.existsSync(polygonPath)) {
                const data = JSON.parse(fs.readFileSync(polygonPath, 'utf-8')) as Record<string, HistoricalSnapshot[]>;
                for (const [polygonId, snapshots] of Object.entries(data)) {
                    this.polygonSnapshots.set(
                        polygonId,
                        snapshots.map(s => ({
                            ...s,
                            timestamp: new Date(s.timestamp)
                        }))
                    );
                }
                console.log(`📊 Cargados snapshots de ${this.polygonSnapshots.size} polígonos`);
            }
        } catch (error) {
            console.error('❌ Error cargando snapshots:', error);
        }
    }

    /**
     * Guarda snapshots a disco
     */
    private saveSnapshots() {
        try {
            // Guardar snapshots globales
            const globalPath = path.join(this.dataDir, 'global.json');
            fs.writeFileSync(globalPath, JSON.stringify(this.globalSnapshots, null, 2));

            // Guardar snapshots por polígono
            const polygonData: Record<string, HistoricalSnapshot[]> = {};
            for (const [polygonId, snapshots] of this.polygonSnapshots.entries()) {
                polygonData[polygonId] = snapshots;
            }
            const polygonPath = path.join(this.dataDir, 'polygons.json');
            fs.writeFileSync(polygonPath, JSON.stringify(polygonData, null, 2));

            console.log(`💾 Snapshots guardados exitosamente`);
        } catch (error) {
            console.error('❌ Error guardando snapshots:', error);
        }
    }

    /**
     * Crea un snapshot global del sistema
     */
    createGlobalSnapshot(jams: InternalJam[], incidents: InternalAlert[]) {
        // Calcular métricas
        const totalLength = jams.reduce((sum, j) => sum + j.length, 0);
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

        // Agregar snapshot
        this.globalSnapshots.push(snapshot);

        // Limitar a maxSnapshots
        if (this.globalSnapshots.length > this.maxSnapshots) {
            this.globalSnapshots = this.globalSnapshots.slice(-this.maxSnapshots);
        }

        return snapshot;
    }

    /**
     * Crea snapshots para cada polígono
     */
    createPolygonSnapshots(jams: InternalJam[], incidents: InternalAlert[]) {
        for (const polygon of REAL_POLYGONS) {
            const polygonJams = jams.filter(j => j.polygonId === polygon.id);
            const polygonIncidents = incidents.filter(i => i.polygonId === polygon.id);

            if (polygonJams.length === 0) continue;

            const criticalJams = polygonJams.filter(j => j.level && j.level >= 4);
            const criticalLength = criticalJams.reduce((sum, j) => sum + j.length, 0);
            
            const jamsWithSpeed = polygonJams.filter(j => j.speed > 0);
            const avgSpeed = jamsWithSpeed.length > 0
                ? jamsWithSpeed.reduce((sum, j) => sum + j.speed, 0) / jamsWithSpeed.length
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

            // Obtener o crear array de snapshots
            let snapshots = this.polygonSnapshots.get(polygon.id) || [];
            snapshots.push(snapshot);

            // Limitar a maxSnapshots
            if (snapshots.length > this.maxSnapshots) {
                snapshots = snapshots.slice(-this.maxSnapshots);
            }

            this.polygonSnapshots.set(polygon.id, snapshots);
        }
    }

    /**
     * Guarda snapshots completos (global + polígonos)
     */
    saveCurrentState(jams: InternalJam[], incidents: InternalAlert[]) {
        this.createGlobalSnapshot(jams, incidents);
        this.createPolygonSnapshots(jams, incidents);
        this.saveSnapshots();
        console.log(`📸 Snapshot guardado: ${new Date().toISOString()}`);
    }

    /**
     * Obtiene snapshots globales
     */
    getGlobalSnapshots(hours: number = 24): HistoricalSnapshot[] {
        const cutoff = Date.now() - (hours * 3600000);
        return this.globalSnapshots.filter(s => s.timestamp.getTime() > cutoff);
    }

    /**
     * Obtiene snapshots de un polígono
     */
    getPolygonSnapshots(polygonId: string, hours: number = 24): HistoricalSnapshot[] {
        const snapshots = this.polygonSnapshots.get(polygonId) || [];
        const cutoff = Date.now() - (hours * 3600000);
        return snapshots.filter(s => s.timestamp.getTime() > cutoff);
    }

    /**
     * Calcula tendencias comparando periodos
     */
    calculateTrends(metric: 'totalJams' | 'avgSpeed' | 'criticalKm' | 'avgDelay'): TrendData {
        if (this.globalSnapshots.length === 0) {
            return {
                current: 0,
                hourAgo: null,
                dayAgo: null,
                weekAgo: null,
                trend: 'stable',
                percentChange: 0,
            };
        }

        const now = Date.now();
        const current = this.globalSnapshots[this.globalSnapshots.length - 1][metric] || 0;
        
        // Buscar snapshot más cercano a cada periodo
        const hourAgo = this.findClosestSnapshot(now - 3600000)?.[metric] || null;
        const dayAgo = this.findClosestSnapshot(now - 86400000)?.[metric] || null;
        const weekAgo = this.findClosestSnapshot(now - 604800000)?.[metric] || null;

        // Calcular tendencia (comparar con hace 1 hora)
        let trend: 'improving' | 'worsening' | 'stable' = 'stable';
        let percentChange = 0;

        if (hourAgo !== null && typeof hourAgo === 'number' && typeof current === 'number') {
            const change = current - hourAgo;
            percentChange = hourAgo !== 0 ? (change / hourAgo) * 100 : 0;

            // Para velocidad, aumento es mejora; para otros, aumento es empeoramiento
            if (metric === 'avgSpeed') {
                trend = change > 2 ? 'improving' : change < -2 ? 'worsening' : 'stable';
            } else {
                trend = change > (hourAgo * 0.1) ? 'worsening' : change < -(hourAgo * 0.1) ? 'improving' : 'stable';
            }
        }

        return {
            current: typeof current === 'number' ? current : 0,
            hourAgo: typeof hourAgo === 'number' ? hourAgo : null,
            dayAgo: typeof dayAgo === 'number' ? dayAgo : null,
            weekAgo: typeof weekAgo === 'number' ? weekAgo : null,
            trend,
            percentChange: Number(percentChange.toFixed(1)),
        };
    }

    /**
     * Encuentra el snapshot más cercano a un timestamp
     */
    private findClosestSnapshot(targetTime: number): HistoricalSnapshot | null {
        if (this.globalSnapshots.length === 0) return null;

        let closest = this.globalSnapshots[0];
        let minDiff = Math.abs(closest.timestamp.getTime() - targetTime);

        for (const snapshot of this.globalSnapshots) {
            const diff = Math.abs(snapshot.timestamp.getTime() - targetTime);
            if (diff < minDiff) {
                minDiff = diff;
                closest = snapshot;
            }
        }

        // Solo retornar si está dentro de 1 hora del target
        return minDiff < 3600000 ? closest : null;
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
    getDataAvailability() {
        const now = Date.now();
        const oneHourAgo = now - 3600000;
        const oneDayAgo = now - 86400000;
        const oneWeekAgo = now - 604800000;

        return {
            totalSnapshots: this.globalSnapshots.length,
            oldestSnapshot: this.globalSnapshots[0]?.timestamp,
            newestSnapshot: this.globalSnapshots[this.globalSnapshots.length - 1]?.timestamp,
            hasHourData: this.globalSnapshots.some(s => s.timestamp.getTime() > oneHourAgo),
            hasDayData: this.globalSnapshots.some(s => s.timestamp.getTime() > oneDayAgo),
            hasWeekData: this.globalSnapshots.some(s => s.timestamp.getTime() > oneWeekAgo),
            polygonsWithData: this.polygonSnapshots.size,
        };
    }

    /**
     * Inicia guardado automático cada hora
     */
    startAutoSave(getDataFn: () => { jams: InternalJam[]; incidents: InternalAlert[] }) {
        // Guardar inmediatamente
        const data = getDataFn();
        this.saveCurrentState(data.jams, data.incidents);

        // Configurar guardado cada hora
        setInterval(() => {
            const data = getDataFn();
            this.saveCurrentState(data.jams, data.incidents);
        }, 3600000); // 1 hora

        console.log('⏰ Auto-guardado de histórico configurado (cada 1 hora)');
    }
}

export const historicalService = new HistoricalService();