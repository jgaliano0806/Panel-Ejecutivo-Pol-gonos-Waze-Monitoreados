import axios from 'axios';

/**
 * Servicio de Tráfico Externo - Integración con APIs Públicas
 * 
 * Integra múltiples fuentes de datos de tráfico para mejorar
 * la precisión de velocidades y validar datos de Waze.
 * 
 * APIs Soportadas:
 * - OpenStreetMap Overpass API (gratuita, sin límites estrictos)
 * - HERE Traffic API (requiere API key, mejor precisión)
 * - TomTom Traffic API (requiere API key)
 */

export interface ExternalSpeedData {
    source: 'openstreetmap' | 'here' | 'tomtom' | 'waze';
    avgSpeed: number | null;
    speedLimit: number | null;
    freeFlowSpeed: number | null;
    currentFlow: 'free' | 'slow' | 'heavy' | 'stopped';
    confidence: number; // 0-100
    timestamp: Date;
}

export interface PolygonSpeedComparison {
    polygonId: string;
    polygonName: string;
    wazeSpeed: number | null;
    externalSpeed: number | null;
    speedLimit: number | null;
    difference: number | null; // % diferencia
    recommendedSpeed: number | null; // Velocidad más confiable
    sources: ExternalSpeedData[];
    lastUpdate: Date;
}

/**
 * Servicio para obtener datos de tráfico de fuentes externas
 */
export class ExternalTrafficService {
    private hereApiKey: string | null = null;
    private tomtomApiKey: string | null = null;
    
    // Cache para evitar llamadas excesivas
    private cache: Map<string, { data: PolygonSpeedComparison; timestamp: number }> = new Map();
    private cacheExpiry = 5 * 60 * 1000; // 5 minutos

    constructor() {
        // Leer API keys de variables de entorno (opcional)
        this.hereApiKey = process.env.HERE_API_KEY || null;
        this.tomtomApiKey = process.env.TOMTOM_API_KEY || null;

        if (!this.hereApiKey && !this.tomtomApiKey) {
            console.log('⚠️  APIs externas no configuradas. Usando solo OpenStreetMap y Waze.');
            console.log('   Para mejorar precisión, configura HERE_API_KEY o TOMTOM_API_KEY');
        }
    }

    /**
     * Obtiene velocidad promedio de OpenStreetMap (gratuito)
     * Usa Overpass API para obtener información de la vía
     */
    private async getOSMSpeed(lat: number, lon: number, radius: number = 500): Promise<ExternalSpeedData | null> {
        try {
            // Query Overpass para obtener vías en el área
            const query = `
                [out:json][timeout:5];
                (
                    way["highway"](around:${radius},${lat},${lon});
                );
                out body;
                >;
                out skel qt;
            `;

            const response = await axios.post(
                'https://overpass-api.de/api/interpreter',
                query,
                {
                    timeout: 5000,
                    headers: { 'Content-Type': 'text/plain' }
                }
            );

            if (!response.data?.elements?.length) {
                return null;
            }

            // Analizar las vías para obtener velocidades máximas
            const ways = response.data.elements.filter((el: any) => el.type === 'way');
            const speeds: number[] = [];
            const speedLimits: number[] = [];

            for (const way of ways) {
                // Maxspeed tag
                if (way.tags?.maxspeed) {
                    const speed = parseInt(way.tags.maxspeed);
                    if (!isNaN(speed) && speed > 0) {
                        speedLimits.push(speed);
                    }
                }

                // Estimar velocidad según tipo de vía
                const highway = way.tags?.highway;
                if (highway) {
                    const estimatedSpeed = this.estimateSpeedFromHighwayType(highway);
                    if (estimatedSpeed) {
                        speeds.push(estimatedSpeed);
                    }
                }
            }

            if (speeds.length === 0 && speedLimits.length === 0) {
                return null;
            }

            const avgSpeedLimit = speedLimits.length > 0
                ? speedLimits.reduce((a, b) => a + b, 0) / speedLimits.length
                : null;

            const estimatedSpeed = speeds.length > 0
                ? speeds.reduce((a, b) => a + b, 0) / speeds.length
                : avgSpeedLimit;

            return {
                source: 'openstreetmap',
                avgSpeed: null, // OSM no tiene datos en tiempo real
                speedLimit: avgSpeedLimit ? Math.round(avgSpeedLimit) : null,
                freeFlowSpeed: estimatedSpeed ? Math.round(estimatedSpeed) : null,
                currentFlow: 'free',
                confidence: 60, // OSM es confiable pero no tiene datos en tiempo real
                timestamp: new Date()
            };

        } catch (error) {
            console.error('Error obteniendo datos OSM:', error);
            return null;
        }
    }

    /**
     * Estima velocidad típica según tipo de vía OSM
     */
    private estimateSpeedFromHighwayType(highway: string): number | null {
        const speedMap: Record<string, number> = {
            'motorway': 110,
            'motorway_link': 80,
            'trunk': 90,
            'trunk_link': 70,
            'primary': 70,
            'primary_link': 60,
            'secondary': 60,
            'secondary_link': 50,
            'tertiary': 50,
            'tertiary_link': 40,
            'unclassified': 40,
            'residential': 40,
            'living_street': 20,
            'service': 30
        };

        return speedMap[highway] || null;
    }

    /**
     * Obtiene velocidad de HERE Traffic API
     */
    private async getHERESpeed(lat: number, lon: number): Promise<ExternalSpeedData | null> {
        if (!this.hereApiKey) return null;

        try {
            const response = await axios.get(
                'https://data.traffic.hereapi.com/v7/flow',
                {
                    params: {
                        locationReferencing: 'shape',
                        in: `circle:${lat},${lon};r=500`,
                        apiKey: this.hereApiKey
                    },
                    timeout: 5000
                }
            );

            if (!response.data?.results?.length) {
                return null;
            }

            const result = response.data.results[0];
            const currentFlow = result.currentFlow;

            let flowStatus: 'free' | 'slow' | 'heavy' | 'stopped' = 'free';
            const jamFactor = currentFlow.jamFactor || 0;
            
            if (jamFactor > 8) flowStatus = 'stopped';
            else if (jamFactor > 6) flowStatus = 'heavy';
            else if (jamFactor > 4) flowStatus = 'slow';

            return {
                source: 'here',
                avgSpeed: currentFlow.speed || null,
                speedLimit: currentFlow.speedLimit || null,
                freeFlowSpeed: currentFlow.freeFlowSpeed || null,
                currentFlow: flowStatus,
                confidence: 95, // HERE es muy confiable
                timestamp: new Date()
            };

        } catch (error) {
            console.error('Error obteniendo datos HERE:', error);
            return null;
        }
    }

    /**
     * Obtiene velocidad de TomTom Traffic API
     */
    private async getTomTomSpeed(lat: number, lon: number): Promise<ExternalSpeedData | null> {
        if (!this.tomtomApiKey) return null;

        try {
            const response = await axios.get(
                `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative/10/json`,
                {
                    params: {
                        point: `${lat},${lon}`,
                        key: this.tomtomApiKey
                    },
                    timeout: 5000
                }
            );

            const data = response.data.flowSegmentData;
            if (!data) return null;

            const currentSpeed = data.currentSpeed;
            const freeFlowSpeed = data.freeFlowSpeed;
            const speedRatio = currentSpeed / freeFlowSpeed;

            let flowStatus: 'free' | 'slow' | 'heavy' | 'stopped' = 'free';
            if (speedRatio < 0.2) flowStatus = 'stopped';
            else if (speedRatio < 0.4) flowStatus = 'heavy';
            else if (speedRatio < 0.7) flowStatus = 'slow';

            return {
                source: 'tomtom',
                avgSpeed: currentSpeed || null,
                speedLimit: null,
                freeFlowSpeed: freeFlowSpeed || null,
                currentFlow: flowStatus,
                confidence: 90,
                timestamp: new Date()
            };

        } catch (error) {
            console.error('Error obteniendo datos TomTom:', error);
            return null;
        }
    }

    /**
     * Obtiene datos de velocidad de múltiples fuentes y las compara
     */
    async getSpeedComparison(
        polygonId: string,
        polygonName: string,
        centerLat: number,
        centerLon: number,
        wazeSpeed: number | null
    ): Promise<PolygonSpeedComparison> {
        // Verificar cache
        const cacheKey = `${polygonId}_${Math.floor(Date.now() / this.cacheExpiry)}`;
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            return cached.data;
        }

        // Obtener datos de todas las fuentes en paralelo
        const [osmData, hereData, tomtomData] = await Promise.all([
            this.getOSMSpeed(centerLat, centerLon),
            this.getHERESpeed(centerLat, centerLon),
            this.getTomTomSpeed(centerLat, centerLon)
        ]);

        const sources: ExternalSpeedData[] = [];

        // Agregar datos de Waze
        if (wazeSpeed !== null) {
            sources.push({
                source: 'waze',
                avgSpeed: wazeSpeed,
                speedLimit: null,
                freeFlowSpeed: null,
                currentFlow: this.getFlowStatus(wazeSpeed),
                confidence: 80,
                timestamp: new Date()
            });
        }

        // Agregar fuentes externas disponibles
        if (osmData) sources.push(osmData);
        if (hereData) sources.push(hereData);
        if (tomtomData) sources.push(tomtomData);

        // Calcular velocidad recomendada (promedio ponderado por confianza)
        let recommendedSpeed: number | null = null;
        let externalSpeed: number | null = null;

        const speedsWithConfidence = sources
            .filter(s => s.avgSpeed !== null)
            .map(s => ({ speed: s.avgSpeed!, confidence: s.confidence }));

        if (speedsWithConfidence.length > 0) {
            const totalConfidence = speedsWithConfidence.reduce((sum, s) => sum + s.confidence, 0);
            recommendedSpeed = Math.round(
                speedsWithConfidence.reduce((sum, s) => sum + (s.speed * s.confidence), 0) / totalConfidence
            );
        }

        // Velocidad externa (excluir Waze)
        const externalSources = sources.filter(s => s.source !== 'waze' && s.avgSpeed !== null);
        if (externalSources.length > 0) {
            externalSpeed = Math.round(
                externalSources.reduce((sum, s) => sum + (s.avgSpeed! * s.confidence), 0) /
                externalSources.reduce((sum, s) => sum + s.confidence, 0)
            );
        }

        // Calcular diferencia
        let difference: number | null = null;
        if (wazeSpeed !== null && externalSpeed !== null && externalSpeed > 0) {
            difference = Math.round(((wazeSpeed - externalSpeed) / externalSpeed) * 100);
        }

        // Obtener límite de velocidad (preferir HERE > TomTom > OSM)
        const speedLimit = hereData?.speedLimit || osmData?.speedLimit || null;

        const result: PolygonSpeedComparison = {
            polygonId,
            polygonName,
            wazeSpeed,
            externalSpeed,
            speedLimit,
            difference,
            recommendedSpeed: recommendedSpeed || wazeSpeed,
            sources,
            lastUpdate: new Date()
        };

        // Guardar en cache
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

        return result;
    }

    /**
     * Determina el estado de flujo según velocidad
     */
    private getFlowStatus(speed: number): 'free' | 'slow' | 'heavy' | 'stopped' {
        if (speed >= 50) return 'free';
        if (speed >= 30) return 'slow';
        if (speed >= 10) return 'heavy';
        return 'stopped';
    }

    /**
     * Limpia el cache antiguo
     */
    cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheExpiry) {
                this.cache.delete(key);
            }
        }
    }
}

export const externalTrafficService = new ExternalTrafficService();

// Limpiar cache cada 10 minutos
setInterval(() => externalTrafficService.cleanCache(), 10 * 60 * 1000);









