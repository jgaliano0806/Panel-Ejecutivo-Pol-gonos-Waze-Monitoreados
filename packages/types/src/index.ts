// API Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Common Types
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // Array of rings, each ring is array of [lng, lat] pairs
}

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type IncidentType = 'accident' | 'hazard' | 'jam' | 'road_closure' | 'weather' | 'construction';

export type PolygonState = 'normal' | 'warning' | 'critical' | 'maintenance';

export type ViewType = 'home' | 'admin' | 'reports' | 'settings';

// Environment types
export type Environment = 'development' | 'staging' | 'production';

// Database Types
export interface RoadAccident {
  id: string;
  incident_id: string;
  waze_data: any;
  weather_data: any;
  type: string;
  subtype: string | null;
  severity: number;
  street: string;
  location_lat: number;
  location_lng: number;
  accident_at: string;
  created_at: string;
  updated_at: string;
  media: any[];
}

export interface Polygon {
  id: string;
  name: string;
  group: string;
  geometry: GeoJSONPolygon;
  state: PolygonState;
  trafficMetrics?: any;
  metadata?: any;
}

// UI Types
export interface FilterOptions {
  polygon: string | null;
  group: string | null;
  dateRange: [Date, Date] | null;
  severity: SeverityLevel | null;
}

export interface MapMarker {
  id: string;
  position: [number, number];
  type: IncidentType;
  severity: SeverityLevel;
  title: string;
  description?: string;
}

// Waze Types
export * from './waze';

// Weather Types
export * from './weather';

// Danger Zones
export * from './dangerZone';
