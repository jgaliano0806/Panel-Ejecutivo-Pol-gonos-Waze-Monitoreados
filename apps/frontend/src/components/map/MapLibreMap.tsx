import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  startTransition,
} from "react";
import Map, {
  Source,
  Layer,
  NavigationControl,
  MapRef,
  Popup,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { TrafficJam, Incident, Polygon, PolygonState } from "../../types";
import { MAP_FLAGS } from "../../config/mapFlags";
import {
  getWazePartnerHubIconUrl,
  getWazeIconSvg,
} from "../../utils/wazeIcons";
import {
  getIncidentDescription,
  getMainTypeTranslation,
} from "../../utils/wazeTranslations";
import { useThemeStore } from "../../stores/useThemeStore";
import {
  Clock,
  MapPin,
  AlertTriangle,
  X,
  ShieldCheck,
  Navigation,
} from "lucide-react";
import { MapSidebar } from "./MapSidebar";
import {
  useRACAccidentsMap,
  RACAccidentsFilter,
} from "../../hooks/useRACAccidents";
import { NETWORK_CONFIG } from "../../config/constants";

// Configuración inicial
const INITIAL_VIEW_STATE = {
  longitude: -64.1888, // Córdoba
  latitude: -31.4201,
  zoom: 12,
  pitch: 40,
  bearing: 0,
};

// Función para convertir grados a dirección cardinal
const getCardinalDirection = (degrees: number): string => {
  if (degrees === null || degrees === undefined) return "Desconocido";

  // Normalizar a 0-360
  const normalized = ((degrees % 360) + 360) % 360;

  // Definir rangos para 16 direcciones
  const directions = [
    { min: 348.75, max: 360, label: "Norte" },
    { min: 0, max: 11.25, label: "Norte" },
    { min: 11.25, max: 33.75, label: "Norte a Este" },
    { min: 33.75, max: 56.25, label: "Noreste" },
    { min: 56.25, max: 78.75, label: "Este a Norte" },
    { min: 78.75, max: 101.25, label: "Este" },
    { min: 101.25, max: 123.75, label: "Este a Sur" },
    { min: 123.75, max: 146.25, label: "Sureste" },
    { min: 146.25, max: 168.75, label: "Sur a Este" },
    { min: 168.75, max: 191.25, label: "Sur" },
    { min: 191.25, max: 213.75, label: "Sur a Oeste" },
    { min: 213.75, max: 236.25, label: "Suroeste" },
    { min: 236.25, max: 258.75, label: "Oeste a Sur" },
    { min: 258.75, max: 281.25, label: "Oeste" },
    { min: 281.25, max: 303.75, label: "Oeste a Norte" },
    { min: 303.75, max: 326.25, label: "Noroeste" },
    { min: 326.25, max: 348.75, label: "Norte a Oeste" },
  ];

  const direction = directions.find(
    (d) => normalized >= d.min && normalized < d.max
  );
  return direction ? direction.label : "Desconocido";
};

interface MapLibreMapProps {
  polygons: Polygon[];
  jams: TrafficJam[]; // Congestiones (Jams reales)
  trafficFlow?: TrafficJam[]; // TVT (Flujo general)
  incidents: Incident[];
  className?: string;
  onPolygonClick?: (id: string) => void;
  selectedPolygon?: string | null;
  selectedGroup?: string | null;
}

export const MapLibreMap: React.FC<MapLibreMapProps> = ({
  polygons,
  jams,
  trafficFlow = [],
  incidents,
  className,
  onPolygonClick,
  selectedPolygon,
  selectedGroup,
}) => {
  const mapRef = useRef<MapRef>(null);
  const isDark = useThemeStore((state) => state.isDark);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);

  // Estado para capas y sidebar
  const [showWazeIncidents, setShowWazeIncidents] = useState(true);
  const [showRACAccidents, setShowRACAccidents] = useState(false);
  const [showTraffic, setShowTraffic] = useState(true);
  const [racFilter, setRACFilter] = useState<RACAccidentsFilter>({
    viewMode: "active",
    dateFilter: { mode: "day", date: new Date() },
  });

  // Obtener datos de accidentes RAC
  const { data: racAccidents } = useRACAccidentsMap(
    racFilter,
    showRACAccidents
  );

  // Estado para controlar si el mapa está cargado
  const [mapLoaded, setMapLoaded] = useState(false);

  // Efecto para Zoom al polígono seleccionado
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || (!selectedPolygon && !selectedGroup))
      return;
    const map = mapRef.current.getMap();

    if (selectedPolygon) {
      const polygon = polygons.find((p) => p.id === selectedPolygon);
      if (polygon && polygon.geometry.coordinates[0].length > 0) {
        const coords = polygon.geometry.coordinates[0];
        // Calcular bounds manualmente
        let minLng = 180,
          maxLng = -180,
          minLat = 90,
          maxLat = -90;
        coords.forEach((coord: any) => {
          // Waze geoJSON a veces es [lng, lat], a veces {x,y}
          const lng = Array.isArray(coord) ? coord[0] : coord.x;
          const lat = Array.isArray(coord) ? coord[1] : coord.y;
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        });

        const bounds = new maplibregl.LngLatBounds(
          [minLng, minLat],
          [maxLng, maxLat]
        );

        map.fitBounds(bounds, { padding: 50, duration: 1000 });
      }
    }
  }, [selectedPolygon, selectedGroup, polygons, mapLoaded]);

  // Carga de iconos usando SVG inline (más confiable que cargar archivos)
  const loadWazeIcon = (map: maplibregl.Map, iconId: string) => {
    console.log(`🔍 loadWazeIcon called for: ${iconId}`);

    if (map.hasImage(iconId)) {
      console.log(`✅ Icon ${iconId} already loaded`);
      return;
    }

    const parts = iconId.replace("waze-", "").split("-");
    if (parts.length < 1) {
      console.warn(`❌ Invalid iconId format: ${iconId}`);
      return;
    }

    const type = parts[0];
    const subtype = parts.slice(1).join("_");

    console.log(`📊 Parsing icon - Type: ${type}, Subtype: ${subtype}`);

    // Obtener SVG del repositorio inline
    const svgString = getWazeIconSvg(type, subtype);

    console.log(`📝 SVG string length: ${svgString?.length || 0}`);

    if (!svgString) {
      console.warn(
        `❌ No SVG found for ${iconId} (type: ${type}, subtype: ${subtype})`
      );
      return;
    }

    // Crear imagen desde SVG inline
    const img = new Image(64, 64);
    img.width = 64;
    img.height = 64;

    img.onload = () => {
      console.log(`✅ Image loaded successfully for ${iconId}`);
      try {
        if (!map.hasImage(iconId)) {
          map.addImage(iconId, img, { sdf: false });
          console.log(`✅ Icon ${iconId} added to map`);
        }
      } catch (e) {
        console.error(`❌ Failed to add image ${iconId} to map`, e);
      }
    };

    img.onerror = (e) => {
      console.error(`❌ Failed to load SVG for ${iconId}`, e);
    };

    // Usar Data URI con el SVG inline
    const dataUri =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
    console.log(
      `🔗 Data URI (first 100 chars): ${dataUri.substring(0, 100)}...`
    );
    img.src = dataUri;
  };

  const onMapLoad = (e: any) => {
    const map = e.target;
    console.log(`🗺️ Map loaded, preloading common icons...`);

    // Pre-cargar iconos comunes para evitar parpadeos
    const commonIcons = [
      { id: "waze-accident", type: "accident" },
      { id: "waze-jam", type: "jam" },
      { id: "waze-hazard", type: "hazard" },
      { id: "waze-construction", type: "construction" },
      { id: "waze-roadclosed", type: "roadclosed" },
      { id: "waze-police", type: "police" },
      { id: "waze-weatherhazard", type: "weatherhazard" },
    ];

    commonIcons.forEach((icon) => {
      loadWazeIcon(map, icon.id);
    });

    // Listener para iconos faltantes (carga dinámica)
    map.on("styleimagemissing", (e: any) => {
      const id = e.id;
      console.log(`⚠️ styleimagemissing event for: ${id}`);
      if (id && id.startsWith("waze-")) {
        loadWazeIcon(map, id);
      }
    });

    console.log(`✅ Map event listeners configured`);
  };

  // GeoJSON Memos (Polygons, Flow, Jams, Incidents)
  const polygonsGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection",
      features: polygons.map((p) => ({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: p.geometry.coordinates },
        properties: {
          id: p.id,
          color:
            p.state === PolygonState.HIGH
              ? "#ef4444"
              : p.state === PolygonState.MEDIUM
              ? "#eab308"
              : "#22c55e",
        },
      })),
    }),
    [polygons]
  );

  const flowGeoJSON = useMemo(() => {
    const flowLines =
      trafficFlow.length > 0
        ? trafficFlow
        : jams.filter((j) => (j.speed || 0) > 20);
    return {
      type: "FeatureCollection",
      features: flowLines
        .filter((j) => j.line && j.line.length > 1)
        .map((jam) => ({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: jam.line!.map((p) => [p.x, p.y]),
          },
          properties: {
            id: jam.id,
            speed: jam.speed,
            color: getFlowColor(jam.speed || 0),
          },
        })),
    };
  }, [trafficFlow, jams]);

  const jamsGeoJSON = useMemo(() => {
    const congested = jams.filter(
      (j) => (j.level || 0) >= 3 || (j.speed || 0) <= 20
    );
    return {
      type: "FeatureCollection",
      features: congested
        .filter((j) => j.line && j.line.length > 1)
        .map((jam) => ({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: jam.line!.map((p) => [p.x, p.y]),
          },
          properties: {
            id: jam.id,
            level: jam.level || 0,
            color: getJamColor(jam.level || 0, jam.speed || 0),
          },
        })),
    };
  }, [jams]);

  const incidentsGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection",
      features: incidents.map((inc) => {
        const timeMs =
          inc.timestamp instanceof Date
            ? inc.timestamp.getTime()
            : new Date(inc.timestamp).getTime();
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [inc.location.lng, inc.location.lat],
          },
          properties: {
            id: inc.id,
            isNew: Date.now() - timeMs < 300000 ? 1 : 0,
            iconId: `waze-${inc.type.toLowerCase()}${
              inc.subtype ? "-" + inc.subtype.toLowerCase() : ""
            }`,
            // Datos para Popup
            description: inc.description || "Sin descripción",
            street: inc.street || "Ubicación desconocida",
            type: inc.type,
            subtype: inc.subtype || "",
            timestamp: inc.timestamp
              ? new Date(inc.timestamp).toISOString()
              : "",
            reportBy: inc.reportBy,
            nThumbsUp: inc.nThumbsUp || 0,
            confidence: inc.confidence || 0,
            magvar: inc.magvar,
          },
        };
      }),
    }),
    [incidents]
  );

  // GeoJSON para líneas de cierres de camino usando datos reales
  const roadClosureLinesGeoJSON = useMemo(() => {
    const closures = incidents.filter(
      (inc) =>
        inc.type.toLowerCase().includes("roadclosed") ||
        inc.type.toLowerCase().includes("road_closed")
    );

    const features = closures.flatMap((closure) => {
      // Opción 1: Buscar jams con blockingAlertUuid coincidente
      let associatedJams = jams.filter(
        (jam) => jam.blockingAlertUuid === closure.id
      );

      // Opción 2: Si no hay jams bloqueantes, buscar por calle y proximidad
      if (associatedJams.length === 0 && closure.street) {
        associatedJams = jams.filter((jam) => {
          if (!jam.line || jam.line.length < 2) return false;
          if (!jam.street || jam.street !== closure.street) return false;

          // Calcular distancia al primer punto del jam
          const jamStart = jam.line[0];
          const dx =
            (jamStart.x - closure.location.lng) *
            111320 *
            Math.cos((closure.location.lat * Math.PI) / 180);
          const dy = (jamStart.y - closure.location.lat) * 110540;
          const distance = Math.sqrt(dx * dx + dy * dy);

          return distance < 500; // 500 metros
        });
      }

      // Convertir jams asociados a features de línea roja
      return associatedJams
        .filter((jam) => jam.line && jam.line.length > 1)
        .map((jam) => ({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: jam.line!.map((p) => [p.x, p.y]),
          },
          properties: {
            closureId: closure.id,
            jamId: jam.id,
            type: "road_closure",
            color: "#dc2626", // Rojo intenso para cierres
            street: jam.street || closure.street,
            method: jam.blockingAlertUuid ? "blocking_uuid" : "proximity",
          },
        }));
    });

    return {
      type: "FeatureCollection",
      features,
    };
  }, [incidents, jams]);

  // Funciones de color para flujo de tráfico
  function getFlowColor(speed: number): string {
    // Verde: flujo libre (>= 60 km/h)
    if (speed >= 60) return "#22c55e";
    // Amarillo: flujo moderado (40-60 km/h)
    if (speed >= 40) return "#eab308";
    // Naranja: flujo lento (20-40 km/h)
    if (speed >= 20) return "#f97316";
    // Rojo: muy lento (< 20 km/h)
    return "#ef4444";
  }

  function getJamColor(level: number, speed: number): string {
    // Rojo oscuro para tráfico detenido
    if (speed < 5 || level >= 5) return "#7f1d1d";
    // Rojo para congestión severa
    if (level >= 4) return "#991b1b";
    // Rojo normal para congestión moderada
    if (level >= 3) return "#dc2626";
    // Naranja para congestión leve
    return "#f97316";
  }

  // Animación ciclo - solo cuando el mapa esté cargado
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    let animationFrameId: number;
    const animate = (time: number) => {
      const newOffset = (time / 100) % 2;
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        try {
          if (map.getLayer("flow-line-dashed")) {
            map.setPaintProperty(
              "flow-line-dashed",
              "line-dashoffset",
              newOffset
            );
          }
        } catch (e) {
          // Ignorar errores si la capa no está lista todavía
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [mapLoaded]);

  const handleClick = (event: any) => {
    const feature = event.features?.[0];
    if (!feature) return;

    // Click en Polígono
    if (feature.layer.id === "polygons-fill" && onPolygonClick) {
      onPolygonClick(feature.properties.id);
      setSelectedIncident(null); // Limpiar incidente seleccionado
      return;
    }

    // Click en Incidente
    if (
      feature.layer.id === "incidents-icon" ||
      feature.layer.id === "incidents-base"
    ) {
      const { geometry, properties } = feature;
      // geometry.coordinates is [lng, lat] for Point
      const [lng, lat] = geometry.coordinates;

      setSelectedIncident({
        lng,
        lat,
        properties,
      });

      // Centrar mapa suavemente
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
    }
  };

  // STYLE DINÁMICO
  const mapStyleUrl = isDark
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <MapSidebar
        onLayerToggle={(layer, enabled) => {
          if (layer === "rac") {
            setShowRACAccidents(enabled);
          } else if (layer === "waze") {
            setShowWazeIncidents(enabled);
          } else if (layer === "traffic") {
            setShowTraffic(enabled);
          }
        }}
        onViewModeChange={(mode) =>
          setRACFilter({ ...racFilter, viewMode: mode })
        }
        onFilterChange={(filter) =>
          setRACFilter({ ...racFilter, dateFilter: filter })
        }
        showRACAccidents={showRACAccidents}
        showWazeIncidents={showWazeIncidents}
        showTraffic={showTraffic}
        racViewMode={racFilter.viewMode}
        dateFilter={racFilter.dateFilter || { mode: "day", date: new Date() }}
        jams={jams}
      />

      {/* Mapa */}
      <div
        className={`flex-1 ${isDark ? "bg-[#222736]" : "bg-gray-100"} relative`}
      >
        <Map
          ref={mapRef}
          initialViewState={INITIAL_VIEW_STATE}
          style={{ width: "100%", height: "100%" }}
          mapStyle={mapStyleUrl}
          attributionControl={false}
          onClick={handleClick}
          onLoad={(e: any) => {
            startTransition(() => {
              setMapLoaded(true);
              onMapLoad(e);
            });
          }}
          interactiveLayerIds={[
            "polygons-fill",
            "incidents-icon",
            "incidents-base",
          ]}
        >
          <NavigationControl position="top-right" showCompass showZoom />

          {/* Polígonos */}
          <Source
            id="polygons-source"
            type="geojson"
            data={polygonsGeoJSON as any}
          >
            <Layer
              id="polygons-fill"
              type="fill"
              paint={{
                "fill-color": ["get", "color"],
                "fill-opacity": isDark ? 0.1 : 0.2, // Más opaco en claro
              }}
            />
            <Layer
              id="polygons-border"
              type="line"
              paint={{
                "line-color": ["get", "color"],
                "line-width": 1,
                "line-opacity": isDark ? 0.5 : 0.7,
              }}
            />
          </Source>

          {/* Flujo de Tráfico (TVT) */}
          {showTraffic && (
            <Source id="flow" type="geojson" data={flowGeoJSON as any}>
              <Layer
                id="flow-line"
                type="line"
                paint={{
                  "line-color": ["get", "color"],
                  "line-width": 5,
                  "line-opacity": 0.85,
                }}
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
              />
            </Source>
          )}

          {/* Jams - Solo visible cuando showTraffic está activo */}
          {showTraffic && (
            <Source id="jams-source" type="geojson" data={jamsGeoJSON as any}>
              <Layer
                id="jams-glow"
                type="line"
                layout={{ "line-join": "round", "line-cap": "round" }}
                paint={{
                  "line-color": ["get", "color"],
                  "line-width": [
                    "interpolate",
                    ["linear"],
                    ["get", "level"],
                    3,
                    8,
                    5,
                    16,
                  ],
                  "line-opacity": 0.4,
                  "line-blur": 4,
                }}
              />
              <Layer
                id="jams-core"
                type="line"
                layout={{ "line-join": "round", "line-cap": "round" }}
                paint={{
                  "line-color": ["get", "color"],
                  "line-width": [
                    "interpolate",
                    ["linear"],
                    ["get", "level"],
                    3,
                    3,
                    5,
                    6,
                  ],
                  "line-opacity": 1,
                }}
              />
            </Source>
          )}

          {/* Líneas de cierres de camino (usando datos reales de jams) */}
          {showWazeIncidents && (
            <Source
              id="road-closures"
              type="geojson"
              data={roadClosureLinesGeoJSON as any}
            >
              {/* Línea roja gruesa para el cierre */}
              <Layer
                id="road-closure-lines"
                type="line"
                paint={{
                  "line-color": ["get", "color"],
                  "line-width": 8,
                  "line-opacity": 0.85,
                  "line-dasharray": [2, 3], // Línea punteada: 2 pixels línea, 3 pixels espacio
                }}
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
              />
              {/* Línea blanca punteada encima para contraste */}
              <Layer
                id="road-closure-dashed"
                type="line"
                paint={{
                  "line-color": "#ffffff",
                  "line-width": 3,
                  "line-opacity": 0.7,
                  "line-dasharray": [3, 3],
                }}
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
              />
            </Source>
          )}

          {/* Incidentes Waze */}
          {showWazeIncidents && (
            <Source
              id="incidents"
              type="geojson"
              data={incidentsGeoJSON as any}
            >
              <Layer
                id="incidents-base"
                type="circle"
                paint={{
                  "circle-radius": 14,
                  "circle-color": isDark ? "#ffffff" : "#222222",
                  "circle-opacity": 0.9,
                  "circle-stroke-width": 2,
                  "circle-stroke-color": isDark ? "#222222" : "#ffffff",
                }}
              />
              <Layer
                id="incidents-pulse"
                type="circle"
                paint={{
                  "circle-radius": 25,
                  "circle-color": isDark ? "#ffffff" : "#000000",
                  "circle-opacity": [
                    "interpolate",
                    ["linear"],
                    ["get", "isNew"],
                    0,
                    0,
                    1,
                    0.3,
                  ],
                  "circle-blur": 0.8,
                }}
              />
              <Layer
                id="incidents-icon"
                type="symbol"
                layout={{
                  "icon-image": ["get", "iconId"],
                  "icon-size": 0.75,
                  "icon-allow-overlap": true,
                  "icon-ignore-placement": true,
                }}
                paint={{ "icon-opacity": 1 }}
              />
            </Source>
          )}

          {/* Popup de Incidente */}
          {selectedIncident && (
            <Popup
              longitude={selectedIncident.lng}
              latitude={selectedIncident.lat}
              anchor="bottom"
              onClose={() => setSelectedIncident(null)}
              closeButton={false}
              className="incident-popup"
              maxWidth="350px"
            >
              <div
                className={`rounded-xl shadow-2xl overflow-hidden min-w-[320px] ${
                  isDark
                    ? "bg-veltrix-card text-white"
                    : "bg-white text-gray-800"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between p-4 border-b border-gray-100 dark:border-veltrix-border bg-gray-50/50 dark:bg-zinc-900/50">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <img
                        src={getWazePartnerHubIconUrl(
                          selectedIncident.properties.type,
                          selectedIncident.properties.subtype
                        )}
                        className="w-10 h-10 object-contain drop-shadow-md"
                        alt="icon"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none mb-1">
                        {selectedIncident.properties.street || "Ubicación"}
                      </p>
                      <h3 className="font-bold text-lg leading-tight">
                        {getIncidentDescription(
                          selectedIncident.properties.type,
                          selectedIncident.properties.subtype
                        )}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-500"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-4 space-y-4 text-sm">
                  {/* Tabla de Informacion */}
                  <div className="grid grid-cols-[110px_1fr] gap-y-3 gap-x-2">
                    <span className="font-medium text-gray-500 dark:text-gray-400">
                      Tipo
                    </span>
                    <span className="font-medium">
                      {getMainTypeTranslation(selectedIncident.properties.type)}
                    </span>

                    <span className="font-medium text-gray-500 dark:text-gray-400">
                      Fecha de inicio
                    </span>
                    <span>
                      {selectedIncident.properties.timestamp
                        ? new Date(
                            selectedIncident.properties.timestamp
                          ).toLocaleString()
                        : "Desconocida"}
                    </span>

                    <span className="font-medium text-gray-500 dark:text-gray-400">
                      Fecha fin
                    </span>
                    <span className="text-gray-400 italic">N/A</span>

                    {selectedIncident.properties.description &&
                      selectedIncident.properties.description !==
                        "Sin descripción" && (
                        <>
                          <span className="font-medium text-gray-500 dark:text-gray-400">
                            Descripción
                          </span>
                          <span className="leading-snug">
                            {selectedIncident.properties.description}
                          </span>
                        </>
                      )}

                    <span className="font-medium text-gray-500 dark:text-gray-400">
                      Informante
                    </span>
                    <span className="font-mono text-xs bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded w-fit text-blue-600 dark:text-blue-400">
                      {selectedIncident.properties.reportBy || "Wazer"}
                    </span>

                    {selectedIncident.properties.magvar !== undefined &&
                      selectedIncident.properties.magvar !== null && (
                        <>
                          <span className="font-medium text-gray-500 dark:text-gray-400">
                            Sentido
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Navigation
                              size={14}
                              className="text-blue-500"
                              style={{
                                transform: `rotate(${selectedIncident.properties.magvar}deg)`,
                              }}
                            />
                            <span>
                              {getCardinalDirection(
                                selectedIncident.properties.magvar
                              )}
                            </span>
                          </div>
                        </>
                      )}

                    <span className="font-medium text-gray-500 dark:text-gray-400">
                      ID
                    </span>
                    <span className="text-[10px] uppercase font-mono text-gray-400 break-all leading-tight">
                      {selectedIncident.properties.id}
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-4 py-3 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-veltrix-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                      <span className="w-3.5 h-3.5 flex items-center justify-center">
                        💬
                      </span>
                      0 comentarios
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-veltrix-bg rounded-full shadow-sm border border-gray-100 dark:border-veltrix-border">
                    <ShieldCheck
                      size={12}
                      className={
                        selectedIncident.properties.confidence >= 7
                          ? "text-green-500"
                          : selectedIncident.properties.confidence >= 4
                          ? "text-yellow-500"
                          : "text-gray-400"
                      }
                    />
                    <span className="font-medium">
                      Confianza: {selectedIncident.properties.confidence || 0}
                      /10
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          )}
        </Map>
      </div>
    </div>
  );
};
