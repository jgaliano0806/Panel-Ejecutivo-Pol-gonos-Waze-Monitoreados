import axios from 'axios';
import { dbService } from '../database/dbService';
import { cacheService, TTL } from './cacheService';
import { REAL_POLYGONS, RealPolygonConfig } from '../config/realPolygons';
import {
    WazeAlert,
    WazeJam,
    WazeIrregularity,
    WazeAlertDB,
    WazeJamDB,
    WazeFeedData,
    WazePollingResult,
    WazeUpdatePayload
} from '@panel-waze/types';

// Import Socket.io instance if available (will be injected)
let io: any = null;

/**
 * Servicio de Polling de Waze con persistencia PostgreSQL
 * - Fetch periódico cada 2 minutos
 * - Almacenamiento en PostgreSQL (waze_alerts, waze_jams, waze_irregularities)
 * - Emisión via WebSocket a rooms por polígono
 * - Cache invalidation
 */
export class WazePollingService {
    private static instance: WazePollingService;
    private pollingInterval: NodeJS.Timeout | null = null;
    private isPolling: boolean = false;
    private lastPollTime: Date = new Date(0);

    // Configuración
    private readonly POLLING_INTERVAL_MS = 120000; // 2 minutos
    private readonly REQUEST_TIMEOUT_MS = 10000; // 10 segundos
    private readonly MAX_RETRIES = 3;
    private readonly INACTIVE_THRESHOLD_MINUTES = 30;
    private readonly RATE_LIMIT_DELAY_MS = 100; // 100ms entre requests para rate limiting

    private constructor() {
        console.log('🔧 WazePollingService initialized');
    }

    /**
     * Singleton instance
     */
    public static getInstance(): WazePollingService {
        if (!WazePollingService.instance) {
            WazePollingService.instance = new WazePollingService();
        }
        return WazePollingService.instance;
    }

    /**
     * Inyecta la instancia de Socket.io para emisión de eventos
     */
    public setSocketIO(socketIO: any): void {
        io = socketIO;
        console.log('🔌 Socket.io injected into WazePollingService');
    }

    /**
     * Inicia el ciclo de polling
     */
    public async startPolling(): Promise<void> {
        if (this.isPolling) {
            console.warn('⚠️ WazePollingService already polling');
            return;
        }

        // Asegurar que las tablas existen
        await this.ensureTables();

        console.log(`🚀 Starting Waze polling (every ${this.POLLING_INTERVAL_MS / 1000}s)`);
        this.isPolling = true;

        // Ejecutar inmediatamente
        this.poll();

        // Programar polling periódico
        this.pollingInterval = setInterval(() => this.poll(), this.POLLING_INTERVAL_MS);
    }

    /**
     * Asegura que las tablas de Waze existen en la base de datos
     */
    private async ensureTables(): Promise<void> {
        console.log('🔧 Verificando tablas de Waze...');

        try {
            // Crear tabla waze_alerts
            await dbService.query(`
                CREATE TABLE IF NOT EXISTS waze_alerts (
                    uuid VARCHAR(100) PRIMARY KEY,
                    polygon_id VARCHAR(50) NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    subtype VARCHAR(100),
                    latitude DECIMAL(10,7) NOT NULL,
                    longitude DECIMAL(10,7) NOT NULL,
                    street VARCHAR(255),
                    city VARCHAR(100),
                    country VARCHAR(100),
                    pub_millis BIGINT NOT NULL,
                    reliability DECIMAL(3,1),
                    confidence DECIMAL(3,1),
                    report_description TEXT,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            `);

            // Crear tabla waze_jams
            await dbService.query(`
                CREATE TABLE IF NOT EXISTS waze_jams (
                    uuid VARCHAR(100) PRIMARY KEY,
                    polygon_id VARCHAR(50) NOT NULL,
                    level INTEGER NOT NULL,
                    polyline JSONB NOT NULL,
                    speed_kmh DECIMAL(6,2),
                    delay_seconds INTEGER,
                    length_meters DECIMAL(10,2),
                    street VARCHAR(255),
                    city VARCHAR(100),
                    pub_millis BIGINT NOT NULL,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            `);

            // Crear tabla waze_irregularities
            await dbService.query(`
                CREATE TABLE IF NOT EXISTS waze_irregularities (
                    uuid VARCHAR(100) PRIMARY KEY,
                    polygon_id VARCHAR(50) NOT NULL,
                    type VARCHAR(50),
                    detection_date TIMESTAMPTZ,
                    street VARCHAR(255),
                    speed DECIMAL(6,2),
                    regular_speed DECIMAL(6,2),
                    delay_seconds INTEGER,
                    severity DECIMAL(3,1),
                    jam_level INTEGER,
                    trend INTEGER,
                    polyline JSONB,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            `);

            // Crear índices
            await dbService.query(`CREATE INDEX IF NOT EXISTS idx_alerts_polygon ON waze_alerts(polygon_id, is_active, created_at DESC)`);
            await dbService.query(`CREATE INDEX IF NOT EXISTS idx_jams_polygon ON waze_jams(polygon_id, is_active, created_at DESC)`);
            await dbService.query(`CREATE INDEX IF NOT EXISTS idx_irreg_polygon ON waze_irregularities(polygon_id, is_active, created_at DESC)`);

            console.log('✅ Tablas de Waze verificadas/creadas');
        } catch (error) {
            console.error('❌ Error creando tablas de Waze:', error instanceof Error ? error.message : error);
            throw error;
        }
    }

    /**
     * Detiene el ciclo de polling (para graceful shutdown)
     */
    public stopPolling(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.isPolling = false;
        console.log('🛑 Waze polling stopped');
    }

    /**
     * Ejecuta un ciclo de polling completo
     */
    private async poll(): Promise<void> {
        const startTime = Date.now();
        console.log(`📥 Polling ${REAL_POLYGONS.length} Waze feeds...`);

        const results: WazePollingResult[] = [];
        let successCount = 0;
        let errorCount = 0;

        // Procesar feeds con rate limiting
        for (const polygon of REAL_POLYGONS) {
            try {
                const result = await this.fetchAndStorePolygonData(polygon);
                results.push(result);

                if (result.success) {
                    successCount++;

                    // Emitir via WebSocket si hay datos
                    if (result.alerts > 0 || result.jams > 0) {
                        await this.emitUpdate(polygon.id);
                    }
                } else {
                    errorCount++;
                }

                // Rate limiting entre requests
                await this.sleep(this.RATE_LIMIT_DELAY_MS);

            } catch (error) {
                errorCount++;
                console.error(`❌ Error polling ${polygon.name}:`, error instanceof Error ? error.message : error);
            }
        }

        // Marcar datos antiguos como inactivos
        await this.markInactiveData();

        // Invalidar cache
        await this.invalidateCache();

        const duration = Date.now() - startTime;
        this.lastPollTime = new Date();

        const totalAlerts = results.reduce((sum, r) => sum + r.alerts, 0);
        const totalJams = results.reduce((sum, r) => sum + r.jams, 0);

        console.log(`✅ Poll completed in ${duration}ms. Success: ${successCount}/${REAL_POLYGONS.length}, Alerts: ${totalAlerts}, Jams: ${totalJams}`);
    }

    /**
     * Fetch y almacena datos de un polígono específico
     */
    private async fetchAndStorePolygonData(polygon: RealPolygonConfig): Promise<WazePollingResult> {
        const result: WazePollingResult = {
            polygonId: polygon.id,
            alerts: 0,
            jams: 0,
            irregularities: 0,
            success: false
        };

        try {
            // Fetch con reintentos
            const data = await this.fetchFeedWithRetry(polygon.feedUrl);

            if (!data) {
                result.error = 'No data received';
                return result;
            }

            // Almacenar alerts
            if (data.alerts && data.alerts.length > 0) {
                result.alerts = await this.storeAlerts(data.alerts, polygon.id);
            }

            // Almacenar jams
            if (data.jams && data.jams.length > 0) {
                result.jams = await this.storeJams(data.jams, polygon.id);
            }

            // Almacenar irregularities si existen
            if (data.irregularities && data.irregularities.length > 0) {
                result.irregularities = await this.storeIrregularities(data.irregularities, polygon.id);
            }

            result.success = true;

        } catch (error) {
            result.error = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Failed to fetch/store ${polygon.name}:`, result.error);
        }

        return result;
    }

    /**
     * Fetch del feed con lógica de reintentos
     */
    private async fetchFeedWithRetry(url: string): Promise<WazeFeedData | null> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const response = await axios.get<WazeFeedData>(url, {
                    timeout: this.REQUEST_TIMEOUT_MS,
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Panel-Waze-Monitoreados/1.0'
                    }
                });

                return response.data;

            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt < this.MAX_RETRIES) {
                    // Exponential backoff: 1s, 2s, 4s...
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    await this.sleep(delay);
                }
            }
        }

        throw lastError || new Error('Max retries exceeded');
    }

    /**
     * Almacena alerts en PostgreSQL (UPSERT)
     */
    private async storeAlerts(alerts: WazeAlert[], polygonId: string): Promise<number> {
        let stored = 0;

        for (const alert of alerts) {
            try {
                await dbService.query(`
                    INSERT INTO waze_alerts (
                        uuid, polygon_id, type, subtype, latitude, longitude,
                        street, city, country, pub_millis, reliability, confidence,
                        report_description, is_active, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, NOW(), NOW())
                    ON CONFLICT (uuid) DO UPDATE SET
                        is_active = true,
                        reliability = EXCLUDED.reliability,
                        confidence = EXCLUDED.confidence,
                        updated_at = NOW()
                `, [
                    alert.uuid,
                    polygonId,
                    alert.type,
                    alert.subtype || null,
                    alert.location.y, // latitude
                    alert.location.x, // longitude
                    alert.street || null,
                    alert.city || null,
                    alert.country || null,
                    alert.pubMillis,
                    alert.reliability || null,
                    alert.confidence || null,
                    alert.reportDescription || null
                ]);
                stored++;
            } catch (error) {
                console.error(`Error storing alert ${alert.uuid}:`, error instanceof Error ? error.message : error);
            }
        }

        return stored;
    }

    /**
     * Almacena jams en PostgreSQL (UPSERT)
     */
    private async storeJams(jams: WazeJam[], polygonId: string): Promise<number> {
        let stored = 0;

        for (const jam of jams) {
            try {
                await dbService.query(`
                    INSERT INTO waze_jams (
                        uuid, polygon_id, level, polyline, speed_kmh,
                        delay_seconds, length_meters, street, city, pub_millis,
                        is_active, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW())
                    ON CONFLICT (uuid) DO UPDATE SET
                        level = EXCLUDED.level,
                        polyline = EXCLUDED.polyline,
                        speed_kmh = EXCLUDED.speed_kmh,
                        delay_seconds = EXCLUDED.delay_seconds,
                        is_active = true
                `, [
                    jam.uuid,
                    polygonId,
                    jam.level,
                    JSON.stringify(jam.line),
                    jam.speedKMH || null,
                    jam.delay || null,
                    jam.length || null,
                    jam.street || null,
                    jam.city || null,
                    jam.pubMillis
                ]);
                stored++;
            } catch (error) {
                console.error(`Error storing jam ${jam.uuid}:`, error instanceof Error ? error.message : error);
            }
        }

        return stored;
    }

    /**
     * Almacena irregularities en PostgreSQL (UPSERT)
     */
    private async storeIrregularities(irregularities: WazeIrregularity[], polygonId: string): Promise<number> {
        let stored = 0;

        for (const irreg of irregularities) {
            try {
                await dbService.query(`
                    INSERT INTO waze_irregularities (
                        uuid, polygon_id, type, detection_date, street,
                        speed, regular_speed, delay_seconds, severity,
                        jam_level, trend, polyline, is_active, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, NOW())
                    ON CONFLICT (uuid) DO UPDATE SET
                        severity = EXCLUDED.severity,
                        jam_level = EXCLUDED.jam_level,
                        trend = EXCLUDED.trend,
                        is_active = true
                `, [
                    irreg.uuid,
                    polygonId,
                    irreg.type || null,
                    irreg.detectionDate ? new Date(irreg.detectionDate) : null,
                    irreg.street || null,
                    irreg.speed || null,
                    irreg.regularSpeed || null,
                    irreg.delaySeconds || null,
                    irreg.severity || null,
                    irreg.jamLevel || null,
                    irreg.trend || null,
                    irreg.line ? JSON.stringify(irreg.line) : null
                ]);
                stored++;
            } catch (error) {
                console.error(`Error storing irregularity ${irreg.uuid}:`, error instanceof Error ? error.message : error);
            }
        }

        return stored;
    }

    /**
     * Marca como inactivos los datos más antiguos que el threshold
     */
    private async markInactiveData(): Promise<void> {
        const thresholdMs = this.INACTIVE_THRESHOLD_MINUTES * 60 * 1000;
        const cutoffTime = Date.now() - thresholdMs;

        try {
            // Marcar alerts inactivos
            await dbService.query(`
                UPDATE waze_alerts
                SET is_active = false
                WHERE is_active = true AND pub_millis < $1
            `, [cutoffTime]);

            // Marcar jams inactivos
            await dbService.query(`
                UPDATE waze_jams
                SET is_active = false
                WHERE is_active = true AND pub_millis < $1
            `, [cutoffTime]);

            // Marcar irregularities inactivos
            await dbService.query(`
                UPDATE waze_irregularities
                SET is_active = false
                WHERE is_active = true AND created_at < NOW() - INTERVAL '${this.INACTIVE_THRESHOLD_MINUTES} minutes'
            `);

        } catch (error) {
            console.error('Error marking inactive data:', error instanceof Error ? error.message : error);
        }
    }

    /**
     * Emite actualización via WebSocket para un polígono
     */
    private async emitUpdate(polygonId: string): Promise<void> {
        if (!io) {
            return; // Socket.io no configurado
        }

        try {
            // Obtener datos activos del polígono
            const alertsResult = await dbService.query<WazeAlertDB>(`
                SELECT * FROM waze_alerts
                WHERE polygon_id = $1 AND is_active = true
                ORDER BY created_at DESC
                LIMIT 100
            `, [polygonId]);

            const jamsResult = await dbService.query<WazeJamDB>(`
                SELECT * FROM waze_jams
                WHERE polygon_id = $1 AND is_active = true
                ORDER BY created_at DESC
                LIMIT 100
            `, [polygonId]);

            const payload: WazeUpdatePayload = {
                polygonId,
                alerts: alertsResult.rows,
                jams: jamsResult.rows,
                timestamp: new Date().toISOString()
            };

            // Emitir a room del polígono
            io.to(`polygon:${polygonId}`).emit('waze:update', payload);

        } catch (error) {
            console.error(`Error emitting update for ${polygonId}:`, error instanceof Error ? error.message : error);
        }
    }

    /**
     * Invalida cache relacionado con Waze
     */
    private async invalidateCache(polygonId?: string): Promise<void> {
        if (polygonId) {
            await cacheService.del(`waze:alerts:${polygonId}`);
            await cacheService.del(`waze:jams:${polygonId}`);
        } else {
            await cacheService.invalidate('waze:*');
        }
    }

    /**
     * Helper para delay
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Obtiene el estado del servicio
     */
    public getStatus(): { isPolling: boolean; lastPollTime: Date; polygonCount: number } {
        return {
            isPolling: this.isPolling,
            lastPollTime: this.lastPollTime,
            polygonCount: REAL_POLYGONS.length
        };
    }

    /**
     * Obtiene alerts activos de un polígono
     */
    public async getActiveAlerts(polygonId: string): Promise<WazeAlertDB[]> {
        const result = await dbService.query<WazeAlertDB>(`
            SELECT * FROM waze_alerts
            WHERE polygon_id = $1 AND is_active = true
            ORDER BY created_at DESC
        `, [polygonId]);
        return result.rows;
    }

    /**
     * Obtiene jams activos de un polígono
     */
    public async getActiveJams(polygonId: string): Promise<WazeJamDB[]> {
        const result = await dbService.query<WazeJamDB>(`
            SELECT * FROM waze_jams
            WHERE polygon_id = $1 AND is_active = true
            ORDER BY created_at DESC
        `, [polygonId]);
        return result.rows;
    }

    /**
     * Obtiene todos los alerts activos
     */
    public async getAllActiveAlerts(): Promise<WazeAlertDB[]> {
        const result = await dbService.query<WazeAlertDB>(`
            SELECT * FROM waze_alerts
            WHERE is_active = true
            ORDER BY created_at DESC
            LIMIT 1000
        `);
        return result.rows;
    }

    /**
     * Obtiene todos los jams activos
     */
    public async getAllActiveJams(): Promise<WazeJamDB[]> {
        const result = await dbService.query<WazeJamDB>(`
            SELECT * FROM waze_jams
            WHERE is_active = true
            ORDER BY created_at DESC
            LIMIT 1000
        `);
        return result.rows;
    }
}

// Exportar instancia singleton
export const wazePollingService = WazePollingService.getInstance();
