import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";

// VITE_API_URL debe incluir el prefijo /api. Si no está definido,
// usamos como fallback http://localhost:3002/api para que coincida
// con los prefijos de Fastify (/api/incidents, /api/notifications, etc).
const API_URL = import.meta.env.VITE_API_URL || "/api";

/**
 * Tipos para el módulo de incidentes
 */
export interface Incident {
  uuid: string;
  polygonId: string;
  type: string;
  subtype: string;
  location: {
    lat: number;
    lng: number;
  };
  street: string;
  city: string;
  country: string;
  pubMillis: number;
  createdAt: string;
  updatedAt: string;
  reliability: number;
  confidence: number;
  description: string;
  reportBy: string;
  thumbsUp: number;
  rating: number;
  magvar: number;
  isActive: boolean;
}

export interface IncidentsFilters {
  type?: string;
  subtype?: string;
  from?: string;
  to?: string;
  polygonId?: string;
  isActive?: boolean;
  search?: string;
}

export interface IncidentsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IncidentsResponse {
  incidents: Incident[];
  pagination: IncidentsPagination;
}

export interface IncidentTypes {
  types: string[];
  subtypesByType: Record<string, string[]>;
}

export interface IncidentStats {
  byType: Array<{ type: string; count: number; active_count: number }>;
  summary: {
    total: number;
    active: number;
    oldest: string;
    newest: string;
  };
}

/**
 * Fetch incidentes con filtros
 */
async function fetchIncidents(
  filters: IncidentsFilters,
  page: number,
  limit: number,
): Promise<IncidentsResponse> {
  const params = new URLSearchParams();

  if (filters.type) params.set("type", filters.type);
  if (filters.subtype) params.set("subtype", filters.subtype);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.polygonId) params.set("polygonId", filters.polygonId);
  if (filters.isActive !== undefined)
    params.set("isActive", String(filters.isActive));
  if (filters.search) params.set("search", filters.search);

  params.set("page", String(page));
  params.set("limit", String(limit));

  const response = await fetch(`${API_URL}/incidents?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Error fetching incidents");
  }

  return response.json();
}

/**
 * Fetch tipos disponibles
 */
async function fetchTypes(): Promise<IncidentTypes> {
  const response = await fetch(`${API_URL}/incidents/types`);
  if (!response.ok) throw new Error("Error fetching types");
  return response.json();
}

/**
 * Fetch estadísticas
 */
async function fetchStats(): Promise<IncidentStats> {
  const response = await fetch(`${API_URL}/incidents/stats`);
  if (!response.ok) throw new Error("Error fetching stats");
  return response.json();
}

/**
 * Fetch detalle de incidente
 */
async function fetchIncidentDetail(uuid: string): Promise<Incident> {
  const response = await fetch(`${API_URL}/incidents/${uuid}`);
  if (!response.ok) throw new Error("Error fetching incident detail");
  return response.json();
}

/**
 * Hook principal para el módulo de incidentes
 */
export function useIncidentsModule() {
  const [filters, setFilters] = useState<IncidentsFilters>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const queryClient = useQueryClient();

  // Query de incidentes
  const incidentsQuery = useQuery({
    queryKey: ["incidents", filters, page, limit],
    queryFn: () => fetchIncidents(filters, page, limit),
    staleTime: 30000, // 30 segundos
  });

  // Query de tipos
  const typesQuery = useQuery({
    queryKey: ["incidents-types"],
    queryFn: fetchTypes,
    staleTime: 300000, // 5 minutos
  });

  // Query de estadísticas
  const statsQuery = useQuery({
    queryKey: ["incidents-stats"],
    queryFn: fetchStats,
    staleTime: 60000, // 1 minuto
  });

  // Actualizar filtros
  const updateFilters = useCallback((newFilters: Partial<IncidentsFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1); // Reset a primera página al cambiar filtros
  }, []);

  // Limpiar filtros
  const clearFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  // Refrescar datos
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["incidents"] });
    queryClient.invalidateQueries({ queryKey: ["incidents-stats"] });
  }, [queryClient]);

  return {
    // Datos
    incidents: incidentsQuery.data?.incidents || [],
    pagination: incidentsQuery.data?.pagination,
    types: typesQuery.data?.types || [],
    subtypesByType: typesQuery.data?.subtypesByType || {},
    stats: statsQuery.data,

    // Estados de carga
    isLoading: incidentsQuery.isLoading,
    isLoadingTypes: typesQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,
    error: incidentsQuery.error,

    // Filtros y paginación
    filters,
    page,
    limit,
    updateFilters,
    clearFilters,
    setPage,
    setLimit,

    // Acciones
    refresh,
  };
}

/**
 * Hook para detalle de incidente
 */
export function useIncidentDetail(uuid: string | null) {
  return useQuery({
    queryKey: ["incident-detail", uuid],
    queryFn: () => fetchIncidentDetail(uuid!),
    enabled: !!uuid,
    staleTime: 60000,
  });
}

/**
 * Traduce tipo de incidente a español
 */
export function translateIncidentType(type: string): string {
  const translations: Record<string, string> = {
    ACCIDENT: "Accidente",
    HAZARD: "Peligro",
    WEATHERHAZARD: "Riesgo Climático",
    ROAD_CLOSED: "Vía Cerrada",
    JAM: "Congestión",
  };
  return translations[type] || type;
}

/**
 * Traduce subtipo de incidente a español
 */
export function translateIncidentSubtype(subtype: string): string {
  const translations: Record<string, string> = {
    ACCIDENT_MAJOR: "Accidente Grave",
    ACCIDENT_MINOR: "Accidente Menor",
    HAZARD_ON_ROAD_CAR_STOPPED: "Vehículo Detenido en Carril",
    HAZARD_ON_SHOULDER_CAR_STOPPED: "Vehículo Detenido en Banquina",
    HAZARD_ON_ROAD_OBJECT: "Obstáculo en la Vía",
    HAZARD_ON_SHOULDER_ANIMALS: "Animales Sueltos",
    HAZARD_ON_ROAD_CONSTRUCTION: "Zona de Construcción",
    HAZARD_ON_ROAD_POT_HOLE: "Bache",
    HAZARD_ON_ROAD_LANE_CLOSED: "Carril Cerrado",
    HAZARD_WEATHER_FLOOD: "Inundación",
    HAZARD_WEATHER_FOG: "Niebla",
    HAZARD_WEATHER_HEAVY_RAIN: "Lluvia Intensa",
    ROAD_CLOSED_CONSTRUCTION: "Cierre por Construcción",
    ROAD_CLOSED_EVENT: "Cierre por Evento",
  };
  return translations[subtype] || subtype?.replace(/_/g, " ") || "";
}

/**
 * Obtiene color del badge según tipo
 */
export function getIncidentTypeColor(type: string): string {
  const colors: Record<string, string> = {
    ACCIDENT: "bg-red-500",
    HAZARD: "bg-amber-500",
    WEATHERHAZARD: "bg-blue-500",
    ROAD_CLOSED: "bg-purple-500",
    JAM: "bg-orange-500",
  };
  return colors[type] || "bg-gray-500";
}
