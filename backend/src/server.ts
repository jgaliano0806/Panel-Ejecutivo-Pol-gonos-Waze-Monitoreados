import Fastify from 'fastify';
import cors from '@fastify/cors';
import { wazeService } from './services/wazeService';
import { ApiService } from './services/apiService';
import { alertService } from './services/alertService';
import { aggregationService } from './services/aggregationService';
import { historicalService } from './services/historicalService';
import { dbService } from './database/dbService';
import { dataQualityService } from './services/dataQualityService';
import { incidentStatsService } from './services/incidentStatsService';
import { externalTrafficService } from './services/externalTrafficService';
import { delayCalculationService } from './services/delayCalculationService';
import { IncidentsHistoryService } from './services/incidentsHistoryService';
import { DailyStatsService } from './services/dailyStatsService';
import { WeatherService } from './services/weatherService';
import { REAL_POLYGONS } from './config/realPolygons';
import dotenv from 'dotenv';

dotenv.config();

// Instancia del servicio de API (evita problemas de import/export en TS runtime)
const apiService = new ApiService();
const incidentsHistoryService = new IncidentsHistoryService();
const dailyStatsService = new DailyStatsService();
const weatherService = new WeatherService();

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
        const dbConnected = await dbService.testConnection();
        return {
            status: 'ok',
            uptime: process.uptime(),
            lastWazeUpdate: wazeService.getLastUpdate(),
            memory: process.memoryUsage(),
            alertsCount: wazeService.getAlerts().length,
            jamsCount: wazeService.getJams().length,
            database: dbConnected ? 'connected' : 'disconnected',
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
    } catch (_error) {
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
        return alertService.getAlertsBySeverity(severity as 'critical' | 'high' | 'medium' | 'low');
    } catch (_error) {
        reply.code(500).send({ error: 'Failed to get alerts by severity' });
    }
});

server.get('/api/alerts/polygon/:polygonId', async (request, reply) => {
    try {
        const { polygonId } = request.params as { polygonId: string };
        return alertService.getAlertsByPolygon(polygonId);
    } catch (_error) {
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
        const limit = parseInt((request.query as { limit?: string })?.limit || '10');
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
        const hours = parseInt((request.query as { hours?: string })?.hours || '24');
        const snapshots = await historicalService.getGlobalSnapshots(hours);
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
        const hours = parseInt((request.query as { hours?: string })?.hours || '24');
        const snapshots = await historicalService.getPolygonSnapshots(polygonId, hours);
        return snapshots;
    } catch (_error) {
        reply.code(500).send({ error: 'Failed to get polygon historical data' });
    }
});

server.get('/api/historical/trends', async (request, reply) => {
    try {
        const [totalJams, avgSpeed, criticalKm, avgDelay] = await Promise.all([
            historicalService.calculateTrends('totalJams'),
            historicalService.calculateTrends('avgSpeed'),
            historicalService.calculateTrends('criticalKm'),
            historicalService.calculateTrends('avgDelay'),
        ]);
        return {
            totalJams: totalJams || { current: 0, trend: 'stable', percentChange: 0 },
            avgSpeed: avgSpeed || { current: 0, trend: 'stable', percentChange: 0 },
            criticalKm: criticalKm || { current: 0, trend: 'stable', percentChange: 0 },
            avgDelay: avgDelay || { current: 0, trend: 'stable', percentChange: 0 },
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
        return await historicalService.getDataAvailability();
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
        const maxAge = parseInt((request.query as { maxAge?: string })?.maxAge || '30'); // minutos
        const incidents = wazeService.getAlerts();
        const stale = dataQualityService.detectStaleIncidents(incidents, maxAge);
        return stale;
    } catch (_error) {
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

// --- Endpoints de Cálculo Mejorado de Demoras ---

/**
 * GET /api/incidents/delay/:incidentId
 * Calcula la demora mejorada para un incidente específico
 * Usa: proximidad geográfica, estimación de desvío, y datos históricos
 */
server.get('/api/incidents/delay/:incidentId', async (request, reply) => {
    try {
        const { incidentId } = request.params as { incidentId: string };

        const alerts = wazeService.getAlerts();
        const jams = wazeService.getJams();
        const incident = alerts.find(a => a.id === incidentId);

        if (!incident) {
            reply.code(404).send({ error: 'Incident not found' });
            return;
        }

        // Obtener datos históricos si están disponibles
        const historicalData = await historicalService.getGlobalSnapshots(24);

        const delayResult = delayCalculationService.calculateIncidentDelay(
            incident,
            jams,
            historicalData
        );

        return {
            incidentId,
            incidentType: incident.type,
            incidentSubtype: incident.subtype,
            location: incident.location,
            street: incident.street,
            ...delayResult,
        };
    } catch (error) {
        server.log.error({ error }, 'Error calculating incident delay');
        reply.code(500).send({ error: 'Failed to calculate incident delay' });
    }
});

/**
 * GET /api/incidents/delays/all
 * Calcula demoras mejoradas para todos los incidentes activos
 */
server.get('/api/incidents/delays/all', async (request, reply) => {
    try {
        const alerts = wazeService.getAlerts();
        const jams = wazeService.getJams();
        const historicalData = await historicalService.getGlobalSnapshots(24);

        const delayResults = delayCalculationService.calculateBatchDelays(
            alerts,
            jams,
            historicalData
        );

        // Convertir Map a objeto para la respuesta JSON
        const results: any[] = [];
        delayResults.forEach((delay, incidentId) => {
            const incident = alerts.find(a => a.id === incidentId);
            if (incident) {
                results.push({
                    incidentId,
                    incidentType: incident.type,
                    incidentSubtype: incident.subtype,
                    street: incident.street,
                    polygonId: incident.polygonId,
                    ...delay,
                });
            }
        });

        // Ordenar por demora total descendente
        results.sort((a, b) => b.totalDelaySeconds - a.totalDelaySeconds);

        return {
            count: results.length,
            totalNetworkDelay: results.reduce((sum, r) => sum + r.totalDelaySeconds, 0),
            incidents: results,
        };
    } catch (error) {
        server.log.error({ error }, 'Error calculating batch delays');
        reply.code(500).send({ error: 'Failed to calculate batch delays' });
    }
});

/**
 * Calcula la distancia entre dos puntos geográficos (Haversine) en metros
 */
function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Agrupa incidentes por calle y proximidad geográfica para evitar duplicados
 */
function groupIncidentsByProximity(incidents: typeof wazeService extends { getAlerts: () => infer R } ? (R extends (infer T)[] ? T[] : never) : never, proximityThreshold: number = 200) {
    const groups: Array<{
        primary: typeof incidents[0];
        related: typeof incidents[0][];
        allLocations: Array<{ lat: number; lng: number; id: string }>;
    }> = [];

    const processed = new Set<string>();

    for (const incident of incidents) {
        if (processed.has(incident.id)) continue;

        // Buscar incidentes relacionados (misma calle O proximidad geográfica)
        const related: typeof incidents[0][] = [];
        const allLocations: Array<{ lat: number; lng: number; id: string }> = [
            { lat: incident.location.lat, lng: incident.location.lng, id: incident.id }
        ];

        for (const other of incidents) {
            if (other.id === incident.id || processed.has(other.id)) continue;

            const sameStreet = incident.street && other.street &&
                incident.street.toLowerCase() === other.street.toLowerCase();

            const distance = calculateDistanceMeters(
                incident.location.lat, incident.location.lng,
                other.location.lat, other.location.lng
            );

            const sameType = incident.type.toLowerCase() === other.type.toLowerCase();

            // Agrupar si: (misma calle Y mismo tipo) O (muy cerca Y mismo tipo)
            if (sameType && (sameStreet || distance <= proximityThreshold)) {
                related.push(other);
                allLocations.push({ lat: other.location.lat, lng: other.location.lng, id: other.id });
                processed.add(other.id);
            }
        }

        processed.add(incident.id);

        // Elegir el incidente "primario" (el más reciente o con más confianza)
        const allIncidents = [incident, ...related];
        const primary = allIncidents.reduce((best, current) => {
            const bestScore = (best.confidence || 0) + (best.reliability || 0);
            const currentScore = (current.confidence || 0) + (current.reliability || 0);
            return currentScore > bestScore ? current : best;
        }, incident);

        groups.push({ primary, related, allLocations });
    }

    return groups;
}

/**
 * GET /api/incidents/blocking-analysis
 * Análisis completo de incidentes bloqueantes con cálculo mejorado de demora
 * Incluye deduplicación por calle y proximidad geográfica
 */
server.get('/api/incidents/blocking-analysis', async (request, reply) => {
    try {
        const alerts = wazeService.getAlerts();
        const jams = wazeService.getJams();
        const historicalData = await historicalService.getGlobalSnapshots(24);

        // Filtrar solo incidentes que podrían ser bloqueantes
        const blockingTypes = ['ROAD_CLOSED', 'road_closed', 'ACCIDENT', 'accident', 'HAZARD', 'hazard'];
        const potentialBlockingIncidents = alerts.filter(a =>
            blockingTypes.some(t => a.type.toLowerCase().includes(t.toLowerCase())) ||
            a.severity >= 4
        );

        // Agrupar incidentes para evitar duplicados
        const groupedIncidents = groupIncidentsByProximity(potentialBlockingIncidents, 200);

        const analyses = groupedIncidents.map(group => {
            const incident = group.primary;
            const delayResult = delayCalculationService.calculateIncidentDelay(
                incident,
                jams,
                historicalData
            );

            // Encontrar jams relacionados directamente (de todos los incidentes del grupo)
            const allIncidentIds = [incident.id, ...group.related.map(r => r.id)];
            const linkedJams = jams.filter(j => allIncidentIds.includes(j.blockingAlertUuid || ''));
            const totalLength = linkedJams.reduce((sum, j) => sum + j.length, 0);

            // Encontrar jams cercanos (excluyendo los vinculados)
            const linkedJamIds = new Set(linkedJams.map(j => j.id));
            const nearbyJams = jams.filter(j => {
                if (linkedJamIds.has(j.id)) return false;
                const distance = calculateDistanceMeters(
                    incident.location.lat,
                    incident.location.lng,
                    j.location.lat,
                    j.location.lng
                );
                return distance <= 300; // Radio de 300 metros
            });

            // Obtener calles afectadas de jams vinculados y cercanos
            const affectedStreets = [...new Set([
                ...linkedJams.map(j => j.street),
                ...nearbyJams.map(j => j.street)
            ].filter(Boolean))] as string[];

            // Obtener info del polígono
            const polygon = incident.polygonId ? REAL_POLYGONS.find(p => p.id === incident.polygonId) : null;

            // Calcular antigüedad más antigua del grupo
            const allTimestamps = [incident.timestamp, ...group.related.map(r => r.timestamp)];
            const oldestTimestamp = allTimestamps.reduce((oldest, current) =>
                new Date(current) < new Date(oldest) ? current : oldest
            );

            return {
                incident: {
                    id: incident.id,
                    type: incident.type,
                    subtype: incident.subtype,
                    description: incident.description, // Contiene reportDescription si está disponible
                    street: incident.street,
                    city: incident.city,
                    severity: incident.severity,
                    polygonId: incident.polygonId,
                    location: incident.location,
                    timestamp: oldestTimestamp, // Usar la fecha más antigua
                },
                delay: delayResult,
                linkedJams: linkedJams.length,
                affectedLength: totalLength,
                affectedLengthKm: (totalLength / 1000).toFixed(2),
                impactScore: Math.round(
                    (delayResult.totalDelayMinutes * 0.4) +
                    (linkedJams.length * 10) +
                    (totalLength / 100) +
                    (group.related.length * 5) // Bonus por múltiples reportes
                ),
                // Información del grupo para deduplicación
                reportCount: 1 + group.related.length,
                allLocations: group.allLocations,
                relatedIncidentIds: group.related.map(r => r.id),
                // Nuevos campos: grupo y tramos afectados
                nearbyJams: nearbyJams.length,
                polygonName: polygon?.name || null,
                polygonGroup: polygon?.group || null,
                affectedStreets: affectedStreets,
            };
        });

        // Ordenar por impacto
        analyses.sort((a, b) => b.impactScore - a.impactScore);

        const totalOriginalIncidents = potentialBlockingIncidents.length;
        const totalGroupedIncidents = analyses.length;

        return {
            count: analyses.length,
            analyses: analyses.slice(0, 20), // Top 20
            summary: {
                totalIncidents: totalGroupedIncidents,
                totalReports: totalOriginalIncidents,
                duplicatesRemoved: totalOriginalIncidents - totalGroupedIncidents,
                totalDelayMinutes: analyses.reduce((sum, a) => sum + a.delay.totalDelayMinutes, 0),
                avgConfidence: analyses.length > 0
                    ? Math.round(analyses.reduce((sum, a) => sum + a.delay.confidence, 0) / analyses.length)
                    : 0,
            },
        };
    } catch (error) {
        server.log.error({ error }, 'Error in blocking analysis');
        reply.code(500).send({ error: 'Failed to get blocking analysis' });
    }
});

// --- Endpoints de Velocidad Externa ---

/**
 * Calcula el centro aproximado de un polígono desde los datos de Waze
 * Si el polígono tiene coordenadas configuradas, las usa.
 * Si no, calcula el centro desde los incidentes y jams activos del polígono.
 * Si no hay datos, usa las coordenadas por defecto de Córdoba.
 */
function calculatePolygonCenter(polygonId: string): { lat: number; lon: number } {
    const polygon = REAL_POLYGONS.find(p => p.id === polygonId);

    // Si el polígono tiene coordenadas configuradas, usarlas
    if (polygon?.coordinates?.lat && polygon?.coordinates?.lon) {
        return {
            lat: polygon.coordinates.lat,
            lon: polygon.coordinates.lon
        };
    }

    // Intentar calcular desde los datos de Waze
    const alerts = wazeService.getAlerts().filter(a => a.polygonId === polygonId);
    const jams = wazeService.getJams().filter(j => j.polygonId === polygonId);

    const locations: Array<{ lat: number; lon: number }> = [];

    // Agregar ubicaciones de alertas
    alerts.forEach(alert => {
        if (alert.location?.lat && alert.location?.lng) {
            locations.push({ lat: alert.location.lat, lon: alert.location.lng });
        }
    });

    // Agregar ubicaciones de jams
    jams.forEach(jam => {
        if (jam.location?.lat && jam.location?.lng) {
            locations.push({ lat: jam.location.lat, lon: jam.location.lng });
        }
    });

    // Si hay ubicaciones, calcular el centro promedio
    if (locations.length > 0) {
        const avgLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
        const avgLon = locations.reduce((sum, loc) => sum + loc.lon, 0) / locations.length;
        return { lat: avgLat, lon: avgLon };
    }

    // Fallback: coordenadas por defecto de Córdoba
    return { lat: -31.4173, lon: -64.1833 };
}

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

        // Calcular centro del polígono (desde config, datos de Waze, o fallback)
        const center = calculatePolygonCenter(polygonId);
        const centerLat = center.lat;
        const centerLon = center.lon;

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
        const limit = parseInt((request.query as { limit?: string })?.limit || '10');

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

                // Calcular centro del polígono (desde config, datos de Waze, o fallback)
                const center = calculatePolygonCenter(metrics.polygonId);
                const centerLat = center.lat;
                const centerLon = center.lon;

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

// ===========================================
// ENDPOINTS: HISTORIAL DE INCIDENTES
// ===========================================

// GET /api/historical/incidents - Obtener historial de incidentes
server.get('/api/historical/incidents', async (request, reply) => {
    try {
        const { polygon_id, type, from, to, limit } = request.query as {
            polygon_id?: string;
            type?: string;
            from?: string;
            to?: string;
            limit?: string;
        };

        const incidents = await incidentsHistoryService.getIncidents({
            polygon_id,
            type,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
            limit: limit ? parseInt(limit) : 100
        });

        reply.send(incidents);
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        server.log.error(err, 'Error getting incidents history');
        reply.code(500).send({ error: 'Failed to get incidents history' });
    }
});

// GET /api/historical/incidents/hotspots - Puntos negros
server.get('/api/historical/incidents/hotspots', async (request, reply) => {
    try {
        const { min_incidents, radius_meters, from, to, limit } = request.query as {
            min_incidents?: string;
            radius_meters?: string;
            from?: string;
            to?: string;
            limit?: string;
        };

        const hotspots = await incidentsHistoryService.getHotspots({
            min_incidents: min_incidents ? parseInt(min_incidents) : 5,
            radius_meters: radius_meters ? parseInt(radius_meters) : 500,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
            limit: limit ? parseInt(limit) : 10
        });

        reply.send(hotspots);
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        server.log.error(err, 'Error getting hotspots');
        reply.code(500).send({ error: 'Failed to get hotspots' });
    }
});

// GET /api/historical/incidents/stats - Estadísticas de incidentes
server.get('/api/historical/incidents/stats', async (request, reply) => {
    try {
        const { polygon_id, group_by, from, to } = request.query as {
            polygon_id?: string;
            group_by?: 'type' | 'hour' | 'day';
            from?: string;
            to?: string;
        };

        if (!group_by || !['type', 'hour', 'day'].includes(group_by)) {
            reply.code(400).send({ error: 'group_by must be one of: type, hour, day' });
            return;
        }

        const stats = await incidentsHistoryService.getIncidentStats({
            polygon_id,
            group_by,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined
        });

        reply.send(stats);
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        server.log.error(err, 'Error getting incident stats');
        reply.code(500).send({ error: 'Failed to get incident stats' });
    }
});

// ===========================================
// ENDPOINTS: ESTADÍSTICAS DIARIAS
// ===========================================

// GET /api/stats/daily - Estadísticas diarias
server.get('/api/stats/daily', async (request, reply) => {
    try {
        const { from, to } = request.query as {
            from?: string;
            to?: string;
        };

        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();

        const stats = await dailyStatsService.getDailyStats(fromDate, toDate);
        reply.send(stats);
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        server.log.error(err, 'Error getting daily stats');
        reply.code(500).send({ error: 'Failed to get daily stats' });
    }
});

// GET /api/stats/weekly - Estadísticas semanales
server.get('/api/stats/weekly', async (request, reply) => {
    try {
        const { from, to } = request.query as {
            from?: string;
            to?: string;
        };

        const fromDate = from ? new Date(from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();

        const stats = await dailyStatsService.getWeeklyStats(fromDate, toDate);
        reply.send(stats);
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        server.log.error(err, 'Error getting weekly stats');
        reply.code(500).send({ error: 'Failed to get weekly stats' });
    }
});

// GET /api/stats/monthly - Estadísticas mensuales
server.get('/api/stats/monthly', async (request, reply) => {
    try {
        const { from, to } = request.query as {
            from?: string;
            to?: string;
        };

        const fromDate = from ? new Date(from) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();

        const stats = await dailyStatsService.getMonthlyStats(fromDate, toDate);
        reply.send(stats);
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        server.log.error(err, 'Error getting monthly stats');
        reply.code(500).send({ error: 'Failed to get monthly stats' });
    }
});

// ===========================================
// ENDPOINTS: CLIMA (POC)
// ===========================================

// GET /api/weather/:polygon_id - Obtener clima actual de un polígono
server.get('/api/weather/:polygon_id', async (request, reply) => {
    try {
        const { polygon_id } = request.params as { polygon_id: string };

        // Buscar el polígono en la configuración
        const polygon = REAL_POLYGONS.find(p => p.id === polygon_id);
        if (!polygon) {
            reply.code(404).send({ error: 'Polygon not found' });
            return;
        }

        // Obtener coordenadas del polígono
        if (!polygon.coordinates) {
            reply.code(400).send({ error: 'Polygon coordinates not available' });
            return;
        }
        const centerLat = polygon.coordinates.lat;
        const centerLon = polygon.coordinates.lon;

        // Obtener datos del clima
        const weatherData = await weatherService.fetchWeatherForPolygon(
            polygon_id,
            centerLat,
            centerLon
        );

        if (!weatherData) {
            reply.code(503).send({ error: 'Weather service unavailable' });
            return;
        }

        // Guardar en base de datos
        await weatherService.saveWeatherData(weatherData);

        reply.send(weatherData);
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        server.log.error(err, 'Error getting weather data');
        reply.code(500).send({ error: 'Failed to get weather data' });
    }
});

// GET /api/weather/:polygon_id/history - Historial de clima
server.get('/api/weather/:polygon_id/history', async (request, reply) => {
    try {
        const { polygon_id } = request.params as { polygon_id: string };
        const { from, to } = request.query as {
            from?: string;
            to?: string;
        };

        const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();

        const history = await weatherService.getWeatherHistory(
            polygon_id,
            fromDate,
            toDate
        );

        reply.send(history);
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        server.log.error(err, 'Error getting weather history');
        reply.code(500).send({ error: 'Failed to get weather history' });
    }
});

// GET /api/weather/alerts - Alertas meteorológicas activas
server.get('/api/weather/alerts', async (request, reply) => {
    try {
        const alerts = await weatherService.getActiveWeatherAlerts();
        reply.send(alerts);
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        server.log.error(err, 'Error getting weather alerts');
        reply.code(500).send({ error: 'Failed to get weather alerts' });
    }
});

// GET /api/weather/all - Clima de todos los polígonos
server.get('/api/weather/all', async (request, reply) => {
    try {
        const weatherPromises = REAL_POLYGONS.filter(p => p.coordinates).map(async (polygon) => {
            const centerLat = polygon.coordinates!.lat;
            const centerLon = polygon.coordinates!.lon;

            const weather = await weatherService.fetchWeatherForPolygon(
                polygon.id,
                centerLat,
                centerLon
            );

            if (weather) {
                await weatherService.saveWeatherData(weather);
            }

            return {
                polygon_id: polygon.id,
                polygon_name: polygon.name,
                weather
            };
        });

        const results = await Promise.all(weatherPromises);
        reply.send(results);
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        server.log.error(err, 'Error getting all weather data');
        reply.code(500).send({ error: 'Failed to get all weather data' });
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
