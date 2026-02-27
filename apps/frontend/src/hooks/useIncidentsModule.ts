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
    WEATHERHAZARD: "Peligro meteorológico",
    ROAD_CLOSED: "Camino cerrado",
    ROAD_CLOSED_EVENT: "Corte de ruta",
    JAM: "Congestión",
    CONSTRUCTION: "Obras",
    POLICE: "Policía",
  };
  return translations[type] || type;
}

/**
 * Traduce subtipo de incidente a español
 */
export function translateIncidentSubtype(subtype: string): string {
  const translations: Record<string, string> = {
    // Accidentes
    ACCIDENT_MINOR: "Accidente leve",
    ACCIDENT_MAJOR: "Colisión múltiple",
    ACCIDENT_BLOCKING: "Accidente bloqueante",
    ACCIDENT_OTHER_SIDE: "Accidente al otro lado",
    NO_SUBTYPE: "Sin subtipo",
    // Congestión
    JAM_MODERATE: "Congestión moderada",
    JAM_HEAVY: "Congestión pesada",
    JAM_STANDSTILL: "Tráfico parado",
    JAM_LIGHT_TRAFFIC: "Tránsito lento",
    JAM_MODERATE_TRAFFIC: "Tránsito denso",
    JAM_HEAVY_TRAFFIC: "Embotellamiento",
    JAM_STAND_STILL_TRAFFIC: "Tránsito detenido",
    // Peligros en calzada
    HAZARD_ON_ROAD: "Peligro en calzada",
    HAZARD_ON_ROAD_OBJECT: "Objeto en calzada",
    HAZARD_ON_ROAD_POT_HOLE: "Bache",
    HAZARD_ON_ROAD_ROAD_KILL: "Animal muerto en calzada",
    HAZARD_ON_ROAD_CONSTRUCTION: "Obras en calzada",
    HAZARD_ON_ROAD_ICE: "Hielo en calzada",
    HAZARD_ON_ROAD_CAR_STOPPED: "Vehículo detenido en carril",
    HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT: "Semáforo averiado",
    HAZARD_ON_ROAD_LANE_CLOSED: "Carril cerrado",
    HAZARD_ON_ROAD_OIL: "Derrame de aceite",
    // Peligros en banquina
    HAZARD_ON_SHOULDER: "Vehículo en banquina",
    HAZARD_ON_SHOULDER_CAR_STOPPED: "Vehículo en banquina",
    HAZARD_ON_SHOULDER_ANIMALS: "Animales en banquina",
    HAZARD_ON_SHOULDER_MISSING_SIGN: "Señal faltante",
    // Peligros climáticos
    HAZARD_WEATHER: "Peligro climático",
    HAZARD_WEATHER_FOG: "Niebla",
    HAZARD_WEATHER_HAIL: "Granizo",
    HAZARD_WEATHER_HEAVY_RAIN: "Lluvia intensa",
    HAZARD_WEATHER_HEAVY_SNOW: "Nieve en el camino",
    HAZARD_WEATHER_FLOOD: "Inundación",
    HAZARD_WEATHER_MONSOON: "Lluvia torrencial",
    HAZARD_WEATHER_TORNADO: "Tornado",
    HAZARD_WEATHER_HEAT_WAVE: "Ola de calor",
    HAZARD_WEATHER_HURRICANE: "Huracán",
    HAZARD_WEATHER_FREEZING_RAIN: "Camino con hielo",
    HAZARD_WEATHER_SLIPPERY_ROAD: "Camino resbaladizo",
    // Cierres de ruta
    ROAD_CLOSED_CONSTRUCTION: "Cierre por obras",
    ROAD_CLOSED_EVENT: "Cierre por evento",
    ROAD_CLOSED_HAZARD: "Cierre por peligro",
    // Obras
    ROADWORK_CONSTRUCTION: "Construcción",
    ROADWORK_MAINTENANCE: "Mantenimiento",
    ROADWORK_UTILITIES: "Servicios públicos",
    // Policía
    POLICE_VISIBLE: "Policía visible",
    POLICE_HIDDEN: "Policía oculto",
    POLICE_SPEED_TRAP: "Radar móvil",
    POLICE_OTHER_SIDE: "Policía al otro lado",
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
    ROAD_CLOSED_EVENT: "bg-purple-600",
    JAM: "bg-orange-500",
    CONSTRUCTION: "bg-violet-500",
    POLICE: "bg-indigo-500",
  };
  return colors[type] || "bg-gray-500";
}
