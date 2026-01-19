import React from "react";
import { MapLibreMap } from "./map/MapLibreMap";
import { Polygon, Incident, TrafficJam } from "../types";
import { MAP_CONFIG } from "../config/constants";

// ==========================================
// MAPA WRAPPER - TRANSICIÓN A WEBGL (MAPLIBRE)
// ==========================================
// Este componente actúa como adaptador para reemplazar el mapa Leaflet legacy
// por el nuevo mapa de alto rendimiento WebGL (MapLibre).

interface MapProps {
  polygons: Polygon[];
  incidents: Incident[];
  jams: TrafficJam[];
  onPolygonClick: (id: string) => void;
  selectedPolygon: string | null;
  selectedGroup: string | null;
  center?: [number, number];
}

export const Map: React.FC<MapProps> = (props) => {
  return (
    <div className="overflow-hidden h-[850px] bg-slate-900">
      <MapLibreMap
        polygons={props.polygons}
        jams={props.jams}
        // Pasamos jams como flujo también, el componente interno ya sabe filtrar
        trafficFlow={props.jams}
        incidents={props.incidents}
        onPolygonClick={props.onPolygonClick}
        selectedPolygon={props.selectedPolygon}
        selectedGroup={props.selectedGroup}
        className="w-full h-full"
      />
    </div>
  );
};

// Export por defecto para compatibilidad con lazy load
export default Map;
