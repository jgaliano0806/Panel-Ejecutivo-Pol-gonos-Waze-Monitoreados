import axios from 'axios';
import {
    WazeFeedResponse,
    WazeTVTResponse,
    WazeTVTSegment,
    InternalAlert,
    InternalJam,
    IncidentType,
    Severity,
    WazeRawAlert,
    WazeRawJam
} from '../types';
import { REAL_POLYGONS, RealPolygonConfig } from '../config/realPolygons';
import { alertService } from './alertService';
import { historicalService } from './historicalService';
import { dataQualityService } from './dataQualityService';

/**
 * Servicio de Ingesta de Waze - VERSIÓN MULTI-FEED
 * - Fetch periódico a MÚLTIPLES feeds (uno por polígono)
 * - Normalización de datos
 * - Los datos ya vienen pre-asignados a cada polígono
 */
export class WazeService {
    private polygons: RealPolygonConfig[];
    private lastUpdate: Date = new Date(0);

    // In-memory store
    private currentAlerts: InternalAlert[] = [];
    private currentJams: InternalJam[] = [];
    private previousJams: InternalJam[] = []; // Para detectar cambios

    constructor() {
        this.polygons = REAL_POLYGONS;
        console.log(`📍 Configurados ${this.polygons.length} polígonos con feeds individuales`);

        // Iniciar auto-guardado de histórico
        historicalService.startAutoSave(() => ({
            jams: this.currentJams,
            incidents: this.currentAlerts
        }));
    }

    /**
     * Inicia el ciclo de ingesta
     */
    startIngestionCycle(intervalMs: number = 120000) { // 2 minutos por defecto
        console.log(`🚀 Iniciando ciclo de ingesta de ${this.polygons.length} feeds cada ${intervalMs / 1000} segundos...`);
        this.fetchAndProcess(); // Ejecutar inmediatamente
        setInterval(() => this.fetchAndProcess(), intervalMs);
    }

    /**
     * Obtiene y procesa TODOS los feeds en paralelo con optimizaciones
     */
    private async fetchAndProcess() {
        const startTime = Date.now();
        console.log(`📥 Fetching ${this.polygons.length} feeds de Waze...`);

        try {
            // Fetch todos los feeds en paralelo usando Promise.allSettled
            // con límite de concurrencia para no sobrecargar
            const results = await Promise.allSettled(
                this.polygons.map(poly => this.fetchPolygonFeed(poly))
            );

            // Consolidar resultados de forma más eficiente
            const allAlerts: InternalAlert[] = [];
            const allJams: InternalJam[] = [];
            let errors = 0;

            // Pre-allocar arrays con capacidad estimada
            allAlerts.length = 0;
            allJams.length = 0;

            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                if (result.status === 'fulfilled') {
                    const { alerts, jams } = result.value;
                    // Push individual es más rápido que spread en loops
                    for (const alert of alerts) allAlerts.push(alert);
                    for (const jam of jams) allJams.push(jam);
                } else {
                    errors++;
                    console.error(`❌ Error en feed ${this.polygons[i].name}:`, result.reason.message);
                }
            }

            // Detectar cambios en jams para alertas
            if (this.previousJams.length > 0) {
                const changeAlerts = alertService.detectJamLevelChanges(this.previousJams, allJams);
                if (changeAlerts.length > 0) {
                    console.log(`🔔 ${changeAlerts.length} cambios detectados en niveles de congestión`);
                }
            }

            // Evaluar situación actual y generar alertas (ahora incluye info de incidentes)
            const trafficAlerts = alertService.evaluateAllPolygons(allJams, allAlerts);
            console.log(`🚨 ${trafficAlerts.length} alertas activas generadas`);

            // Actualizar estado
            this.previousJams = this.currentJams; // Guardar estado anterior
            this.currentAlerts = allAlerts;
            this.currentJams = allJams;
            this.lastUpdate = new Date();

            // Limpiar alertas antiguas cada hora
            alertService.cleanOldAlerts();

            // MEJORA: Verificar límite de eventos de Waze (5000 max)
            const feedStatus = dataQualityService.checkFeedLimit(allAlerts, allJams);
            if (feedStatus.atLimit) {
                console.warn(`⚠️ LÍMITE ALCANZADO: ${feedStatus.totalEvents} eventos (100% del límite de Waze)`);
            } else if (feedStatus.nearLimit) {
                console.warn(`⚠️ Cerca del límite: ${feedStatus.totalEvents} eventos (${feedStatus.percentage}% del límite)`);
            }

            // MEJORA: Detectar y reportar incidentes obsoletos
            const staleIncidents = dataQualityService.detectStaleIncidents(allAlerts, 30);
            if (staleIncidents.length > 0) {
                console.log(`🕐 ${staleIncidents.length} incidentes probablemente obsoletos (>30 min con baja confianza)`);
            }

            // MEJORA: Reportar calidad de datos
            const qualityMetrics = dataQualityService.calculateQualityMetrics(allAlerts);
            console.log(`📊 Calidad de datos: ${qualityMetrics.qualityPercentage}% alta calidad (${qualityMetrics.highQualityIncidents}/${qualityMetrics.totalIncidents} incidentes)`);

            const duration = Date.now() - startTime;
            console.log(`✅ Feed procesado en ${duration}ms. Alertas: ${allAlerts.length}, Jams: ${allJams.length}, Errores: ${errors}/${this.polygons.length}`);

        } catch (error) {
            console.error('❌ Error crítico en fetchAndProcess:', error instanceof Error ? error.message : error);
        }
    }

    /**
     * Fetch de un solo feed de polígono (incidentes + TVT si está disponible)
     */
    private async fetchPolygonFeed(polygon: RealPolygonConfig): Promise<{ alerts: InternalAlert[]; jams: InternalJam[] }> {
        try {
            // Fetch paralelo de ambos feeds (incidentes y TVT)
            const promises: Promise<any>[] = [
                axios.get<WazeFeedResponse>(polygon.feedUrl, { timeout: 10000 })
            ];

            // Si tiene feed TVT, agregarlo
            if (polygon.tvtFeedUrl) {
                promises.push(
                    axios.get<WazeTVTResponse>(polygon.tvtFeedUrl, { timeout: 10000 })
                );
            }

            const results = await Promise.allSettled(promises);

            // Procesar feed de incidentes
            let alerts: InternalAlert[] = [];
            let jams: InternalJam[] = [];

            if (results[0].status === 'fulfilled') {
                const data = results[0].value.data;
                alerts = this.normalizeAlerts(data.alerts || [], polygon.id);
                jams = this.normalizeJams(data.jams || [], polygon.id);
            }

            // Procesar feed TVT si existe y fue exitoso
            if (polygon.tvtFeedUrl && results[1] && results[1].status === 'fulfilled') {
                const tvtData = results[1].value.data;
                const tvtJams = this.normalizeTVTSegments(tvtData.segments || [], polygon.id);
                // Combinar jams del feed normal con jams del feed TVT
                jams = [...jams, ...tvtJams];
            }

            return { alerts, jams };

        } catch (error) {
            // Loggear error pero no lanzar excepción para no romper el batch
            if (axios.isAxiosError(error)) {
                if (error.code === 'ECONNABORTED') {
                    throw new Error(`Timeout en ${polygon.name}`);
                }
                throw new Error(`HTTP ${error.response?.status || 'error'} en ${polygon.name}`);
            }
            throw error;
        }
    }

    /**
     * Normaliza alertas raw a formato interno
     * Ahora recibe el polygonId directamente (ya no necesita GeoService)
     */
    private normalizeAlerts(rawAlerts: WazeRawAlert[], polygonId: string): InternalAlert[] {
        return rawAlerts.map(alert => ({
            id: alert.uuid,
            polygonId, // Ya sabemos a qué polígono pertenece
            type: this.mapIncidentType(alert.type),
            subtype: alert.subtype,
            severity: this.calculateAlertSeverity(alert),
            description: alert.reportDescription || alert.subtype || alert.type,
            timestamp: new Date(alert.pubMillis),
            location: { lat: alert.location.y, lng: alert.location.x },
            street: alert.street,
            city: alert.city,
            reportRating: alert.reportRating,
            confidence: alert.confidence,
            reliability: alert.reliability,
            nThumbsUp: alert.nThumbsUp,
        }));
    }

    /**
     * Normaliza jams raw a formato interno
     */
    private normalizeJams(rawJams: WazeRawJam[], polygonId: string): InternalJam[] {
        return rawJams.map(jam => {
            const startPoint = jam.line && jam.line.length > 0 ? jam.line[0] : { x: 0, y: 0 };
            const endPoint = jam.line && jam.line.length > 1 ? jam.line[jam.line.length - 1] : null;

            return {
                id: jam.uuid || String(jam.id),
                polygonId, // Ya sabemos a qué polígono pertenece
                speed: this.calculateSpeedKmh(jam),
                delay: jam.delay,
                severity: this.mapJamSeverity(jam.level),
                length: jam.length,
                timestamp: new Date(jam.pubMillis),
                location: { lat: startPoint.y, lng: startPoint.x },
                endLocation: endPoint ? { lat: endPoint.y, lng: endPoint.x } : undefined,
                level: jam.level,
                street: jam.street,
                city: jam.city,
                roadType: jam.roadType,
                turnType: jam.turnType,
                blockingAlertUuid: jam.blockingAlertUuid,
                source: 'waze' as const, // Jams de Waze feeds (con coordenadas)
            };
        });
    }

    /**
     * Normaliza segmentos TVT a formato de jams interno
     */
    private normalizeTVTSegments(segments: WazeTVTSegment[], polygonId: string): InternalJam[] {
        return segments
            // AHORA incluimos jamLevel 0 para detectar tráfico fluido
            .filter(seg => seg.jamLevel >= 0)
            .map(seg => ({
                id: `tvt-${polygonId}-${seg.id}`,
                polygonId,
                speed: seg.speed,
                delay: seg.delay,
                severity: this.mapJamSeverity(seg.jamLevel),
                length: seg.length,
                timestamp: new Date(),
                location: { lat: 0, lng: 0 }, // TVT no provee coordenadas exactas
                level: seg.jamLevel,
                street: `${seg.from} → ${seg.to}`,
                roadType: undefined,
                turnType: undefined,
                blockingAlertUuid: undefined,
                source: 'tvt' as const, // Jams de TVT feeds (sin coordenadas)
            }));
    }

    // --- Helpers (sin cambios) ---

    private mapIncidentType(type: string): IncidentType {
        const map: Record<string, IncidentType> = {
            'ACCIDENT': IncidentType.ACCIDENT,
            'JAM': IncidentType.JAM,
            'WEATHERHAZARD': IncidentType.WEATHERHAZARD,
            'HAZARD': IncidentType.HAZARD,
            'MISC': IncidentType.HAZARD,
            'CONSTRUCTION': IncidentType.CONSTRUCTION,
            'ROAD_CLOSED': IncidentType.ROADCLOSED,
        };
        return map[type] || IncidentType.HAZARD;
    }

    private calculateAlertSeverity(alert: WazeRawAlert): Severity {
        if (alert.type === 'ACCIDENT') return Severity.HIGH;
        if (alert.type === 'ROAD_CLOSED') return Severity.CRITICAL;
        if (alert.type === 'JAM') return Severity.MEDIUM;
        return Severity.LOW;
    }

    private mapJamSeverity(level: number): Severity {
        if (level >= 4) return Severity.CRITICAL;
        if (level === 3) return Severity.HIGH;
        if (level === 2) return Severity.MEDIUM;
        return Severity.LOW;
    }

    private calculateSpeedKmh(jam: WazeRawJam): number {
        if (jam.speedKMH) return jam.speedKMH;
        return Math.round(jam.speed * 3.6);
    }

    // --- Public Accessors ---

    getAlerts(): InternalAlert[] {
        try {
            return this.currentAlerts || [];
        } catch (error) {
            console.error('Error en getAlerts:', error);
            return [];
        }
    }

    getJams(): InternalJam[] {
        try {
            return this.currentJams || [];
        } catch (error) {
            console.error('Error en getJams:', error);
            return [];
        }
    }

    getLastUpdate(): Date {
        return this.lastUpdate;
    }
}

export const wazeService = new WazeService();
