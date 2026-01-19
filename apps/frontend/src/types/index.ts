/**
 * Type Definitions for Waze Traffic Dashboard
 * These interfaces match the structure of Waze for Cities Partner Hub feeds
 */

// Estado de cada polígono basado en análisis de incidentes y congestión
export const PolygonState = {
  LOW: "low", // Fluido - Verde
  MEDIUM: "medium", // Alertas moderadas - Amarillo
  HIGH: "high", // Incidente severo o congestión alta - Rojo
} as const;

export type PolygonState = (typeof PolygonState)[keyof typeof PolygonState];

// Tipos de incidentes según Waze Alerts Feed
export const IncidentType = {
  ACCIDENT: "accident",
  JAM: "jam",
  WEATHERHAZARD: "weatherhazard",
  POTHOLE: "pothole",
  ROADCLOSED: "roadclosed",
  CONSTRUCTION: "construction",
  HAZARD: "hazard",
} as const;

export type IncidentType = (typeof IncidentType)[keyof typeof IncidentType];

// Niveles de severidad
export const Severity = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;

export type Severity = (typeof Severity)[keyof typeof Severity];

// Definición de ubicación geográfica
export interface Location {
  lat: number;
  lng: number;
}

// GeoJSON para polígonos (formato estándar)
export interface GeoJSONPolygon {
  type: "Polygon";
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
  trafficMetrics?: PolygonTrafficMetrics; // Métricas enriquecidas por hook
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
  street?: string; // Calle del incidente
  city?: string; // Ciudad
  reportRating?: number; // Confiabilidad del reporte
  confidence?: number; // Nivel de confianza
  reliability?: number; // Confiabilidad
  nThumbsUp?: number; // Confirmaciones de usuarios
  reportBy?: string; // Usuario que reportó
  magvar?: number; // Rumbo (0-359)
}

/**
 * TrafficJam - Congestión del feed de Waze Traffic
 * Estructura basada en Waze Jams Feed
 */
export interface TrafficJam {
  id: string;
  polygonId: string | null;
  speed: number; // km/h - Velocidad actual
  speedKMH?: number; // Alternativa en km/h
  delay: number; // Segundos de retraso estimado
  severity: Severity;
  length: number; // Metros de longitud del atasco
  timestamp: Date;
  location: Location; // Punto de inicio
  endLocation?: Location; // Punto final (opcional)
  level?: number; // Nivel de congestión (0-5, Waze)
  street?: string; // Calle principal
  city?: string; // Ciudad
  roadType?: number; // Tipo de ruta (1-21)
  turnType?: string; // Tipo de giro
  blockingAlertUuid?: string; // UUID de alerta bloqueante (ROAD_CLOSED, etc.)
  line?: Array<{ x: number; y: number }>; // Línea completa del atasco
  source: "waze" | "tvt"; // Fuente de datos: Waze feeds (con coords) o TVT feeds (sin coords)
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
  fluidityPercentage: number; // % de polígonos en estado LOW
  activeIncidents: number;
  activeJams?: number; // Total de atascos activos
  criticalPolygons: number; // Polígonos en estado HIGH
  activeConstructions: number; // Obras con impacto alto
  roadAccidents?: number; // Siniestros registrados manualmente
  roadAccidentsCritical?: number; // Siniestros críticos (severity >= 4)
  roadAccidentsHigh?: number; // Siniestros altos (severity >= 3)
  groupStats?: Array<{
    // Estadísticas por grupo
    group: string;
    polygonCount: number;
    alertCount: number;
    jamCount: number;
    criticalCount: number;
    fluidCount: number;
  }>;
  topCritical?: Array<{
    // Top polígonos críticos
    id: string;
    name: string;
    group: string;
    state: "low" | "medium" | "high";
    alertCount: number;
    jamCount: number;
  }>;
  trends: {
    fluidityChange: number; // Comparado con ayer
    incidentsChange: number;
  };
}

/**
 * Filtros aplicables al dashboard
 */
export interface DashboardFilters {
  selectedPolygon: string | null;
  selectedGroup: string | null;
  timeRange?: "live" | "1h" | "24h" | "7d";
}

/**
 * Métricas de tráfico detalladas por polígono
 */
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
  totalAlerts?: number;
  lastUpdate: Date;
}

/**
 * Sistema de Alertas de Tráfico
 */
export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertType =
  | "total_blockage"
  | "excessive_delay"
  | "significant_delay"
  | "extensive_congestion"
  | "high_user_impact"
  | "jam_level_increase"
  | "new_irregularity";

export interface TrafficAlert {
  id: string;
  timestamp: string;
  severity: AlertSeverity;
  type: AlertType;
  polygonId: string;
  polygonName: string;
  location: string;
  message: string;
  data: any;
  isAcknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType: {
    totalBlockage: number;
    excessiveDelay: number;
    significantDelay: number;
    extensiveCongestion: number;
    highUserImpact: number;
  };
}

/**
 * Sistema de Alertas de Discrepancia Waze-TVT
 */
export type DiscrepancyAlertType =
  | "speed_discrepancy"
  | "coverage_discrepancy"
  | "delay_discrepancy";

export interface DiscrepancyAlert {
  id: string;
  timestamp: Date;
  type: DiscrepancyAlertType;
  severity: AlertSeverity;
  polygonId: string;
  polygonName: string;
  data: {
    waze: {
      avgSpeed: number;
      avgDelay: number;
      count: number;
    };
    tvt: {
      avgSpeed: number;
      avgDelay: number;
      count: number;
    };
    difference: {
      speed: number;
      delay: number;
      coverageRatio: number;
    };
  };
  message: string;
  recommendation: string;
  isAcknowledged: boolean;
  acknowledgedAt?: Date;
}

/**
 * Datos Históricos
 */
export interface HistoricalSnapshot {
  timestamp: string;
  totalJams: number;
  totalIncidents: number;
  avgSpeed: number | null;
  avgDelay: number;
  criticalKm: number;
  affectedPolygons: number;
  criticalPolygons: number;
}

export interface TrendData {
  current: number;
  hourAgo: number | null;
  dayAgo: number | null;
  weekAgo: number | null;
  trend: "improving" | "worsening" | "stable";
  percentChange: number;
}

export interface AllTrends {
  totalJams: TrendData;
  avgSpeed: TrendData;
  criticalKm: TrendData;
  avgDelay: TrendData;
}
