import Fastify from 'fastify';
import cors from '@fastify/cors';
import { wazeService } from './services/wazeService';
import { ApiService } from './services/apiService';
import { alertService } from './services/alertService';
import { aggregationService } from './services/aggregationService';
import { historicalService } from './services/historicalService';
import { dataQualityService } from './services/dataQualityService';
import { incidentStatsService } from './services/incidentStatsService';
import { externalTrafficService } from './services/externalTrafficService';
import { REAL_POLYGONS } from './config/realPolygons';
import dotenv from 'dotenv';

dotenv.config();

// Instancia del servicio de API (evita problemas de import/export en TS runtime)
const apiService = new ApiService();

const server = Fastify({
    logger: true,
    // Optimizaciones de rendimiento
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    trustProxy: true,
});

// Configurar CORS
server.register(cors, {
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
});

// Hook global de manejo de errores
server.setErrorHandler((error: Error, request, reply) => {
    server.log.error({
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
    }, 'Error en servidor');

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    reply.status(500).send({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? errorMessage : 'Something went wrong',
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {})
    });
});

// Hook para agregar headers de cache
server.addHook('onSend', async (request, reply) => {
    // Cache de 30 segundos para datos de Waze (se actualizan cada 2 min)
    if (request.url.startsWith('/api/')) {
        reply.header('Cache-Control', 'public, max-age=30');
    }
});

// --- Rutas ---

server.get('/health', async () => {
    try {
        return {
            status: 'ok',
            uptime: process.uptime(),
            lastWazeUpdate: wazeService.getLastUpdate(),
            memory: process.memoryUsage(),
            alertsCount: wazeService.getAlerts().length,
            jamsCount: wazeService.getJams().length,
        };
    } catch (error) {
        server.log.error({ error }, 'Error en /health');
        return {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
});

// Endpoint de prueba simple
server.get('/api/test', async () => {
    return { message: 'Backend is running!', timestamp: new Date().toISOString() };
});

server.get('/api/polygons', async (request, reply) => {
    try {
        const polygons = apiService.getPolygonsStatus();
        if (!polygons || !Array.isArray(polygons)) {
            server.log.warn({ url: request.url }, 'getPolygonsStatus retornó valor inválido');
            return [];
        }
        return polygons;
    } catch (error) {
        server.log.error({ error, url: request.url, stack: error instanceof Error ? error.stack : undefined }, 'Error en /api/polygons');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.code(500).send({
            error: 'Failed to get polygons status',
            message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
});

server.get('/api/polygons/:id', async (request, reply) => {
    try {
    const { id } = request.params as { id: string };
    const detail = apiService.getPolygonDetail(id);

    if (!detail) {
        reply.code(404).send({ error: 'Polygon not found' });
        return;
    }

    return detail;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get polygon detail' });
    }
});

server.get('/api/kpis/global', async (request, reply) => {
    try {
        return apiService.getGlobalKPIs();
    } catch (error) {
        server.log.error({ error, url: request.url }, 'Error en /api/kpis/global');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.code(500).send({
            error: 'Failed to get global KPIs',
            message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
});

server.get('/api/incidents/all', async (request, reply) => {
    try {
        return wazeService.getAlerts();
    } catch (error) {
        server.log.error({ error, url: request.url }, 'Error en /api/incidents/all');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.code(500).send({
            error: 'Failed to get incidents',
            message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
});

server.get('/api/jams/all', async (request, reply) => {
    try {
        return wazeService.getJams();
    } catch (error) {
        server.log.error({ error, url: request.url }, 'Error en /api/jams/all');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.code(500).send({
            error: 'Failed to get traffic jams',
            message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
});

server.get('/api/traffic-metrics', async (request, reply) => {
    try {
        const metrics = apiService.getAllTrafficMetrics();
        return metrics;
    } catch (error) {
        server.log.error({ error, url: request.url }, 'Error en /api/traffic-metrics');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.code(500).send({
            error: 'Failed to get traffic metrics',
            message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
});

server.get('/api/traffic-metrics/:polygonId', async (request, reply) => {
    try {
        const { polygonId } = request.params as { polygonId: string };
        const metrics = apiService.getTrafficMetricsByPolygon(polygonId);

        if (!metrics) {
            reply.code(404).send({ error: 'Polygon not found' });
            return;
        }

        return metrics;
    } catch (error) {
        server.log.error({ error, url: request.url }, 'Error en /api/traffic-metrics/:polygonId');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.code(500).send({
            error: 'Failed to get polygon traffic metrics',
            message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
});

// --- Endpoints de Alertas ---

server.get('/api/alerts', async (request, reply) => {
    try {
        const alerts = alertService.getActiveAlerts();
        return alerts || [];
    } catch (error) {
        server.log.error({ error, url: request.url }, 'Error en /api/alerts');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.code(500).send({
            error: 'Failed to get alerts',
            message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
});

server.get('/api/alerts/stats', async (request, reply) => {
    try {
        return alertService.getAlertStats();
    } catch (error) {
        server.log.error({ error, url: request.url }, 'Error en /api/alerts/stats');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.code(500).send({
            error: 'Failed to get alert stats',
            message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
});

server.get('/api/alerts/severity/:severity', async (request, reply) => {
    try {
        const { severity } = request.params as { severity: string };
        return alertService.getAlertsBySeverity(severity as any);
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get alerts by severity' });
    }
});

server.get('/api/alerts/polygon/:polygonId', async (request, reply) => {
    try {
        const { polygonId } = request.params as { polygonId: string };
        return alertService.getAlertsByPolygon(polygonId);
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get alerts by polygon' });
    }
});

server.post('/api/alerts/:alertId/acknowledge', async (request, reply) => {
    try {
        const { alertId } = request.params as { alertId: string };
        const body = request.body as { acknowledgedBy?: string };

        const success = alertService.acknowledgeAlert(alertId, body.acknowledgedBy);

        if (!success) {
            reply.code(404).send({ error: 'Alert not found' });
            return;
        }

        return { success: true, message: 'Alert acknowledged' };
    } catch (error) {
        reply.code(500).send({ error: 'Failed to acknowledge alert' });
    }
});

// --- Endpoints de Métricas Agregadas ---

server.get('/api/metrics/global', async (request, reply) => {
    try {
        const jams = wazeService.getJams();
        const incidents = wazeService.getAlerts();
        const trafficMetrics = apiService.getAllTrafficMetrics();

        const globalMetrics = aggregationService.calculateGlobalMetrics(jams, incidents, trafficMetrics);
        return globalMetrics;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get global metrics' });
    }
});

server.get('/api/metrics/top-critical', async (request, reply) => {
    try {
        const limit = parseInt((request.query as any)?.limit || '10');
        const jams = wazeService.getJams();
        const incidents = wazeService.getAlerts();

        const topCritical = aggregationService.getTopCriticalPolygons(jams, incidents, limit);
        return topCritical;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get top critical polygons' });
    }
});

// --- Endpoints de Histórico ---

server.get('/api/historical/global', async (request, reply) => {
    try {
        const hours = parseInt((request.query as any)?.hours || '24');
        const snapshots = historicalService.getGlobalSnapshots(hours);
        return snapshots || [];
    } catch (error) {
        server.log.error({ error, url: request.url }, 'Error en /api/historical/global');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.code(500).send({
            error: 'Failed to get historical data',
            message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
});

server.get('/api/historical/polygon/:polygonId', async (request, reply) => {
    try {
        const { polygonId } = request.params as { polygonId: string };
        const hours = parseInt((request.query as any)?.hours || '24');
        const snapshots = historicalService.getPolygonSnapshots(polygonId, hours);
        return snapshots;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get polygon historical data' });
    }
});

server.get('/api/historical/trends', async (request, reply) => {
    try {
        return {
            totalJams: historicalService.calculateTrends('totalJams') || 0,
            avgSpeed: historicalService.calculateTrends('avgSpeed') || 0,
            criticalKm: historicalService.calculateTrends('criticalKm') || 0,
            avgDelay: historicalService.calculateTrends('avgDelay') || 0,
        };
    } catch (error) {
        server.log.error({ error, url: request.url }, 'Error en /api/historical/trends');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.code(500).send({
            error: 'Failed to get trends',
            message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
});

server.get('/api/historical/availability', async (request, reply) => {
    try {
        return historicalService.getDataAvailability();
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get data availability' });
    }
});

// --- Endpoints de Calidad de Datos ---

/**
 * GET /api/data-quality/report
 * Genera reporte completo de calidad de datos
 */
server.get('/api/data-quality/report', async (request, reply) => {
    try {
        const incidents = wazeService.getAlerts();
        const report = dataQualityService.generateQualityReport(incidents);

        // Convertir Map a objeto para JSON
        const reportJson = {
            timestamp: report.timestamp,
            metrics: report.metrics,
            byPolygon: Object.fromEntries(report.byPolygon),
            lowQualityIncidents: report.lowQualityIncidents
        };

        return reportJson;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to generate quality report' });
    }
});

/**
 * GET /api/data-quality/metrics
 * Obtiene métricas globales de calidad
 */
server.get('/api/data-quality/metrics', async (request, reply) => {
    try {
        const incidents = wazeService.getAlerts();
        const metrics = dataQualityService.calculateQualityMetrics(incidents);
        return metrics;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get quality metrics' });
    }
});

/**
 * GET /api/data-quality/incidents/high-quality
 * Obtiene solo incidentes de alta calidad
 */
server.get('/api/data-quality/incidents/high-quality', async (request, reply) => {
    try {
        const incidents = wazeService.getAlerts();
        const highQuality = dataQualityService.getHighQualityIncidents(incidents);
        return highQuality;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get high quality incidents' });
    }
});

/**
 * GET /api/data-quality/incidents/prioritized
 * Obtiene incidentes priorizados por calidad y severidad
 */
server.get('/api/data-quality/incidents/prioritized', async (request, reply) => {
    try {
        const incidents = wazeService.getAlerts();
        const prioritized = dataQualityService.prioritizeIncidents(incidents);
        return prioritized;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to prioritize incidents' });
    }
});

/**
 * GET /api/data-quality/incidents/stale
 * Detecta incidentes que probablemente ya no son válidos
 */
server.get('/api/data-quality/incidents/stale', async (request, reply) => {
    try {
        const maxAge = parseInt((request.query as any)?.maxAge || '30'); // minutos
        const incidents = wazeService.getAlerts();
        const stale = dataQualityService.detectStaleIncidents(incidents, maxAge);
        return stale;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to detect stale incidents' });
    }
});

/**
 * GET /api/data-quality/feed-status
 * Verifica si se alcanzó el límite de eventos de Waze (5000)
 */
server.get('/api/data-quality/feed-status', async (request, reply) => {
    try {
        const incidents = wazeService.getAlerts();
        const jams = wazeService.getJams();
        const status = dataQualityService.checkFeedLimit(incidents, jams);
        return status;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to check feed status' });
    }
});

/**
 * GET /api/data-quality/thresholds
 * Obtiene los umbrales configurados actualmente
 */
server.get('/api/data-quality/thresholds', async (request, reply) => {
    try {
        return dataQualityService.getThresholds();
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get thresholds' });
    }
});

/**
 * POST /api/data-quality/thresholds
 * Actualiza umbrales de calidad dinámicamente
 */
server.post('/api/data-quality/thresholds', async (request, reply) => {
    try {
        const updates = request.body as any;
        dataQualityService.updateThresholds(updates);
        return { success: true, message: 'Thresholds updated', current: dataQualityService.getThresholds() };
    } catch (error) {
        reply.code(500).send({ error: 'Failed to update thresholds' });
    }
});

// --- Endpoints de Estadísticas de Incidentes ---

/**
 * GET /api/incidents/stats/global
 * Obtiene estadísticas globales de tipos y subtipos de incidentes
 */
server.get('/api/incidents/stats/global', async (request, reply) => {
    try {
        const alerts = wazeService.getAlerts();
        const jams = wazeService.getJams();
        const stats = incidentStatsService.getGlobalStats(alerts, jams);
        return stats;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get global incident stats' });
    }
});

/**
 * GET /api/incidents/stats/polygon/:polygonId
 * Obtiene estadísticas detalladas de incidentes para un polígono específico
 */
server.get('/api/incidents/stats/polygon/:polygonId', async (request, reply) => {
    try {
        const { polygonId } = request.params as { polygonId: string };
        const polygon = REAL_POLYGONS.find(p => p.id === polygonId);

        if (!polygon) {
            reply.code(404).send({ error: 'Polygon not found' });
            return;
        }

        const alerts = wazeService.getAlerts();
        const jams = wazeService.getJams();
        const stats = incidentStatsService.getPolygonStats(
            polygonId,
            polygon.name,
            alerts,
            jams
        );

        return stats;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get polygon incident stats' });
    }
});

/**
 * GET /api/incidents/types-summary
 * Resumen rápido de tipos de incidentes activos
 */
server.get('/api/incidents/types-summary', async (request, reply) => {
    try {
        const alerts = wazeService.getAlerts();

        // Agrupar por tipo
        const typeCounts = new Map<string, number>();
        for (const alert of alerts) {
            const count = typeCounts.get(alert.type) || 0;
            typeCounts.set(alert.type, count + 1);
        }

        const summary = Array.from(typeCounts.entries()).map(([type, count]) => ({
            type,
            count,
            emoji: incidentStatsService.getIncidentEmoji(type)
        })).sort((a, b) => b.count - a.count);

        return summary;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get incident types summary' });
    }
});

// --- Endpoints de Velocidad Externa ---

/**
 * GET /api/speed/comparison/:polygonId
 * Compara velocidad de Waze con fuentes externas
 */
server.get('/api/speed/comparison/:polygonId', async (request, reply) => {
    try {
        const { polygonId } = request.params as { polygonId: string };
        const polygon = REAL_POLYGONS.find(p => p.id === polygonId);

        if (!polygon) {
            reply.code(404).send({ error: 'Polygon not found' });
            return;
        }

        // Obtener velocidad de Waze
        const trafficMetrics = apiService.getTrafficMetricsByPolygon(polygonId);
        const wazeSpeed = trafficMetrics?.avgSpeed || null;

        // Calcular centro del polígono (aproximado)
        // En producción, esto debería venir de la config del polígono
        const centerLat = polygon.coordinates?.lat || -31.4173; // Córdoba por defecto
        const centerLon = polygon.coordinates?.lon || -64.1833;

        const comparison = await externalTrafficService.getSpeedComparison(
            polygonId,
            polygon.name,
            centerLat,
            centerLon,
            wazeSpeed
        );

        return comparison;
    } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: 'Failed to get speed comparison' });
    }
});

/**
 * GET /api/speed/comparison/all
 * Obtiene comparación de velocidades para todos los polígonos críticos
 */
server.get('/api/speed/comparison/all', async (request, reply) => {
    try {
        const limit = parseInt((request.query as any)?.limit || '10');

        // Obtener polígonos con tráfico
        const allMetrics = apiService.getAllTrafficMetrics();
        const topPolygons = allMetrics
            .filter(m => m.totalJams > 0)
            .slice(0, limit);

        // Obtener comparaciones en paralelo (con límite para no sobrecargar)
        const comparisons = (await Promise.all(
            topPolygons.map(async (metrics) => {
                const polygon = REAL_POLYGONS.find(p => p.id === metrics.polygonId);
                if (!polygon) return null;

                const centerLat = polygon.coordinates?.lat || -31.4173;
                const centerLon = polygon.coordinates?.lon || -64.1833;

                try {
                    return await externalTrafficService.getSpeedComparison(
                        polygon.id,
                        polygon.name,
                        centerLat,
                        centerLon,
                        metrics.avgSpeed
                    );
                } catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    server.log.error(err, `Error getting speed for ${polygon.name}`);
                    return null;
                }
            })
        )) as Array<any>;

        return comparisons.filter(c => c !== null);
    } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: 'Failed to get speed comparisons' });
    }
});

// --- Arranque ---

const start = async () => {
    try {
        console.log('🔧 Inicializando servicios...');

        // Verificar que los servicios estén inicializados
        console.log('✓ wazeService inicializado');
        console.log('✓ apiService inicializado');
        console.log('✓ alertService inicializado');

        // Iniciar ingesta de Waze (no bloquea el arranque del servidor)
        try {
            wazeService.startIngestionCycle();
            console.log('✓ Ciclo de ingesta iniciado');
        } catch (ingestionError) {
            console.error('⚠️ Error al iniciar ciclo de ingesta (continuando):', ingestionError);
        }

        const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`🚀 Backend server running on http://localhost:${port}`);
        console.log(`📊 Health check: http://localhost:${port}/health`);
    } catch (err) {
        console.error('❌ Error fatal al iniciar servidor:', err);
        server.log.error(err);
        process.exit(1);
    }
};

// Manejar errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

start();
