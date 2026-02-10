import { useQuery } from "@tanstack/react-query";
import {
  hereTrafficService,
  HereFlowGeoJSON,
} from "../services/hereTrafficService";

export interface MapBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/**
 * Hook para obtener datos de flujo de trafico HERE en tiempo real.
 * Fetches basado en el viewport actual del mapa.
 */
export function useHereTrafficFlow(
  bounds: MapBounds | null,
  enabled: boolean = true,
) {
  const bbox = bounds
    ? `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
    : "";

  return useQuery<HereFlowGeoJSON>({
    queryKey: ["here-traffic-flow", bbox],
    queryFn: () => hereTrafficService.getFlowData(bbox),
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 2 * 60 * 1000, // Refetch cada 2 minutos
    enabled: enabled && !!bbox,
    placeholderData: { type: "FeatureCollection", features: [] },
  });
}
