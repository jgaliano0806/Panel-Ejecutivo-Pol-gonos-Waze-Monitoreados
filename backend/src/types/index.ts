/**
 * Tipos del Backend para Waze Dashboard
 */

// --- Waze Raw Data Types (según especificación JSON) ---

export interface WazeRawAlert {
    uuid: string;
    type: string; // ACCIDENT, JAM, etc.
    subtype?: string;
    location: {
        x: number; // lon
        y: number; // lat
    };
    street?: string;
    city?: string;
    reportRating?: number;
    confidence?: number;
    reliability?: number;
    nThumbsUp?: number;
    pubMillis: number;
    reportDescription?: string;
}

export interface WazeRawJam {
    uuid: string; // A veces es id numérico en string
    id?: number;
    pubMillis: number;
    level: number; // 0-5
    severity?: number;
    line: Array<{ x: number; y: number }>;
    speed: number; // m/s o km/h según feed (usualmente m/s en JSON raw, pero depende partner)
    speedKMH?: number;
    length: number; // metros
    delay: number; // segundos
    street?: string;
    city?: string;
    roadType?: number;
    type?: string;
    turnType?: string;
    blockingAlertUuid?: string;
}

export interface WazeFeedResponse {
    alerts: WazeRawAlert[];
    jams: WazeRawJam[];
    endTimeMillis: number;
    startTimeMillis: number;
    startTime: string;
    endTime: string;
}

// --- Waze TVT (Travel Time Traffic) Types ---

export interface WazeTVTSegment {
    id: number;
    from: string;
    to: string;
    length: number; // Longitud en metros
    historicTime: number; // Tiempo histórico en segundos
    currentTime: number; // Tiempo actual en segundos
    speed: number; // Velocidad en km/h
    jamLevel: number; // 0-5 (0 = sin congestión, 5 = severa)
    delay: number; // Demora en segundos
}

export interface WazeTVTResponse {
    segments: WazeTVTSegment[];
    updateTime: number; // Timestamp en millis
}

// --- Alert System Types ---

export const AlertSeverity = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
} as const;

export type AlertSeverity = typeof AlertSeverity[keyof typeof AlertSeverity];

export const AlertType = {
    TOTAL_BLOCKAGE: 'total_blockage',
    EXCESSIVE_DELAY: 'excessive_delay',
    SIGNIFICANT_DELAY: 'significant_delay',
    EXTENSIVE_CONGESTION: 'extensive_congestion',
    HIGH_USER_IMPACT: 'high_user_impact',
    JAM_LEVEL_INCREASE: 'jam_level_increase',
    NEW_IRREGULARITY: 'new_irregularity',
} as const;

export type AlertType = typeof AlertType[keyof typeof AlertType];

export interface TrafficAlert {
    id: string;
    timestamp: Date;
    severity: AlertSeverity;
    type: AlertType;
    polygonId: string;
    polygonName: string;
    location: string;
    message: string;
    data: any; // Datos específicos del tipo de alerta
    isAcknowledged: boolean;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
}

// --- Historical Data Types ---

export interface HistoricalSnapshot {
    timestamp: Date;
    totalJams: number;
    totalIncidents: number;
    avgSpeed: number | null;
    avgDelay: number;
    criticalKm: number;
    affectedPolygons: number;
    criticalPolygons: number;
}

export interface PolygonHistoricalData {
    polygonId: string;
    polygonName: string;
    snapshots: HistoricalSnapshot[];
}

export interface TrendData {
    current: number;
    hourAgo: number | null;
    dayAgo: number | null;
    weekAgo: number | null;
    trend: 'improving' | 'worsening' | 'stable';
    percentChange: number;
}

// --- Internal Domain Types ---

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

export const Severity = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
} as const;

export type Severity = typeof Severity[keyof typeof Severity];

export interface InternalAlert {
    id: string;
    polygonId: string | null;
    type: IncidentType;
    subtype?: string;
    severity: Severity;
    description: string;
    timestamp: Date;
    location: { lat: number; lng: number };
    street?: string;
    city?: string;
    reportRating?: number;
    confidence?: number;
    reliability?: number;
    nThumbsUp?: number;
}

export interface InternalJam {
    id: string;
    polygonId: string | null;
    speed: number; // km/h
    delay: number; // segundos
    severity: Severity;
    length: number; // metros
    timestamp: Date;
    location: { lat: number; lng: number }; // Start point
    endLocation?: { lat: number; lng: number }; // End point
    level: number; // 0-5
    street?: string;
    city?: string;
    roadType?: number;
    turnType?: string;
    blockingAlertUuid?: string;
    source: 'waze' | 'tvt'; // Fuente de datos: Waze feeds (con coords) o TVT feeds (sin coords)
}

export interface PolygonStatus {
    id: string;
    name: string;
    group: string;
    state: 'low' | 'medium' | 'high';
    metrics: {
        alertCount: number;
        jamCount: number;
        totalDelay: number;
        avgSpeed: number | null;
        criticalAlerts: number;
    };
    lastUpdate: Date;
}

// GeoJSON Polygon structure for config
export interface ConfigPolygon {
    id: string;
    name: string;
    group: string;
    geometry: {
        type: 'Polygon';
        coordinates: number[][][];
    };
}

// Traffic metrics for polygon analysis
export interface PolygonTrafficMetrics {
    polygonId: string;
    minSpeed: number | null;
    maxSpeed: number | null;
    avgSpeed: number | null;
    slowPoints: number;
    moderatePoints: number;
    fastPoints: number;
    stoppedPoints: number;
    congestionIndex: number;
    totalJams: number;
    lastUpdate: Date;
}
