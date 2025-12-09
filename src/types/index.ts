/**
 * Type Definitions for Waze Traffic Dashboard
 * These interfaces match the structure of Waze for Cities Partner Hub feeds
 */

// Estado de cada polígono basado en análisis de incidentes y congestión
export const PolygonState = {
    LOW: 'low',      // Fluido - Verde
    MEDIUM: 'medium', // Alertas moderadas - Amarillo
    HIGH: 'high',     // Incidente severo o congestión alta - Rojo
} as const;

export type PolygonState = typeof PolygonState[keyof typeof PolygonState];

// Tipos de incidentes según Waze Alerts Feed
export const IncidentType = {
    ACCIDENT: 'accident',
    JAM: 'jam',
    WEATHERHAZARD: 'weatherhazard',
    POTHOLE: 'pothole',
    ROADCLOSED: 'roadclosed',
    CONSTRUCTION: 'construction',
    HAZARD: 'hazard',
} as const;

export type IncidentType = typeof IncidentType[keyof typeof IncidentType];

// Niveles de severidad
export const Severity = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
} as const;

export type Severity = typeof Severity[keyof typeof Severity];

// Definición de ubicación geográfica
export interface Location {
    lat: number;
    lng: number;
}

// GeoJSON para polígonos (formato estándar)
export interface GeoJSONPolygon {
    type: 'Polygon';
    coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
}

/**
 * Polígono - Unidad básica de monitoreo
 * Representa una zona geográfica que se monitorea continuamente
 */
export interface Polygon {
    id: string;
    name: string;
    group: string; // Agrupación lógica (ej: "Zona Norte", "Corredor Principal")
    geometry: GeoJSONPolygon;
    state: PolygonState;
    metadata?: {
        jurisdiction?: string;
        priority?: number;
    };
}

/**
 * Incident (Alert) - Alerta del feed de Waze
 * Estructura basada en Waze Alerts Feed
 */
export interface Incident {
    id: string;
    polygonId: string | null; // null si está fuera de nuestros polígonos
    type: IncidentType;
    subtype?: string;
    severity: Severity;
    description: string;
    timestamp: Date;
    location: Location;
    reportRating?: number; // Confiabilidad del reporte
    nThumbsUp?: number;    // Confirmaciones de usuarios
}

/**
 * TrafficJam - Congestión del feed de Waze Traffic
 * Estructura basada en Waze Jams Feed
 */
export interface TrafficJam {
    id: string;
    polygonId: string | null;
    speed: number;          // km/h - Velocidad actual
    speedKMH?: number;      // Alternativa en km/h
    delay: number;          // Segundos de retraso estimado
    severity: Severity;
    length: number;         // Metros de longitud del atasco
    timestamp: Date;
    location: Location;     // Punto de inicio
    endLocation?: Location; // Punto final (opcional)
    level?: number;         // Nivel de congestión (0-5, Waze)
}

/**
 * Datos agregados de un polígono
 * Usados para KPIs y vista de detalle
 */
export interface PolygonStats {
    polygonId: string;
    totalIncidents: number;
    criticalIncidents: number;
    averageSpeed: number | null;
    totalDelay: number;
    state: PolygonState;
    lastUpdate: Date;
}

/**
 * KPIs globales del dashboard
 */
export interface GlobalKPIs {
    fluidityPercentage: number;      // % de polígonos en estado LOW
    activeIncidents: number;
    criticalPolygons: number;        // Polígonos en estado HIGH
    activeConstructions: number;     // Obras con impacto alto
    trends: {
        fluidityChange: number;        // Comparado con ayer
        incidentsChange: number;
    };
}

/**
 * Filtros aplicables al dashboard
 */
export interface DashboardFilters {
    selectedPolygon: string | null;
    selectedGroup: string | null;
    timeRange?: 'live' | '1h' | '24h' | '7d';
}
