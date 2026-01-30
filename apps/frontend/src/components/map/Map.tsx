import React from "react";
import { MapLibreMap } from "./MapLibreMap";
import { Polygon, Incident, TrafficJam } from "../../types";
import { MAP_CONFIG } from "../../config/constants";
import { GlobalNotifications } from "../notifications/GlobalNotifications";

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
  className?: string;
  // Props para filtros de polígonos en el sidebar del mapa
  allPolygons?: Polygon[];
  onPolygonChange?: (polygonId: string | null) => void;
  onGroupChange?: (group: string | null) => void;
  showWazeIncidents?: boolean;
}

export const Map: React.FC<MapProps> = (props) => {
  return (
    <div
      className={`overflow-hidden bg-slate-900 relative w-full h-full min-h-[400px] shadow-inner ${
        props.className || "rounded-xl"
      }`}
    >
      <MapLibreMap
        polygons={props.polygons}
        jams={props.jams}
        // trafficFlow no se pasa - MapLibreMap usa su lógica interna:
        // - flowGeoJSON: muestra jams con speed > 20 km/h (flujo normal)
        // - jamsGeoJSON: muestra jams con level >= 3 o speed <= 20 (congestión)
        incidents={props.incidents}
        onPolygonClick={props.onPolygonClick}
        selectedPolygon={props.selectedPolygon}
        selectedGroup={props.selectedGroup}
        selectedIncidentId={props.selectedIncidentId}
        forcedIncident={props.forcedIncident}
        className="w-full h-full"
        // Props para filtros de polígonos
        allPolygons={props.allPolygons}
        onPolygonChange={props.onPolygonChange}
        onGroupChange={props.onGroupChange}
        showWazeIncidents={props.showWazeIncidents}
      />
      {/* Notificaciones flotantes SOLO dentro del mapa */}
      <GlobalNotifications className="absolute bottom-4 right-4 w-auto max-w-sm z-50" />
    </div>
  );
};

// Export por defecto para compatibilidad con lazy load
export default Map;
