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
