import Fastify from 'fastify';
import cors from '@fastify/cors';
import { wazeService } from './services/wazeService';
import { apiService } from './services/apiService';
import { alertService } from './services/alertService';
import { aggregationService } from './services/aggregationService';
import { historicalService } from './services/historicalService';
import { dataQualityService } from './services/dataQualityService';
import dotenv from 'dotenv';

dotenv.config();

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
server.setErrorHandler((error, request, reply) => {
    server.log.error(error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    reply.status(500).send({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? errorMessage : 'Something went wrong'
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
    return {
        status: 'ok',
        uptime: process.uptime(),
        lastWazeUpdate: wazeService.getLastUpdate(),
        memory: process.memoryUsage()
    };
});

server.get('/api/polygons', async (request, reply) => {
    try {
        const polygons = apiService.getPolygonsStatus();
        return polygons;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get polygons status' });
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
        reply.code(500).send({ error: 'Failed to get global KPIs' });
    }
});

server.get('/api/incidents/all', async (request, reply) => {
    try {
    return wazeService.getAlerts();
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get incidents' });
    }
});

server.get('/api/jams/all', async (request, reply) => {
    try {
    return wazeService.getJams();
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get traffic jams' });
    }
});

server.get('/api/traffic-metrics', async (request, reply) => {
    try {
        const metrics = apiService.getAllTrafficMetrics();
        return metrics;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get traffic metrics' });
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
        reply.code(500).send({ error: 'Failed to get polygon traffic metrics' });
    }
});

// --- Endpoints de Alertas ---

server.get('/api/alerts', async (request, reply) => {
    try {
        return alertService.getActiveAlerts();
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get alerts' });
    }
});

server.get('/api/alerts/stats', async (request, reply) => {
    try {
        return alertService.getAlertStats();
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get alert stats' });
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
        return snapshots;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get historical data' });
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
            totalJams: historicalService.calculateTrends('totalJams'),
            avgSpeed: historicalService.calculateTrends('avgSpeed'),
            criticalKm: historicalService.calculateTrends('criticalKm'),
            avgDelay: historicalService.calculateTrends('avgDelay'),
        };
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get trends' });
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

// --- Arranque ---

const start = async () => {
    try {
        // Iniciar ingesta de Waze
        wazeService.startIngestionCycle();

        const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`🚀 Backend server running on http://localhost:${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
