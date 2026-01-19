/**
 * Waze Traffic Feed Types
 * Estructuras de datos para almacenamiento persistente en PostgreSQL
 */

// ============================================================================
// TIPOS DE ALERTAS (Reportes de usuarios)
// ============================================================================

export type WazeAlertType =
  | "ACCIDENT"
  | "JAM"
  | "WEATHERHAZARD"
  | "HAZARD"
  | "ROAD_CLOSED"
  | "MISC";

export interface WazeAlert {
  uuid: string;
  type: WazeAlertType;
  subtype: string;
  location: { x: number; y: number };
  street: string;
  city?: string;
  country: string;
  pubMillis: number;
  reliability: number;
  confidence: number;
  reportDescription?: string;
  nThumbsUp?: number;
  reportRating?: number;
  reportBy?: string;
  magvar?: number;
}

export interface WazeAlertDB {
  uuid: string;
  polygon_id: string;
  type: string;
  subtype: string | null;
  latitude: number;
  longitude: number;
  street: string | null;
  city: string | null;
  country: string | null;
  pub_millis: number;
  reliability: number | null;
  confidence: number | null;
  report_description: string | null;
  n_thumbs_up: number | null;
  report_rating: number | null;
  report_by: string | null;
  magvar: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// TIPOS DE JAMS (Embotellamientos)
// ============================================================================

export interface WazeJam {
  uuid: string;
  level: number;
  line: Array<{ x: number; y: number }>;
  speedKMH: number;
  delay: number;
  length: number;
  street: string;
  city?: string;
  pubMillis: number;
}

export interface WazeJamDB {
  uuid: string;
  polygon_id: string;
  level: number;
  polyline: Array<{ x: number; y: number }>;
  speed_kmh: number | null;
  delay_seconds: number | null;
  length_meters: number | null;
  street: string | null;
  city: string | null;
  pub_millis: number;
  is_active: boolean;
  created_at: Date;
}

// ============================================================================
// TIPOS DE IRREGULARITIES (Tráfico anómalo)
// ============================================================================

export interface WazeIrregularity {
  uuid: string;
  type: string;
  detectionDate: string;
  street: string;
  speed: number;
  regularSpeed: number;
  delaySeconds: number;
  severity: number;
  jamLevel: number;
  trend: number; // -1 = mejora, 0 = estable, 1 = empeora
  line: Array<{ x: number; y: number }>;
}

export interface WazeIrregularityDB {
  uuid: string;
  polygon_id: string;
  type: string | null;
  detection_date: Date | null;
  street: string | null;
  speed: number | null;
  regular_speed: number | null;
  delay_seconds: number | null;
  severity: number | null;
  jam_level: number | null;
  trend: number | null;
  polyline: Array<{ x: number; y: number }> | null;
  is_active: boolean;
  created_at: Date;
}

// ============================================================================
// TIPOS DE RESPUESTA DEL FEED
// ============================================================================

export interface WazeFeedData {
  alerts: WazeAlert[];
  jams: WazeJam[];
  irregularities?: WazeIrregularity[];
}

export interface WazePollingResult {
  polygonId: string;
  alerts: number;
  jams: number;
  irregularities: number;
  success: boolean;
  error?: string;
}

// ============================================================================
// TIPOS PARA WEBSOCKET UPDATES
// ============================================================================

export interface WazeUpdatePayload {
  polygonId: string;
  alerts: WazeAlertDB[];
  jams: WazeJamDB[];
  timestamp: string;
}
