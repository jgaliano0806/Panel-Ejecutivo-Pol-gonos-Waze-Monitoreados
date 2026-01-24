import React from "react";
import { MapLibreMap } from "./MapLibreMap";
import { Polygon, Incident, TrafficJam } from "../../types";
import { MAP_CONFIG } from "../../config/constants";

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
  selectedIncidentId?: string | null;
  forcedIncident?: any | null;
}

export const Map: React.FC<MapProps> = (props) => {
  return (
    <div className="overflow-hidden bg-slate-900 rounded-xl relative w-full h-full min-h-[400px] shadow-inner">
      <MapLibreMap
        polygons={props.polygons}
        jams={props.jams}
        // Pasamos jams como flujo también, el componente interno ya sabe filtrar
        trafficFlow={props.jams}
        incidents={props.incidents}
        onPolygonClick={props.onPolygonClick}
        selectedPolygon={props.selectedPolygon}
        selectedGroup={props.selectedGroup}
        selectedIncidentId={props.selectedIncidentId}
        forcedIncident={props.forcedIncident}
        className="w-full h-full"
      />
    </div>
  );
};

// Export por defecto para compatibilidad con lazy load
export default Map;
