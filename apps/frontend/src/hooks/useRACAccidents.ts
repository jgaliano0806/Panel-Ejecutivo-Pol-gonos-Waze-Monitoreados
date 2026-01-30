import { useQuery } from "@tanstack/react-query";
import { API_CONFIG, REFRESH_INTERVALS } from "../config/constants";

export interface RACAccident {
  id: string;
  lat: number;
  lng: number;
  severity: number;
  occurredAt: string;
  description: string;
  mediaUrls: string[];
  polygonId: string;
  createdAt: string;
}

export interface DateFilter {
  mode: "day" | "month" | "year";
  date: Date;
}

export interface RACAccidentsFilter {
  viewMode: "active" | "historical";
  dateFilter?: DateFilter;
}

const API_BASE = API_CONFIG.baseUrl;

/**
 * Hook para obtener accidentes RAC para visualización en el mapa
 * - active: Muestra accidentes de los últimos 7 días
 * - historical: Muestra accidentes según filtro de fecha (día/mes/año)
 */
export const useRACAccidentsMap = (
  filters: RACAccidentsFilter,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ["racAccidentsMap", filters],
    queryFn: async (): Promise<RACAccident[]> => {
      let startDate: string;
      let endDate: string;

      if (filters.viewMode === "active") {
        // Accidentes activos: últimos 7 días
        const now = new Date();
        endDate = now.toISOString();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        startDate = sevenDaysAgo.toISOString();
      } else {
        // Accidentes históricos: usar filtro de fecha
        if (!filters.dateFilter) {
          throw new Error("dateFilter is required for historical view");
        }
        const range = getDateRange(filters.dateFilter);
        startDate = range.startDate;
        endDate = range.endDate;
      }

      const url = `${API_BASE}/road-accidents/map?startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch RAC accidents: ${response.statusText}`
        );
      }

      return response.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // 10 minutos
  });
};

/**
 * Calcula el rango de fechas según el modo de filtro
 */
function getDateRange(filter: DateFilter): {
  startDate: string;
  endDate: string;
} {
  const date = new Date(filter.date);

  switch (filter.mode) {
    case "day":
      return {
        startDate: startOfDay(date).toISOString(),
        endDate: endOfDay(date).toISOString(),
      };
    case "month":
      return {
        startDate: startOfMonth(date).toISOString(),
        endDate: endOfMonth(date).toISOString(),
      };
    case "year":
      return {
        startDate: startOfYear(date).toISOString(),
        endDate: endOfYear(date).toISOString(),
      };
  }
}

// Utilidades de fecha
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function endOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}
