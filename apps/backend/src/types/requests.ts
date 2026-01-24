/**
 * Tipos de Request/Response para endpoints del API
 * Siguiendo typescript-advanced-types skill para tipado estricto
 */

// =============================================================================
// Tipos base para parámetros comunes
// =============================================================================

/** Query params con fechas from/to */
export interface DateRangeQuery {
  from?: string;
  to?: string;
}

/** Query params con paginación */
export interface PaginationQuery {
  limit?: string;
  offset?: string;
}

/** Query params comunes */
export interface CommonQuery extends DateRangeQuery, PaginationQuery {
  polygon_id?: string;
}

// =============================================================================
// Road Accidents API
// =============================================================================

/** Request body para crear accidente */
export interface CreateAccidentBody {
  location_lat: number;
  location_lng: number;
  polygonId?: string;
  weather_data?: {
    temperature_celsius?: number;
    weather_code?: number;
    weather_description?: string;
    precipitation_mm?: number;
    wind_speed_kmh?: number;
    humidity_percent?: number;
  };
  description?: string;
  severity?: string;
  type?: string;
  road_name?: string;
  reference_point?: string;
  vehicles_involved?: number;
  injuries?: number;
  fatalities?: number;
}

/** Request body para actualizar accidente */
export interface UpdateAccidentBody {
  status?: string;
  description?: string;
  severity?: string;
  vehicles_involved?: number;
  injuries?: number;
  fatalities?: number;
  resolution_notes?: string;
  resolved_at?: string;
}

/** Params para endpoints con :id */
export interface IdParams {
  id: string;
}

// =============================================================================
// Data Quality API
// =============================================================================

/** Request body para actualizar umbrales de calidad */
export interface UpdateThresholdsBody {
  maxStaleMinutes?: number;
  minReliability?: number;
  minConfidence?: number;
  maxJamLevel?: number;
}

// =============================================================================
// Weather API
// =============================================================================

/** Params para endpoint de clima por polígono */
export interface PolygonIdParams {
  polygon_id: string;
}

/** Query params para historial de clima */
export interface WeatherHistoryQuery {
  hours?: string;
  force_refresh?: string;
}

// =============================================================================
// Incidents History API
// =============================================================================

/** Query params para incidentes por tipo */
export interface IncidentsByTypeQuery extends DateRangeQuery, PaginationQuery {
  polygon_id?: string;
  type?: string;
}

/** Query params para hotspots */
export interface HotspotsQuery extends DateRangeQuery, PaginationQuery {
  min_incidents?: string;
  radius_meters?: string;
}

/** Query params para agrupación de incidentes */
export interface IncidentsGroupByQuery extends DateRangeQuery {
  polygon_id?: string;
  group_by?: "hour" | "day" | "week" | "month";
}

// =============================================================================
// Exports de utilidad para FastifyRequest
// =============================================================================

import type { FastifyRequest } from "fastify";

/** Request tipado para crear accidente */
export type CreateAccidentRequest = FastifyRequest<{
  Body: CreateAccidentBody;
}>;

/** Request tipado para actualizar accidente */
export type UpdateAccidentRequest = FastifyRequest<{
  Params: IdParams;
  Body: UpdateAccidentBody;
}>;

/** Request tipado para obtener accidente por ID */
export type GetAccidentByIdRequest = FastifyRequest<{
  Params: IdParams;
}>;

/** Request tipado para actualizar umbrales */
export type UpdateThresholdsRequest = FastifyRequest<{
  Body: UpdateThresholdsBody;
}>;

/** Request tipado para clima de polígono */
export type WeatherByPolygonRequest = FastifyRequest<{
  Params: PolygonIdParams;
  Querystring: WeatherHistoryQuery;
}>;

/** Request tipado para incidentes con query genérico */
export type IncidentsQueryRequest = FastifyRequest<{
  Querystring: IncidentsByTypeQuery;
}>;

/** Request tipado para hotspots */
export type HotspotsRequest = FastifyRequest<{
  Querystring: HotspotsQuery;
}>;

/** Request tipado para agrupación */
export type IncidentsGroupByRequest = FastifyRequest<{
  Querystring: IncidentsGroupByQuery;
}>;
