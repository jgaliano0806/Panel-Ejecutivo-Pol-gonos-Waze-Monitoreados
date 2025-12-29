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
import { roadAccidentService } from './roadAccidentService';
import { weatherService } from './weatherService';

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

            // --- AUTO-CAPTURA DE SINIESTROS VIALES (CRÍTICO) ---
            // Ejecutar en paralelo para no bloquear el flujo principal, pero asegurar que se ejecute
            this.autoCaptureAccidents(allAlerts).catch(error => {
                console.error('❌ ERROR CRÍTICO en auto-captura de siniestros (no debe fallar):', error);
                if (error instanceof Error) {
                    console.error('   Mensaje:', error.message);
                    console.error('   Stack:', error.stack);
                }
                // No lanzar el error para no interrumpir el flujo principal
            });

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
                alerts = this.normalizeAlerts(data.alerts || [], polygon.id, data.alerts || []);
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
     * Ahora recibe el polygonId directamente
     */
    private normalizeAlerts(rawAlerts: WazeRawAlert[], polygonId: string, originalRaw: WazeRawAlert[]): InternalAlert[] {
        return rawAlerts.map((alert, index) => ({
            id: alert.uuid,
            polygonId,
            type: this.mapIncidentType(alert.type),
            subtype: alert.subtype,

            // Debug: log de subtipos
            _debug_subtype: alert.subtype,
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
            raw: originalRaw[index] // Guardar 100% de los datos originales
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
                line: jam.line, // Línea completa para dibujar en mapa
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

    /**
     * Calcula la severidad de un alert usando datos de Waze
     * Mejora: Ahora considera confidence, reliability y nThumbsUp del feed
     */
    private calculateAlertSeverity(alert: WazeRawAlert): Severity {
        // Base por tipo de incidente
        let baseSeverity: Severity;
        if (alert.type === 'ROAD_CLOSED') {
            baseSeverity = Severity.CRITICAL; // 4
        } else if (alert.type === 'ACCIDENT') {
            baseSeverity = Severity.HIGH; // 3
        } else if (alert.type === 'JAM') {
            baseSeverity = Severity.MEDIUM; // 2
        } else {
            baseSeverity = Severity.LOW; // 1
        }

        // Ajustar según métricas de calidad de Waze
        const confidence = alert.confidence || 0;
        const reliability = alert.reliability || 0;
        const nThumbsUp = alert.nThumbsUp || 0;

        // Si tiene alta confianza (>=7) y muchas confirmaciones (>=5), aumentar severidad
        // Esto indica que el incidente es real y está causando impacto
        if (confidence >= 7 && nThumbsUp >= 5 && baseSeverity < Severity.CRITICAL) {
            // Aumentar un nivel si no es ya CRITICAL
            return (baseSeverity + 1) as Severity;
        }

        // Si tiene muy alta confianza (>=9) y muchas confirmaciones (>=10), puede ser CRITICAL
        if (confidence >= 9 && nThumbsUp >= 10 && baseSeverity < Severity.CRITICAL) {
            return Severity.CRITICAL;
        }

        // Si tiene baja confianza (<3) y pocas confirmaciones (<2), reducir severidad
        // Esto indica que el reporte puede ser dudoso o ya resuelto
        if (confidence < 3 && nThumbsUp < 2 && baseSeverity > Severity.LOW) {
            // Reducir un nivel si no es ya LOW
            return (baseSeverity - 1) as Severity;
        }

        // Si tiene baja confiabilidad (<3), también considerar reducir
        if (reliability < 3 && baseSeverity > Severity.LOW) {
            // Reducir un nivel adicional si la confiabilidad es muy baja
            const adjusted = (baseSeverity - 1) as Severity;
            return adjusted < Severity.LOW ? Severity.LOW : adjusted;
        }

        // Caso especial: ACCIDENT con alta confianza y confirmaciones puede ser CRITICAL
        if (alert.type === 'ACCIDENT' && confidence >= 8 && nThumbsUp >= 8) {
            return Severity.CRITICAL;
        }

        return baseSeverity;
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

    /**
     * Detecta nuevos accidentes en el feed y los registra automáticamente
     */
    private async autoCaptureAccidents(alerts: InternalAlert[]) {
        try {
            // Log todos los tipos de incidentes para debugging
            const typeCounts = alerts.reduce((acc, a) => {
                acc[a.type] = (acc[a.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            console.log(`📊 Tipos de incidentes en el feed:`, typeCounts);

            // Filtrar accidentes por tipo (case-insensitive)
            const accidents = alerts.filter(a => {
                const typeLower = a.type?.toLowerCase();
                return typeLower === 'accident' || typeLower === IncidentType.ACCIDENT.toLowerCase();
            });

            // También buscar por subtipo que pueda indicar accidente
            const accidentBySubtype = alerts.filter(a => {
                if (a.type?.toLowerCase() === 'accident') return false; // Ya está en accidents
                return a.subtype && (
                    a.subtype.toUpperCase().includes('ACCIDENT') ||
                    a.subtype.toUpperCase().includes('SINIESTRO') ||
                    a.subtype.toUpperCase().includes('CRASH') ||
                    a.subtype.toUpperCase().includes('COLLISION')
                );
            });

            if (accidentBySubtype.length > 0) {
                console.log(`⚠️ Detectados ${accidentBySubtype.length} incidente(s) con subtipo de accidente pero tipo diferente:`,
                    accidentBySubtype.map(a => ({ id: a.id, type: a.type, subtype: a.subtype }))
                );
            }

            // Log detallado de accidentes detectados
            if (accidents.length > 0) {
                console.log(`🚨 Accidentes detectados por tipo (${accidents.length}):`,
                    accidents.map(a => ({
                        id: a.id,
                        type: a.type,
                        subtype: a.subtype,
                        street: a.street,
                        severity: a.severity
                    }))
                );
            }

            if (accidents.length === 0 && accidentBySubtype.length === 0) {
                console.log('ℹ️ No se detectaron accidentes en este ciclo de ingesta');
                return;
            }

            const allAccidents = [...accidents, ...accidentBySubtype];
            console.log(`🔍 Detectados ${allAccidents.length} accidente(s) en el feed (${accidents.length} por tipo, ${accidentBySubtype.length} por subtipo). Verificando si ya están registrados...`);

            // Obtener siniestros ya registrados para no duplicar (aumentar límite para mejor detección)
            let existingAccidents: any[] = [];
            let existingIds = new Set<string>();

            try {
                existingAccidents = await roadAccidentService.getAccidents({ limit: 1000 });
                existingIds = new Set(existingAccidents.map(a => a.incident_id).filter(id => id !== null && id !== undefined));
                console.log(`📋 Accidentes ya registrados en BD: ${existingIds.size} (IDs: ${Array.from(existingIds).slice(0, 5).join(', ')}${existingIds.size > 5 ? '...' : ''})`);
            } catch (dbError) {
                console.error('⚠️ Error al obtener accidentes existentes (puede que la tabla no exista):', dbError);
                if (dbError instanceof Error) {
                    console.error('   Mensaje:', dbError.message);
                    console.error('   Stack:', dbError.stack);
                }
                // Continuar de todas formas, puede que sea la primera vez
                // Pero registrar todos los accidentes sin verificar duplicados
                console.warn('⚠️ Continuando sin verificación de duplicados. Se intentará registrar todos los accidentes.');
            }

            let registeredCount = 0;
            let skippedCount = 0;
            let errorCount = 0;

            for (const accident of allAccidents) {
                // Verificar si ya existe (solo si pudimos obtener la lista)
                if (existingIds.size > 0 && existingIds.has(accident.id)) {
                    skippedCount++;
                    console.log(`⏭️ Accident ${accident.id} ya está registrado. Omitiendo...`);
                    continue;
                }

                try {
                    console.log(`🆕 Auto-capturando nuevo accidente: ${accident.street || 'Sin calle'} (ID: ${accident.id}, Tipo: ${accident.type}, Subtipo: ${accident.subtype || 'N/A'})`);

                    // Validar que tenemos los datos mínimos requeridos PRIMERO
                    if (!accident.location || accident.location.lat === undefined || accident.location.lng === undefined) {
                        console.error(`❌ Accident ${accident.id} no tiene coordenadas válidas. Saltando...`);
                        errorCount++;
                        continue;
                    }

                    // Obtener clima para el accidente (no crítico, continuar sin clima si falla)
                    let weatherData = null;
                    // Intentar obtener clima siempre que tengamos coordenadas
                    if (accident.location && accident.location.lat && accident.location.lng) {
                        try {
                            // Primero intentar obtener del polígono si existe
                            if (accident.polygonId) {
                                try {
                                    weatherData = await weatherService.getLatestWeather(accident.polygonId);
                                } catch (polygonError) {
                                    // Continuar para intentar fetch directo
                                }
                            }

                            // Si no hay clima del polígono, obtenerlo directamente de la API (AccuWeather u Open-Meteo)
                            if (!weatherData) {
                                const polygonId = accident.polygonId || `auto-accident-${accident.id}`;
                                weatherData = await weatherService.fetchWeatherForPolygon(
                                    polygonId,
                                    accident.location.lat,
                                    accident.location.lng
                                );

                                if (weatherData) {
                                    console.log(`🌤️ Clima obtenido de API (${process.env.WEATHER_PROVIDER || 'openmeteo'}) para accidente ${accident.id}`);
                                }
                            }
                        } catch (weatherError) {
                            console.warn(`⚠️ No se pudo obtener clima para accidente ${accident.id}:`, weatherError);
                            // Continuar sin clima - NO ES CRÍTICO
                        }
                    }

                    // Asegurar que el tipo sea 'accident' (normalizar)
                    const normalizedType = accident.type?.toLowerCase() === 'accident' ? 'accident' : 'ACCIDENT';

                    // Crear registro formal de siniestro (CRÍTICO - debe funcionar)
                    const created = await roadAccidentService.createAccident({
                        incident_id: accident.id,
                        waze_data: (accident as any).raw || accident, // Priorizar datos 100% crudos
                        weather_data: weatherData || {},
                        type: normalizedType,
                        subtype: accident.subtype,
                        severity: accident.severity,
                        street: accident.street,
                        location_lat: accident.location.lat,
                        location_lng: accident.location.lng,
                        accident_at: accident.timestamp
                    });

                    registeredCount++;
                    console.log(`✅ Siniestro registrado con éxito: ${accident.id} (UUID: ${created.id}, Tipo: ${normalizedType}, Calle: ${accident.street || 'N/A'})`);
                } catch (createError) {
                    errorCount++;
                    console.error(`❌ ERROR CRÍTICO al crear siniestro ${accident.id}:`, createError);
                    if (createError instanceof Error) {
                        console.error(`   Mensaje: ${createError.message}`);
                        console.error(`   Stack: ${createError.stack}`);

                        // Si es un error de duplicado, no es crítico
                        if (createError.message.includes('duplicate') || createError.message.includes('ya existe')) {
                            console.warn(`   ⚠️ El accidente ${accident.id} ya existe. Continuando...`);
                            skippedCount++;
                            errorCount--; // No contar como error
                        }
                    }
                    // Continuar con el siguiente accidente - NO DETENER EL PROCESO
                }
            }

            if (registeredCount > 0 || skippedCount > 0 || errorCount > 0) {
                console.log(`📊 Resumen auto-captura: ${registeredCount} nuevo(s), ${skippedCount} ya existente(s), ${errorCount} error(es) de ${allAccidents.length} total`);
            }
        } catch (error) {
            console.error('❌ Error crítico en autoCaptureAccidents:', error);
            if (error instanceof Error) {
                console.error('Stack trace:', error.stack);
            }
        }
    }
}

export const wazeService = new WazeService();
